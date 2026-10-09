import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  CreateLivrableAttenduRequest,
  LivrableAttendu,
  UpdateLivrableAttenduRequest,
} from '../models/parcours.model';

@Injectable({ providedIn: 'root' })
export class LivrableAttenduService {
  private readonly http = inject(HttpClient);

  getLivrablesByMissionEtape(etapeId: string, missionId: string): Observable<LivrableAttendu[]> {
    return this.http.get<LivrableAttendu[]>(`${environment.apiUrl}/etapes/${etapeId}/missions/${missionId}/livrables`);
  }

  createLivrableAttendu(etapeId: string, missionId: string, request: CreateLivrableAttenduRequest): Observable<LivrableAttendu> {
    return this.http.post<LivrableAttendu>(`${environment.apiUrl}/etapes/${etapeId}/missions/${missionId}/livrables`, request);
  }

  updateLivrableAttendu(
    etapeId: string,
    missionId: string,
    livrableId: string,
    request: UpdateLivrableAttenduRequest,
  ): Observable<LivrableAttendu> {
    return this.http.put<LivrableAttendu>(`${environment.apiUrl}/etapes/${etapeId}/missions/${missionId}/livrables/${livrableId}`, request);
  }

  deleteLivrableAttendu(etapeId: string, missionId: string, livrableId: string): Observable<void> {
    return this.http.delete<void>(`${environment.apiUrl}/etapes/${etapeId}/missions/${missionId}/livrables/${livrableId}`);
  }
}
