import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes'; // Import the routes array

@NgModule({
  imports: [RouterModule.forRoot(routes)], // Use the imported routes
  exports: [RouterModule]
})
export class AppRoutingModule { }