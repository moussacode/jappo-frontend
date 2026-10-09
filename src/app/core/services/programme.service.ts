import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Programme } from '../models/parcours.model';

export interface CreateProgrammeRequest {
  nom: string;
  description?: string;
}

export interface UpdateProgrammeRequest {
  nom: string;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class ProgrammeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/programmes`;

  getAllProgrammes(): Observable<Programme[]> {
    return this.http.get<Programme[]>(this.apiUrl);
  }

  getProgrammeById(id: string): Observable<Programme> {
    return this.http.get<Programme>(`${this.apiUrl}/${id}`);
  }

  createProgramme(request: CreateProgrammeRequest): Observable<Programme> {
    return this.http.post<Programme>(this.apiUrl, request);
  }

  updateProgramme(id: string, request: UpdateProgrammeRequest): Observable<Programme> {
    return this.http.put<Programme>(`${this.apiUrl}/${id}`, request);
  }

  deleteProgramme(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  archiverProgramme(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/archiver`, {});
  }

  restaurerProgramme(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }
}
