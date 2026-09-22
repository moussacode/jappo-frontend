import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

import {
  Parcours,
  ParcoursPhase,
  Phase,
  CreateParcoursRequest,
  CreatePhaseRequest,
} from '../models/cohorte.model';

export type {
  Parcours as ParcoursResponse,
  ParcoursPhase as ParcoursPhaseResponse,
  Phase as PhaseResponse,
  CreateParcoursRequest,
  CreatePhaseRequest,
};

@Injectable({ providedIn: 'root' })
export class ParcoursService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/parcours`;

  /**
   * Récupère tous les parcours de la structure courante.
   */
  getAllParcours(): Observable<Parcours[]> {
    return this.http.get<Parcours[]>(this.apiUrl);
  }

  /**
   * Alias rétrocompatible.
   */
  getParcoursActifs(): Observable<Parcours[]> {
    return this.getAllParcours();
  }

  /**
   * Récupère un parcours par son ID.
   */
  getParcoursById(id: string): Observable<Parcours> {
    return this.http.get<Parcours>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les phases d'un parcours avec leur ordre.
   *
   * Backend :
   * GET /api/parcours/{parcoursId}/phases
   */
 
  /**
   * Récupère une phase globale par son ID.
   *
   * Backend :
   * GET /api/phases/{phaseId}
   */
  getPhaseById(phaseId: string): Observable<Phase> {
    return this.http.get<Phase>(
      `${environment.apiUrl}/phases/${phaseId}`,
    );
  }

  /**
   * Ajoute une phase existante à un parcours.
   *
   * La phase est réutilisée : elle n'est PAS recréée.
   *
   * Backend :
   * POST /api/parcours/{parcoursId}/phases/{phaseId}
   */
 

  /**
   * Retire une phase d'un parcours.
   *
   * La phase globale n'est PAS supprimée.
   *
   * Backend :
   * DELETE /api/parcours/{parcoursId}/phases/{phaseId}
   */
  retirerPhase(
    parcoursId: string,
    phaseId: string,
  ): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${parcoursId}/phases/${phaseId}`,
    );
  }

  /**
   * Réorganise les phases d'un parcours.
   *
   * Backend :
   * PUT /api/parcours/{parcoursId}/phases/ordre
   */


  /**
   * Crée un parcours.
   *
   * Les phases sont ajoutées séparément avec ajouterPhase().
   */
  createParcours(
    request: CreateParcoursRequest,
  ): Observable<Parcours> {
    return this.http.post<Parcours>(
      this.apiUrl,
      request,
    );
  }

  /**
   * Met à jour un parcours.
   */
  updateParcours(
    id: string,
    request: CreateParcoursRequest,
  ): Observable<Parcours> {
    return this.http.put<Parcours>(
      `${this.apiUrl}/${id}`,
      request,
    );
  }

  /**
   * Archive un parcours.
   */
  archiverParcours(id: string): Observable<void> {
    return this.http.patch<void>(
      `${this.apiUrl}/${id}/archiver`,
      {},
    );
  }




   getPhasesByParcours(parcoursId: string): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${this.apiUrl}/${parcoursId}/phases`);
  }

  ajouterPhase(parcoursId: string, phaseId: string): Observable<Phase> {
    return this.http.post<Phase>(`${this.apiUrl}/${parcoursId}/phases/${phaseId}`, {});
  }

  reorganiserPhases(parcoursId: string, phaseIds: string[]): Observable<Phase[]> {
    return this.http.put<Phase[]>(`${this.apiUrl}/${parcoursId}/phases/ordre`, { phaseIds });
  }

  // --- Bibliothèque de phases (GET/POST /api/phases) ---

  getAllPhases(): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${environment.apiUrl}/phases`);
  }

  getPhasesActives(): Observable<Phase[]> {
    return this.http.get<Phase[]>(`${environment.apiUrl}/phases/actives`);
  }

  createPhase(request: { nom: string; description?: string }): Observable<Phase> {
    return this.http.post<Phase>(`${environment.apiUrl}/phases`, request);
  }
}