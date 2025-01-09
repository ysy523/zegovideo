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
        console.log('Starting call with role:', this.roles);

        if (this.roles === 'admin') {
          try {
            // 使用现有的 startCall 方法
            const localStream = await this.zegoService.startCall(this.roomId, this.userId, token);
            
            if (this.localVideo?.nativeElement) {
              this.localVideo.nativeElement.srcObject = localStream;
              console.log('Admin: Local preview set up');
            }
          } catch (publishError) {
            console.error('Admin: Error in publishing:', publishError);
          }
        } else {
          // 用户只需要登录房间
          await this.zegoService.startCall(this.roomId, this.userId, token);
          console.log('User: Successfully joined room');
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
                  console.log(`${this.roles}: New stream available:`, stream.streamID);
                  
                  // 使用现有的 startPlayingStream 方法
                  const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);

                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = remoteStream;
                    this.remoteVideo.nativeElement.autoplay = true;
                    this.remoteVideo.nativeElement.playsInline = true;
                    
                    try {
                      await this.remoteVideo.nativeElement.play();
                      console.log(`${this.roles}: Remote video playing`);
                    } catch (playError) {
                      console.error(`${this.roles}: Playback error:`, playError);
                      this.handleAutoPlayError();
                    }
                  }

                  this.activeStreamId = stream.streamID;
                  
                } catch (err) {
                  console.error(`${this.roles}: Stream setup error:`, err);
                }
              }
            } else if (updateType === 'DELETE') {
              for (const stream of streamList) {
                if (stream.streamID === this.activeStreamId) {
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = null;
                  }
                  this.activeStreamId = null;
                }
              }
            }
        });

      } catch (error) {
        console.error(`${this.roles}: Call setup error:`, error);
      }
    } else {
      console.error('No token provided');
    }
  }

  // 处理自动播放错误
  private handleAutoPlayError() {
    if (this.remoteVideo?.nativeElement) {
      const videoElement = this.remoteVideo.nativeElement;
      document.addEventListener('click', async () => {
        try {
          await videoElement.play();
          console.log('Video playback recovered after user interaction');
        } catch (error) {
          console.error('Still cannot play video:', error);
        }
      }, { once: true });
    }
  }

  // 离开房间
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
        // 使用现有的 endCall 方法
        await this.zegoService.endCall(this.roomId);
        
        if (this.roles === 'user') {
          window.close();
        } else {
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