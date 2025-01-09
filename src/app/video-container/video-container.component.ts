import { Component, Input ,OnInit,ElementRef, ViewChild} from '@angular/core';
import { ActivatedRoute , Router } from '@angular/router';
import { VideoService } from '../video.service';
import { ApiService } from '../api.service';
import { tap, catchError, throwError ,combineLatest ,Subject } from 'rxjs';
import Swal from 'sweetalert2';
import { takeUntil } from 'rxjs/operators';  // Import takeUntil to handle cleanup

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
  
  localStream :any
  remoteStream :any


  private destroy$ = new Subject<void>();  // Subject to emit destruction signal
  

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
        }else{
             alert("missing params to start call")
        }
      })
    ).subscribe();
    this.startDurationTimer();


      // // Listen for incoming streams (from user) to subscribe to
      // this.zegoService.zegoEngine.on('roomStreamUpdate', async (roomID: string, updateType: string, streamList: any[]) => {
      //   if (updateType === 'ADD') {
      //     for (const stream of streamList) {
      //       if (stream.userID !== this.userId) {  // Only subscribe to the user’s stream (not the admin's)
      //         this.remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
      //         if (this.remoteVideo?.nativeElement) {
      //           this.remoteVideo.nativeElement.srcObject = this.remoteStream;
      //           console.log('Admin: Subscribed to user stream');
      //         }
      //       }
      //     }
      //   }
      // });
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
    this.destroy$.next();  // Emit destruction signal
    this.destroy$.complete();  // Complete the Subject to clean up
  }

  


  async startcall(token: any) {
    if (!token) {
      console.error('No token provided');
      return;
    }

    try {
      console.log(`${this.roles} starting call in room:`, this.roomId);

      if (this.roles) {
        this.localStream = await this.zegoService.startCall(this.roomId, this.userId, token, this.roles);
        
        // Show the admin's local stream in the local video element
        if (this.localVideo?.nativeElement) {
          this.localVideo.nativeElement.srcObject = this.localStream;
          console.log('Admin: Local preview set up');
        }

        // Efficiently subscribe to roomStreamUpdate with rxjs
        this.zegoService.streamUpdate$
          .pipe(
            takeUntil(this.destroy$)  // Automatically unsubscribe on component destroy
          )
          .subscribe(async ({ roomID, updateType, streamList }) => {
            if (updateType === 'ADD') {
              for (const stream of streamList) {
                if (stream.userID !== this.userId) {
                  const remoteStream = await this.zegoService.startPlayingStream(stream.streamID);
                  if (this.remoteVideo?.nativeElement) {
                    this.remoteVideo.nativeElement.srcObject = remoteStream;
                  }
                }
              }
            }
          });
        
      
      }
  

    } catch (error) {
      alert("error starting call " + error)
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

        if (this.localStream) {
          await this.zegoService.zegoEngine.stopPublishingStream();
          await this.zegoService.zegoEngine.destroyStream(this.localStream);
          this.localStream = null;
        }
        if (this.remoteStream) {
          await this.zegoService.zegoEngine.stopPlayingStream(this.remoteStream);
          this.remoteStream = null;
        }
     
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