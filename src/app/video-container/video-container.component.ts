import { Component, Input ,OnInit,ElementRef, ViewChild} from '@angular/core';
import { ActivatedRoute , Router } from '@angular/router';
import { VideoService } from '../video.service';
import { ApiService } from '../api.service';
import { tap, catchError, throwError ,combineLatest } from 'rxjs';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-video-container',
  templateUrl: './video-container.component.html',
  styleUrls: ['./video-container.component.css']
})
export class VideoContainerComponent implements OnInit {

  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;


  roomId: string = '';
  userId: string = '';
  userName: string = '';
  data:any;
  errorMessage:any;
  roles:any;

  callDuration: string = '00:00';
  private durationTimer: any;

  private streamUpdateHandler: any;
  private activeStreamId: string | null = null;

  deviceInfo = {
    cameras: [] as MediaDeviceInfo[],
    microphones: [] as MediaDeviceInfo[],
    speakers: [] as MediaDeviceInfo[],
    currentCamera: '',
    currentMicrophone: '',
    currentSpeaker: ''
  }

  isSidebarCollapsed = false;
  touchStartY:any

  constructor(private route: ActivatedRoute,
              private router: Router ,
              private zegoService: VideoService,
              private apiService: ApiService) {}

  ngOnInit() {
    combineLatest([
      this.route.params,
      this.route.queryParams
    ]).pipe(
      tap(([params, queryParams]) => {
        this.roomId = params['roomId'];
        this.userId = queryParams['userId'];
        this.userName = queryParams['userName'];
        this.roles = queryParams['roles'];
    
        
        if (this.roomId && this.userId && this.userName && this.roles) {
          this.getToken(this.userId, this.userName, this.roomId);
        }
      })
    ).subscribe();
    this.startDurationTimer();
  }

  private startDurationTimer() {
    let seconds = 0;
    this.durationTimer = setInterval(() => {
      seconds++;
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      this.callDuration = 
        `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }, 1000);
  }


  ngOnDestroy() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
    }
  }

  


  async startcall(token: any) {
    if (token) {
      try {
        // 启动本地流
        const localStream = await this.zegoService.startCall(this.roomId, this.userId, token);
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = localStream;
          console.log('Local stream set up successfully');
        }

        // 监听远程流更新
        this.zegoService.zegoEngine.on('roomStreamUpdate', 
          async (roomID: string, updateType: string, streamList: any[]) => {
            console.log('Stream update:', { roomID, updateType, streamCount: streamList.length });

            if (updateType === 'ADD') {
              for (const stream of streamList) {
                try {
                  console.log('Adding remote stream:', stream.streamID);
                  const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
                  
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = remoteStream;
                    // 确保视频元素开始播放
                    this.remoteVideo.nativeElement.play().catch(error => {
                      console.error('Error playing remote video:', error);
                    });
                  }

                  // 保存当前活动的流ID
                  this.activeStreamId = stream.streamID;
                  
                } catch (err) {
                  console.error('Error setting up remote stream:', err);
                }
              }
            } else if (updateType === 'DELETE') {
              for (const stream of streamList) {
                console.log('Removing remote stream:', stream.streamID);
                if (stream.streamID === this.activeStreamId) {
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = null;
                  }
                  this.activeStreamId = null;
                }
                this.zegoService.zegoEngine.stopPlayingStream(stream.streamID);
              }
            }
        });

        // 监听房间状态
        this.zegoService.zegoEngine.on('roomStateUpdate', 
          (roomID: string, state: string, errorCode: number, extendedData: string) => {
            console.warn('Room state update:', { roomID, state, errorCode, extendedData });
        });

        // 监听发布状态
        this.zegoService.zegoEngine.on('publisherStateUpdate', 
          (streamID: string, state: string, errorCode: number, extendedData: string) => {
            console.warn('Publisher state update:', { streamID, state, errorCode, extendedData });
        });

        // 监听播放状态
        this.zegoService.zegoEngine.on('playerStateUpdate', 
          (streamID: string, state: string, errorCode: number, extendedData: string) => {
            console.warn('Player state update:', { streamID, state, errorCode, extendedData });
        });

      } catch (error) {
        console.error('Error in startcall:', error);
      }
    } else {
      console.error('No token provided');
    }
  }

  async leaveRoom() {
    const result = await Swal.fire({
      title: 'Leave Room',
      text: 'Are you sure you want to leave this room?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, leave room',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        if (this.activeStreamId) {
          this.zegoService.zegoEngine.stopPlayingStream(this.activeStreamId);
          this.activeStreamId = null;
        }
        await this.zegoService.endCall(this.roomId);
        if(this.roles === 'user'){
           window.close();
        }else{
          this.router.navigate(['/video-call']);
        }
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    }
  }
  
  async getToken(userid:any, username:any ,roomID:any) :Promise<any>{
    const  requestData = { userID: userid, userName:username , roomID:roomID};  // Example parameters to send in POST request

    this.apiService.postData(requestData).pipe(
      tap(async (response) => {
        this.data = response;

        if(this.data.token){
          await this.startcall(this.data.token);
        }
      }),
      catchError((error) => {
        this.errorMessage = 'An error occurred: ' + error.message;
        return throwError(() => error);
      })
    ).subscribe();
  }
  

}