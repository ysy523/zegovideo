import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { VideoCallComponent } from './video-call/video-call.component';
import { VideoContainerComponent } from './video-container/video-container.component';

export const routes: Routes = [
    { path: 'video-call', component: VideoCallComponent }, // Route for the video call component
    { path: '', redirectTo: '/video-call', pathMatch: 'full' }, // Default route
    {
      path: 'video-room/:roomId',  // 添加roomId参数
      component: VideoContainerComponent
    },
    { path: 'join/:roomId', component: VideoContainerComponent },
    { path: '**', redirectTo: '/video-call' } // Fallback route for invalid paths
  ];


