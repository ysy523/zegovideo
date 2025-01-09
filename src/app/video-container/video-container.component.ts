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
        let localStream;
        
        // 根据角色区分处理逻辑
        if (this.roles === 'admin') {
          // 管理员：发布流
          console.log('Admin: Starting to publish stream');
          localStream = await this.zegoService.startCall(this.roomId, this.userId, token);
          
          if (this.localVideo?.nativeElement) {
            this.localVideo.nativeElement.srcObject = localStream;
            console.log('Admin: Local stream setup successful');
          }
        } else {
          // 用户：只接收流
          console.log('User: Waiting for admin stream');
          // 用户不需要发布流，只需要准备接收
          await this.zegoService.zegoEngine.loginRoom(this.roomId, token);
        }

        // 监听远程流更新
        this.zegoService.zegoEngine.on('roomStreamUpdate', 
          async (roomID: string, updateType: string, streamList: any[]) => {
            console.log('Stream update:', { 
              role: this.roles,
              roomID, 
              updateType, 
              streams: streamList 
            });

            if (updateType === 'ADD') {
              for (const stream of streamList) {
                try {
                  console.log(`${this.roles}: Processing new stream:`, stream.streamID);
                  
                  // 根据角色处理流
                  if (this.roles === 'user') {
                    // 用户：显示管理员的流在主视频区域
                    const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
                    
                    if (this.remoteVideo?.nativeElement) {
                      this.remoteVideo.nativeElement.srcObject = remoteStream;
                      this.remoteVideo.nativeElement.autoplay = true;
                      this.remoteVideo.nativeElement.playsInline = true;
                      
                      try {
                        await this.remoteVideo.nativeElement.play();
                        console.log('User: Remote video playback started');
                      } catch (playError) {
                        console.error('User: Error playing remote video:', playError);
                       
                      }
                    }
                  } else if (this.roles === 'admin') {
                    // 管理员：显示用户的流在远程视频区域
                    const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
                    
                    if (this.remoteVideo?.nativeElement) {
                      this.remoteVideo.nativeElement.srcObject = remoteStream;
                      this.remoteVideo.nativeElement.autoplay = true;
                      this.remoteVideo.nativeElement.playsInline = true;
                      
                      try {
                        await this.remoteVideo.nativeElement.play();
                        console.log('Admin: Remote video playback started');
                      } catch (playError) {
                        console.error('Admin: Error playing remote video:', playError);
                       
                      }
                    }
                  }

                  this.activeStreamId = stream.streamID;
                  
                } catch (err) {
                  console.error(`${this.roles}: Error in stream setup:`, err);
                 
                }
              }
            } else if (updateType === 'DELETE') {
              for (const stream of streamList) {
                console.log(`${this.roles}: Removing stream:`, stream.streamID);
                if (stream.streamID === this.activeStreamId) {
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = null;
                  }
                  this.activeStreamId = null;
                }
                await this.zegoService.zegoEngine.stopPlayingStream(stream.streamID);
              }
            }
        });

        // 监听发布状态
        this.zegoService.zegoEngine.on('publisherStateUpdate', 
          (streamID: string, state: string, errorCode: number, extendedData: string) => {
            console.log(`${this.roles} Publisher state:`, { streamID, state, errorCode });
            if (state === 'PUBLISHING' && errorCode === 0) {
              console.log(`${this.roles}: Stream publishing successfully`);
            } else if (errorCode !== 0) {
              console.error(`${this.roles}: Publishing error:`, errorCode);
            
            }
        });

      } catch (error) {
        console.error(`${this.roles}: Error in startcall:`, error);
      }
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