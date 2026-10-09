import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Etape, MissionEtape } from '../models/parcours.model';

export interface CreateEtapeRequest {
  nom: string;
  description?: string;
  ordre: number;
  obligatoire: boolean;
  phaseId: string;
}

export interface UpdateEtapeRequest {
  nom: string;
  description?: string;
  ordre: number;
  obligatoire: boolean;
}

export interface CreateMissionEtapeRequest {
  titre: string;
  description?: string | null;
  ordre?: number;
  obligatoire?: boolean;
  modeleId?: string | null;
}

export interface UpdateMissionEtapeRequest {
  titre?: string;
  description?: string | null;
  ordre?: number;
  obligatoire?: boolean;
  modeleId?: string | null;
  clearModele?: boolean;
}

@Injectable({ providedIn: 'root' })
export class EtapeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/etapes`;

  getAllEtapes(): Observable<Etape[]> {
    return this.http.get<Etape[]>(this.apiUrl);
  }

  getEtapeById(id: string): Observable<Etape> {
    return this.http.get<Etape>(`${this.apiUrl}/${id}`);
  }

  createEtape(request: CreateEtapeRequest): Observable<Etape> {
    return this.http.post<Etape>(this.apiUrl, request);
  }

  updateEtape(id: string, request: UpdateEtapeRequest): Observable<Etape> {
    return this.http.put<Etape>(`${this.apiUrl}/${id}`, request);
  }

  deleteEtape(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  archiverEtape(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/archiver`, {});
  }

  restaurerEtape(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }

  getEtapesByPhaseId(phaseId: string): Observable<Etape[]> {
    return this.http.get<Etape[]>(`${this.apiUrl}/phase/${phaseId}`);
  }

  getMissionsByEtapeId(etapeId: string): Observable<MissionEtape[]> {
    return this.http.get<MissionEtape[]>(`${this.apiUrl}/${etapeId}/missions`);
  }

  getMissionByEtapeId(etapeId: string, missionId: string): Observable<MissionEtape> {
    return this.http.get<MissionEtape>(`${this.apiUrl}/${etapeId}/missions/${missionId}`);
  }

  createMission(etapeId: string, request: CreateMissionEtapeRequest): Observable<MissionEtape> {
    return this.http.post<MissionEtape>(`${this.apiUrl}/${etapeId}/missions`, request);
  }

  updateMission(etapeId: string, missionId: string, request: UpdateMissionEtapeRequest): Observable<MissionEtape> {
    return this.http.put<MissionEtape>(`${this.apiUrl}/${etapeId}/missions/${missionId}`, request);
  }

  deleteMission(etapeId: string, missionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${etapeId}/missions/${missionId}`);
  }
}
