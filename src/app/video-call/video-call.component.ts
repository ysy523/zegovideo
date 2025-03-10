import { Component, OnInit ,AfterViewInit,ElementRef, ViewChild  } from '@angular/core';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { HeaderComponent } from '../header/header.component';
import { VideoContainerComponent } from '../video-container/video-container.component';
import { ApiService } from '../services/api.service'; // Import the ApiService
import { Router } from '@angular/router';
import Swal from 'sweetalert2';

import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-video-call',
  templateUrl: './video-call.component.html',
  styleUrls: ['./video-call.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HeaderComponent
  ]
})
export class VideoCallComponent implements OnInit {

  data: any ='';  // Variable to store fetched data
  errorMessage: string = '';  // For error handling

  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  constructor(private apiService: ApiService,private router: Router) {}

   appID: number = 800739391;
   server: string = 'dd3303415db6855bc2398ae440609ce0'
   isAdmin: boolean = true; // Replace with actual logic to determine admin status
   activeRoomID:string =''// Track the currently active room
   users = [
    { userID: 'userone', userName: 'UserAli' },
    { userID: 'usertwo', userName: 'UserAmat' },
    { userID: 'userthree', userName: 'UserAbu' },
    { userID: 'userfour', userName: 'UserAdmin' },
    { userID: 'user5', userName: 'User Five' },
    { userID: 'user6', userName: 'User Six' },
    { userID: 'user7', userName: 'User Seven' },
  ]; // Dummy user list

  selectedUser: any;
  selectedUsername:any;
  inviteLink: string ='';

  adminID :any= 'admin1' 
  streamID:any= 'stream_' + this.adminID

  zego = new ZegoExpressEngine(this.appID, this.server);

  token: string = ''

  private localStream: any
  private remoteStream: any

  

  // Replace with your ZEGOCLOUD AppID and ServerSecret
  // User and room details
  userName: string = '';
  roomID: string = '';
  userID :string = ''

  isModalOpen = false;

  inviteUrl = '';

  isLoading: boolean = false; // Add a loading state

  searchTerm: string = '';
  currentPage: number = 1;
  itemsPerPage: number = 6;
  filteredUsers: any[] = [];
  displayedUsers: any[] = [];

  ngOnInit(): void {
    this.filteredUsers = [...this.users];
    this.updateDisplayedUsers();

    this.getuserdetais();
  }

  get totalPages(): number {
    return Math.ceil(this.filteredUsers.length / this.itemsPerPage);
  }



getuserdetais(){
     this.isLoading = true; // Show loading indicator
    this.apiService.getUsers().subscribe((response:any)=>{

      if(response){
        console.log("user details ===>",response.results)
        this.isLoading = false;
      }

    
    })

}



