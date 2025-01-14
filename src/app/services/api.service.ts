import { Injectable } from '@angular/core';
import { HttpClient ,HttpHeaders } from '@angular/common/http';
import { Observable ,of} from 'rxjs';
import {map, catchError} from 'rxjs/operators';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private apiUrl = 'https://zegoapi.vercel.app/generatetoken'; // replace with your API endpoint

  constructor(private http: HttpClient) {}

  // Method to make POST request with parameters
  postData(data: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',  // Optional: Set headers if needed
    });

    return this.http.post<any>(this.apiUrl, data, { headers });
  }


   // Fetch initial user list using RxJS
   getUsers(offset: number = 0): Observable<any> {
    const headers = new HttpHeaders({ authorization: environment.secretKey });
    const filters = JSON.stringify({ status: 0, limit: 100000, offset: offset });
    const encodedFilters = encodeURIComponent(filters);

    return this.http.get(`${environment.serverUrl}/queue/filters=${encodedFilters}`, { headers }).pipe(
      map((response: any) => {
        return response; // Return the user list
      }),
      catchError((error) => {
        console.error('Error fetching users:', error);
        return of([]); // Return an empty array in case of error
      })
    );
  }
}
