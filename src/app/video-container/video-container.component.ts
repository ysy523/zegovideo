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
        console.log('Starting call with role:', this.roles, 'userId:', this.userId, 'roomId:', this.roomId);

        if (this.roles === 'admin') {
          try {
            // 管理员：使用 startCall 启动并发布流
            const localStream = await this.zegoService.startCall(this.roomId, this.userId, token);
            
            if (this.localVideo?.nativeElement) {
              this.localVideo.nativeElement.srcObject = localStream;
              this.localVideo.nativeElement.autoplay = true;
              this.localVideo.nativeElement.playsInline = true;
              console.log('Admin: Local preview set up');
            }
          } catch (publishError) {
            console.error('Admin: Error in publishing:', publishError);
          }
        } else {
          // 用户：登录房间并准备接收流
          try {
            console.log('User attempting to join room with token:', token);
            
            // 确保正确登录房间
            await this.zegoService.zegoEngine.loginRoom(this.roomId, token, {
              userID: this.userId,
              userName: this.userId
            }, { userUpdate: true });  // 添加 userUpdate 参数
            
            console.log('User: Successfully joined room');
          } catch (loginError) {
            console.error('User: Failed to join room:', loginError);
            throw loginError;
          }
        }

        // 监听远程流更新
        this.zegoService.zegoEngine.on('roomStreamUpdate', 
          async (roomID: string, updateType: string, streamList: any[]) => {
            console.log('Stream update event received:', { 
              role: this.roles, 
              roomID, 
              updateType, 
              streamCount: streamList.length,
              streams: streamList.map(s => s.streamID)
            });

            if (updateType === 'ADD') {
              for (const stream of streamList) {
                try {
                  console.log(`${this.roles}: Attempting to play stream:`, stream.streamID);
                  
                  // 开始播放远程流
                  const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
                  console.log(`${this.roles}: Successfully got remote stream`);

                  if (this.remoteVideo?.nativeElement) {
                    console.log(`${this.roles}: Setting up remote video element`);
                    this.remoteVideo.nativeElement.srcObject = remoteStream;
                    this.remoteVideo.nativeElement.autoplay = true;
                    this.remoteVideo.nativeElement.playsInline = true;
                    
                    try {
                      await this.remoteVideo.nativeElement.play();
                      console.log(`${this.roles}: Remote video playing successfully`);
                    } catch (playError) {
                      console.error(`${this.roles}: Playback error:`, playError);
                      this.handleAutoPlayError();
                    }
                  } else {
                    console.error(`${this.roles}: Remote video element not found`);
                  }

                  this.activeStreamId = stream.streamID;
                  
                } catch (err) {
                  console.error(`${this.roles}: Stream setup error:`, err);
                }
              }
            } else if (updateType === 'DELETE') {
              for (const stream of streamList) {
                console.log(`${this.roles}: Stream being removed:`, stream.streamID);
                if (stream.streamID === this.activeStreamId) {
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = null;
                  }
                  this.activeStreamId = null;
                  console.log(`${this.roles}: Stream removed successfully`);
                }
              }
            }
        });

        // 监听房间状态
        this.zegoService.zegoEngine.on('roomStateUpdate', 
          (roomID: string, state: string, errorCode: number, extendedData: string) => {
            console.log('Room state update:', {
              role: this.roles,
              roomID,
              state,
              errorCode,
              extendedData
            });
            
            if (errorCode !== 0) {
              console.error(`${this.roles}: Room state error:`, errorCode);
            }
        });

        // 监听用户状态
        this.zegoService.zegoEngine.on('roomUserUpdate',
          (roomID: string, updateType: string, userList: any[]) => {
            console.log('Room user update:', {
              role: this.roles,
              roomID,
              updateType,
              userCount: userList.length,
              users: userList
            });
        });

      } catch (error) {
        console.error(`${this.roles}: Call setup error:`, error);
        throw error;
      }
    } else {
      console.error('No token provided');
      throw new Error('Token is required');
    }
  }

  // 处理自动播放错误
  private handleAutoPlayError() {
    if (this.remoteVideo?.nativeElement) {
      const videoElement = this.remoteVideo.nativeElement;
      console.log('Setting up autoplay error handler');
      
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
    try {
      if (this.roles === 'admin') {
        // 管理员使用 endCall
        await this.zegoService.endCall(this.roomId);
        this.router.navigate(['/video-call']);
      } else {
        // 用户只需要登出房间
        await this.zegoService.zegoEngine.logoutRoom(this.roomId);
        window.close();
      }
    } catch (error) {
      console.error('Error leaving room:', error);
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