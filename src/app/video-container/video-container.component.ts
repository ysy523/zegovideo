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

  


  async startcall(token:any){
      if (token){
    const localStream = await this.zegoService.startCall(this.roomId, this.userId ,token);
    this.localVideo.nativeElement.srcObject = localStream;
    console.log('Local stream set up successfully');

    const currentDevices = await this.zegoService.getZegoDeviceInfo();
 
    this.deviceInfo.currentMicrophone = currentDevices || 'No microphone';
  

     // Handle remote stream updates
     this.streamUpdateHandler = await this.zegoService.zegoEngine.on('roomStreamUpdate', 
      async (roomID: string, updateType: string, streamList: any[]) => {
        console.error('Stream update:', { roomID, updateType, streamCount: streamList.length });
        
        if (updateType === 'ADD' && streamList.length > 0) {
           const streamID = streamList[0].streamID;
            // Check if we're already playing this stream
            if (this.activeStreamId !== streamID) {
              // If there's an existing stream, stop it first
              if (this.activeStreamId) {
                await this.zegoService.zegoEngine.stopPlayingStream(this.activeStreamId);
              }

          const remoteStream = await this.zegoService.zegoEngine.startPlayingStream(streamID);
          this.remoteVideo.nativeElement.srcObject = remoteStream;

          this.activeStreamId = streamID;
          console.log('Remote stream added successfully');

        }
        }else if (updateType === 'DELETE' && this.activeStreamId) {
            await this.zegoService.zegoEngine.stopPlayingStream(this.activeStreamId);
            this.activeStreamId = null;
            this.remoteVideo.nativeElement.srcObject = null;
          }
      });
    } else{
      alert('No token found');
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