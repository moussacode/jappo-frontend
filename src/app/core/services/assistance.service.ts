
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';


export interface SupportRequest {
  email: string;
  message: string;
}

export interface SupportResponse {
  success: boolean;
  status: 'RESOLVED' | 'OPEN';
  ticketId: string;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class AssistanceService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/assistance`;

  sendRequest(
    request: SupportRequest
  ): Observable<SupportResponse> {
    return this.http.post<SupportResponse>(
      this.apiUrl,
      request
    );
  }
}
