import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cohorte, Phase } from '../models/cohorte.model';

export interface CreatePhaseRequest {
  nom: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class PhaseService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/phases`;

  getAllPhases(): Observable<Phase[]> {
    return this.http.get<Phase[]>(this.apiUrl);
  }

  getActivePhases(): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.apiUrl}/actives`);
  }

  getPhaseById(id: string): Observable<Phase> {
    return this.http.get<Phase>(`${this.apiUrl}/${id}`);
  }

  getCohortesByPhase(phaseId: string): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(`${this.apiUrl}/${phaseId}/cohortes`);
  }

  createPhase(request: CreatePhaseRequest): Observable<Phase> {
    return this.http.post<Phase>(this.apiUrl, request);
  }

  updatePhase(id: string, request: CreatePhaseRequest): Observable<Phase> {
    return this.http.patch<Phase>(`${this.apiUrl}/${id}`, request);
  }

  archivePhase(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  restaurerPhase(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }
}
