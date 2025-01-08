import { Injectable } from '@angular/core';
import { HttpClient ,HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'https://zegoapi-ahkpvp9ym-shanyus-projects.vercel.app/generatetoken'; // replace with your API endpoint

  constructor(private http: HttpClient) {}

  // Method to make POST request with parameters
  postData(data: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',  // Optional: Set headers if needed
    });

    return this.http.post<any>(this.apiUrl, data, { headers });
  }
}
