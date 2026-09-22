import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import {
  Meeting,
  CreateMeetingRequest,
  JoinMeetingResponse
} from '../models/meeting.model';

@Injectable({ providedIn: 'root' })
export class MeetingService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/meetings`;

  getMeetings(cohorteId?: string): Observable<Meeting[]> {
    const params = cohorteId ? { cohorteId } : undefined;
    return this.http.get<Meeting[]>(this.apiUrl, params ? { params } : {});
  }

  getMyMeetings(): Observable<Meeting[]> {
    return this.http.get<Meeting[]>(`${this.apiUrl}/my`);
  }

  getMeetingById(id: string): Observable<Meeting> {
    return this.http.get<Meeting>(`${this.apiUrl}/${id}`);
  }

  createMeeting(request: CreateMeetingRequest): Observable<Meeting> {
    return this.http.post<Meeting>(this.apiUrl, request);
  }

  joinMeeting(id: string): Observable<JoinMeetingResponse> {
    return this.http.post<JoinMeetingResponse>(`${this.apiUrl}/${id}/join`, {});
  }

  leaveMeeting(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/leave`, {});
  }

  endMeeting(id: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/end`, {});
  }
}
