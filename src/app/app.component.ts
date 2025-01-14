import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { AuthService } from './services/Auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    RouterModule  
  ]
})
export class AppComponent implements OnInit{
  title = 'zego-video';

  url :any;
  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
 // Save the current route whenever it changes



    this.authService.autoLogin().subscribe((user) => {
      if (user) {
        this.router.events.subscribe((event) => {
          if (event instanceof NavigationEnd) {
              
            this.url = event.url;
           
          }
        });

        this.router.navigate([this.url]);
       
      }else{
        this.router.navigate(['/login']);
      }
    });
  }
}