  onSearch(): void {
    this.currentPage = 1;
    if (this.searchTerm.trim() === '') {
      this.filteredUsers = [...this.users];
    } else {
      this.filteredUsers = this.users.filter(user => 
        user.userName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        user.userID.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
    this.updateDisplayedUsers();
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateDisplayedUsers();
    }
  }

  refreshUsers(): void {
    this.getuserdetais(); // Re-fetch the data
  }

  private updateDisplayedUsers(): void {
    
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
     // Hide loading indicator
    this.displayedUsers = this.filteredUsers.slice(start, end);
    
  }

  async getToken(userid:any, username:any ,roomID:any) :Promise<any>{
    const  requestData = { userID: userid, userName:username , roomID:roomID};  // Example parameters to send in POST request

    this.apiService.postData(requestData).subscribe(
      async(response) => {
        this.data = response;  // Handle the response and store it in 'data'
        
         await this.joinRoom()
         await this.checkRoom();
        console.log ("data=====>",this.data)
        
      },
      (error) => {
        this.errorMessage = 'An error occurred: ' + error.message;  // Handle errors

      }
    );
  }


  async openModal(user_id:any , user_name:any) {
    // this.isModalOpen = true;
     // Generate a unique room ID for each call
     this.roomID = `room_${user_id}`;

     this.selectedUsername = user_name
     // this.activeRoomID = this.roomID; // Track the active room
    this.inviteUrl = `${window.location.origin}/join/${this.roomID}?userId=${user_id}&userName=${user_name}&roles=user`;


    const result = await Swal.fire({
      title: 'Room Created ',
      html: `
        <div class="invite-link-container">
          <p>Share this link to invite ${this.selectedUsername}:</p>
          <div class="link-box">
            <input id="inviteLink" value="${this.inviteUrl}" readonly
            style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid black; background: rgba(255,255,255,0.1); color: black;">
        
            <button id="copyBtn" class="swal2-confirm swal2-styled"
            style="margin: 0; padding: 7px 5px; white-space: nowrap;">Copy Link</button>
          </div>
        </div>
      `,
      showCancelButton: false,
      confirmButtonText: `Start call with ${this.selectedUsername}`,
      cancelButtonText: 'Close',
      confirmButtonColor: '#4CAF50',
      cancelButtonColor: '#6c757d',
      showCloseButton: true,
      didOpen: () => {
    
        // Query for the copy button
        const copyBtn = Swal.getPopup()?.querySelector('#copyBtn') as HTMLButtonElement;
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(this.inviteUrl);  // Copy the invite URL to clipboard
              Swal.showValidationMessage('Link copied successfully!');
              setTimeout(() => Swal.resetValidationMessage(), 1500);  // Reset message after 1.5 seconds
            } catch (err) {
              Swal.showValidationMessage('Failed to copy link');
            }
          });
        }
      },
      footer: ''
    });
    

    if (result.isConfirmed) {
      this.createRoom(this.selectedUsername);
    }

  }


 async closeModal() {
  this.isModalOpen = false;


  }


  copyLink(inputElement: HTMLInputElement) {
    inputElement.select();
    document.execCommand('copy');
    // 可选：显示复制成功提示
    alert('Link copied to clipboard!');
  }


  async leaveRoom(roomID :any) {
    try {
      if (this.localStream) {
        await this.zego.stopPublishingStream(roomID);
        await this.zego.destroyStream(this.localStream);
        this.localStream = null;
        const localVideoElement = document.getElementById('local-video') as HTMLVideoElement;
        localVideoElement.srcObject = null;
      }
      if (this.remoteStream) {
        await this.zego.stopPlayingStream(this.remoteStream);
        this.remoteStream = null;
      }
      await this.zego.logoutRoom(roomID);
    } catch (error) {
      console.error('Error in endCall:', error);
      throw error;
    }
  }
  



  async startLocalStream(adminID:any) {

   await this.zego.createStream({camera:{
        video:true,
        audio:true,
    },})
      .then((stream:any) => {
        this.localStream = stream;
        const localVideoElement = document.getElementById('local-video') as HTMLVideoElement;
        localVideoElement.srcObject = stream;

        this.zego.startPublishingStream(this.streamID, stream);
      })
      .catch((error:any) => {
        console.error('Failed to create stream:', error);
      });
  }



 async createRoom(user: any): Promise<void> {
    if (!user) {
      alert('Please select a user first.');
      return;
    }
    this.selectedUser = user;
    //  console.log('Selected user:', this.selectedUser);

    //  await this.getToken (this.adminID, this.adminID ,this.roomID);

    //   this.closeModal();

    this.isModalOpen = false; // Close the modal
      await this.router.navigate(['/video-room', this.roomID], {
        queryParams: {
          userId: this.adminID,
          userName: this.adminID,
          roles: 'admin'
        }
      });
   
      
   }
   
  



  async joinRoom():Promise<void>{


    console.log ("data roomid ===>", this.data.roomid)
      
      this.zego.loginRoom(this.data.roomid, this.data.token , {userID: this.adminID, userName: this.adminID},{userUpdate:true}).then(async(result:any)=>{
                
        if (result){
             this.inviteLink = `${window.location.origin}/join?roomID=${this.data.roomid}&userID=${this.adminID}`;
             await this.startLocalStream(this.adminID);
             await this.startRemote();
        }
        else{
          alert('=====Failed to join room====' + result); 
        }
          })
         
     
  }


  async startRemote(){

    try{

    console.log ("start remote =====================>")
     await this.zego.on('roomStreamUpdate', async(roomID:any, updateType:any, streamList:any) => {
       console.log(`updater: ${updateType}`,streamList);
       
       if (updateType === 'ADD' && streamList.length > 0) {
        const remoteStream = await this.zego.startPlayingStream(streamList[0].streamID);
       
        // const remoteVideoElement = document.getElementById('remote-video') as HTMLVideoElement;
        this.remoteVideo.nativeElement.srcObject = remoteStream
        // remoteVideoElement.srcObject = remoteStream
        console.log('Remote stream added successfully');
      }


      //  if (updateType === 'ADD') {
      //   streamList.forEach((stream:any) => {
      //      this.zego.startPlayingStream(stream.streamID);
      //      this.remoteStream = stream;
      //      const remoteVideoElement = document.getElementById('remote-video') as HTMLVideoElement;
      //      remoteVideoElement.srcObject = stream;
      //    });
      //  }
     });
    
    } catch(error){
          console.error("Failed to start call : : ",error)
    }
      
     // const streamID = 'remoteStream'
 
     // The stream list specified by `streamList` contains the ID of the corresponding stream.
 
     // await this.zego.startPlayingStream(streamID)
     // .then((stream:any) => {
     //   this.remoteStream = stream;
     //   const remoteVideoElement = document.getElementById('remote-video') as HTMLVideoElement;
     //   remoteVideoElement.srcObject = stream;
     // })
     // .catch((error:any) => {
     //   console.error('Failed to play stream:', error);
     // });
 
   }

  async checkRoom (){
   await this.zego.on('roomUserUpdate',(roomID:any,updateType:any,userList:any)=>{
      if(userList.length > 2){
       alert('Room is full. Only one admin and one user are allowed.');
       return;
      }

       console.log('=====User update=====:', updateType, userList);
      if (updateType === 'DELETE') {
        userList.forEach((user:any) => {
           console.log(`======User left=====: ${user.userName}`);
        });
      }
})
  }

  stopPublishingStream(streamID: string): void {
    this.zego.stopPublishingStream(streamID);
  }



  stopPlayingStream(streamID: string): void {
    this.zego.stopPlayingStream(streamID);
  }

  copyInviteLink() {
    if (this.inviteLink) {
      navigator.clipboard.writeText(this.inviteLink).then(() => {
        alert('Invite link copied to clipboard');
      }).catch(err => {
        console.error('Could not copy invite link: ', err);
      });
    }
  }






  // initializeZego(): void {
  //   // this.zego = new ZegoExpressEngine(this.appID, this.server);
  //          // Define the user object

  // const userID = this.userID


  //   // Login to the room
  //   this.zego.loginRoom(this.roomID, this.token,  {userID, userName: userID }, { userUpdate: true })
  //     .then(( result) => {

  //         if(result == true){
  //           console.log('Logged in to the room');
  //           this.startLocalStream();
  //           this.startSubscribing();
  //         }else{
  //           console.error('Failed to login to the room');
  //         }
   
  //     })
  //     .catch((error) => {
  //       console.error('Failed to login to the room:', error);
  //     });
  // }

  

  // startSubscribing(): void {
  //   this.zego.on('roomStreamUpdate', async (roomID, updateType, streamList, extendedData)  => {

  //     const streamID = streamList[0].streamID;

  //     this.zego.startPlayingStream(streamID)
  //       .then((stream) => {
  //         this.remoteStream = stream;
  //         const remoteVideoElement = document.getElementById('remote-video') as HTMLVideoElement;
  //         remoteVideoElement.srcObject = stream;
  //       })
  //       .catch((error) => {
  //         console.error('Failed to play stream:', error);
  //       });
  //   });
  // }
}