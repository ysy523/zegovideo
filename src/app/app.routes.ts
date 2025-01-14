import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { VideoCallComponent } from './video-call/video-call.component';
import { VideoContainerComponent } from './video-container/video-container.component';
import { UserJoinVideoComponent } from './user-join-video/user-join-video.component';
import { LoginComponent } from './login/login.component';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'video-call', component: VideoCallComponent, canActivate: [AuthGuard] }, // Route for the video call component
    { path: '', redirectTo: '/login', pathMatch: 'full' }, // Default route
    {
      path: 'video-room/:roomId',  // 添加roomId参数
      component: VideoContainerComponent
    },
    { path: 'join/:roomId', component: VideoContainerComponent },
    { path: '**', redirectTo: '/login' } // Fallback route for invalid paths
  ];


