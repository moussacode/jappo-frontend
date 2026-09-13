import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Cohorte, CreateCohorteRequest } from '../models/cohorte.model';

@Injectable({
  providedIn: 'root',
})
export class CohorteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cohortes`;

  /**
   * Récupère toutes les cohortes de la structure active (via en-tête X-Structure-Id)
   */
  getCohortes(): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(this.apiUrl);
  }

  /**
   * Alias rétrocompatible pour dashboard.ts et entrepreneurs-list.ts
   */
  getByStructure(structureId?: string): Observable<Cohorte[]> {
    return this.getCohortes();
  }

  /**
   * Récupère une cohorte par son ID
   */
  getCohorteById(id: string): Observable<Cohorte> {
    return this.http.get<Cohorte>(`${this.apiUrl}/${id}`);
  }

  /**
   * Alias rétrocompatible pour cohorte-detail.ts
   */
  getById(id: string): Observable<Cohorte> {
    return this.getCohorteById(id);
  }

  /**
   * Crée une cohorte
   */
  createCohorte(request: CreateCohorteRequest): Observable<Cohorte> {
    return this.http.post<Cohorte>(this.apiUrl, request);
  }

  /**
   * Alias rétrocompatible de création
   */
  create(nom: string, secteur?: string, dateDemarrage?: string): Observable<Cohorte> {
    return this.createCohorte({
      nom,
      description: secteur,
      dateDebut: dateDemarrage,
    });
  }


  updateCohorte(
  id: string,
  changements: Partial<Pick<Cohorte, 'nom' | 'description' | 'dateDebut' | 'dateFin' | 'statut'>>,
): Observable<Cohorte> {
  return this.http.patch<Cohorte>(`${this.apiUrl}/${id}`, changements);
}

archiverCohorte(id: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}
}