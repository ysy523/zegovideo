import { Injectable } from '@angular/core';
import { ZegoExpressEngine } from 'zego-express-engine-webrtc';
import { environment } from '../environments/environment';

@Injectable({
    providedIn: 'root'
  })




  export class VideoService {
    zegoEngine: any;
    localStream: any;
    remoteStream: any;

    private appId = environment.zegoCloud.appId;
    private serverSecret = environment.zegoCloud.serverSecret;


    deviceInfo = {
        cameras: [] as MediaDeviceInfo[],
        microphones: [] as MediaDeviceInfo[],
        speakers: [] as MediaDeviceInfo[],
        currentCamera: '',
        currentMicrophone: '',
        currentSpeaker: ''
      }


    constructor() {
        this.initZegoEngine();
      }

 initZegoEngine() {
    try {
      this.zegoEngine = new ZegoExpressEngine(
         this.appId,
         this.serverSecret
      );
      console.log('ZEGO Engine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ZEGO Engine:', error);
    }
  }


  async getZegoDeviceInfo() {
    try {
  
      // 获取当前使用的设备
      const microphones = await this.zegoEngine.getCameras();
      const { deviceID } = microphones[0]

      return  deviceID;

    } catch (error) {
      console.error('Failed to get device info:', error);
    }
  }

  async startCall(roomID: string, userID: string ,token:any) {

    try {
     // Check permissions first
     await this.checkPermissions();
    // Login to room with proper user object
    await this.zegoEngine.loginRoom(roomID, token, {
      userID:userID,
      userName: userID
    },{userUpdate:true});

    // Create and publish stream
    this.localStream = await this.zegoEngine.createStream({
      camera: {
        video: true,
        audio: true
      }
    });
    
    await this.zegoEngine.startPublishingStream(userID, this.localStream);
    return this.localStream;
  } catch (error) {
    console.error('Error in startCall:', error);
    throw error;
  }
}


private async checkPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Permission error:', error);
      throw new Error('Please grant camera and microphone permissions to use video call');
    }
  }



async endCall(roomID: string) {
    try {

      if (this.localStream) {
        await this.zegoEngine.stopPublishingStream();
        await this.zegoEngine.destroyStream(this.localStream);
        this.localStream = null;
      }
      if (this.remoteStream) {
        await this.zegoEngine.stopPlayingStream(this.remoteStream);
        this.remoteStream = null;
      }
      await this.zegoEngine.logoutRoom(roomID);
    } catch (error) {
      console.error('Error in endCall:', error);
      throw error;
    }
  }

  }