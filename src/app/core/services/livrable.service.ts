import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { LivrableResponse, CreateLivrableRequest, EvaluateLivrableRequest } from '../models/livrable.model';

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/livrables`;

  /**
   * Soumettre un nouveau livrable pour une mission
   */
  soumettreLivrable(request: CreateLivrableRequest): Observable<LivrableResponse> {
    return this.http.post<LivrableResponse>(this.apiUrl, request);
  }

  /**
   * Récupérer tous les livrables d'une mission spécifique
   */
  getLivrablesByMission(missionProjetId: string): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/mission/${missionProjetId}`);
  }

  /**
   * Récupérer tous les livrables d'un projet/startup
   */
  getLivrablesByProjet(projetId: string): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/projet/${projetId}`);
  }

  /**
   * Évaluer un livrable (Validation ou Demande de correction)
   */
  changerStatut(id: string, statut: string, commentaireCoach?: string): Observable<LivrableResponse> {
    return this.http.patch<LivrableResponse>(`${this.apiUrl}/${id}/statut`, {
      statut,
      commentaireCoach,
    });
  }
}