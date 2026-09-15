import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MissionModele, CreateMissionModeleRequest } from '../models/mission-modele.model';

@Injectable({ providedIn: 'root' })
export class MissionModeleService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/structures/missions-modeles`;

  getModeles(): Observable<MissionModele[]> {
    return this.http.get<MissionModele[]>(this.apiUrl);
  }

  createModele(payload: CreateMissionModeleRequest): Observable<MissionModele> {
    return this.http.post<MissionModele>(this.apiUrl, payload);
  }
}
