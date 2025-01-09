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
    if (!token) {
      console.error('No token provided');
      return;
    }

    try {
      console.log(`${this.roles} starting call in room:`, this.roomId);

      if (this.roles) {
        // 管理员：使用 startCall
        const localStream = await this.zegoService.startCall(this.roomId, this.userId, token);
        
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = localStream;
          this.localVideo.nativeElement.autoplay = true;
          this.localVideo.nativeElement.playsInline = true;
          console.log('Admin: Local preview set up');
        }
      } 

      // 监听流更新
      this.zegoService.zegoEngine.on('roomStreamUpdate', 
        async (roomID: string, updateType: string, streamList: any[]) => {
          if (updateType === 'ADD') {
            for (const stream of streamList) {
              const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
              
              if (this.remoteVideo?.nativeElement) {
                this.remoteVideo.nativeElement.srcObject = remoteStream;
                this.remoteVideo.nativeElement.autoplay = true;
                this.remoteVideo.nativeElement.playsInline = true;
              }
            }
          }
      });

    } catch (error) {
      console.error('Call setup error:', error);
    }
  }

  

  async leaveRoom() {
    try {
      if (this.roles === 'admin') {
        await this.zegoService.zegoEngine.stopPublishingStream();
        if (this.localVideo?.nativeElement) {
     
          this.localVideo.nativeElement.srcObject = null;
        }
      }

      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = null;
      }

      await this.zegoService.zegoEngine.logoutRoom(this.roomId);
      console.log('Left room:', this.roomId);

      if (this.roles === 'admin') {
        this.router.navigate(['/video-call']);
      } else {
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