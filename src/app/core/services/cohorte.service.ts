import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Cohorte, CreateCohorteRequest, UpdateCohorteRequest, PhaseParcours } from '../models/cohorte.model';

@Injectable({ providedIn: 'root' })
export class CohorteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cohortes`;

  getCohortes(): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(this.apiUrl);
  }

    getActiveCohortes(): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(`${this.apiUrl}/cohorte-active`);
  }

  /** Alias rétrocompatible pour dashboard.ts et entrepreneurs-list.ts */
  getByStructure(structureId?: string): Observable<Cohorte[]> {
    return this.getCohortes();
  }

  getCohorteById(id: string): Observable<Cohorte> {
    return this.http.get<Cohorte>(`${this.apiUrl}/${id}`);
  }

  /** Alias rétrocompatible pour cohorte-detail.ts */
  getById(id: string): Observable<Cohorte> {
    return this.getCohorteById(id);
  }

  createCohorte(request: CreateCohorteRequest): Observable<Cohorte> {
    return this.http.post<Cohorte>(this.apiUrl, request);
  }

  updateCohorte(id: string, changements: UpdateCohorteRequest): Observable<Cohorte> {
    return this.http.patch<Cohorte>(`${this.apiUrl}/${id}`, changements);
  }

  archiverCohorte(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Restaurer une cohorte archivée
   * PATCH /api/cohortes/{id}/restaurer
   */
  restaurerCohorte(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }

  /**
   * Récupérer les cohortes par statut (actives ou archivées)
   * GET /api/cohortes/statut/{statut}
   */
  getCohortesByStatut(statut: string): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(`${this.apiUrl}/statut/${statut}`);
  }

  /** Cohortes de la structure dont la phase est postérieure à celle donnée (pour la promotion de projets) */
  getCohortesPhaseSuivante(phaseActuelle: PhaseParcours): Observable<Cohorte[]> {
    const ordre: PhaseParcours[] = ['PRE_INCUBATION', 'INCUBATION', 'POST_INCUBATION'];
    const indexActuel = ordre.indexOf(phaseActuelle);
    return new Observable<Cohorte[]>((subscriber) => {
      this.getActiveCohortes().subscribe({
        next: (cohortes) => {
          subscriber.next(cohortes.filter((c) => ordre.indexOf(c.phase) > indexActuel));
          subscriber.complete();
        },
        error: (err) => subscriber.error(err),
      });
    });
  }
}