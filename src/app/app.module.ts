import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { HttpClientModule } from '@angular/common/http';  // Import HttpClientModule
import { RouterModule } from '@angular/router'; // Import RouterModule
import { HeaderComponent } from './header/header.component';
import { VideoCallComponent } from './video-call/video-call.component';
import { VideoContainerComponent } from './video-container/video-container.component';
import { UserJoinVideoComponent } from './user-join-video/user-join-video.component';
import { ApiService } from './api.service';  // Import ApiService
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    VideoCallComponent,
    VideoContainerComponent,
    UserJoinVideoComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Add this
  imports: [
    BrowserModule,
    HttpClientModule,
    CommonModule,
    RouterModule, // Add RouterModule here
    AppRoutingModule,
    FormsModule
  ],
  providers: [ApiService],
  bootstrap: [AppComponent] // Bootstraps AppComponent
})
export class AppModule { }