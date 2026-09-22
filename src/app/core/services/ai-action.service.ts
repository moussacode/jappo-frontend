import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { AiAction } from '../models/ai-action.model';

interface ApiResponse {
  success: boolean;
  message: string;
  actionId: string;
  status?: string;
  resource?: {
    type: string;
    id: string;
    name: string;
    url: string;
  };
}

@Injectable({ providedIn: 'root' })
export class AiActionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ia-actions`;

  /**
   * Confirmer une action IA proposée
   * POST /api/ia-actions/{id}/confirmer
   */
  confirmerAction(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/confirmer`, {});
  }

  /**
   * Rejeter une action IA proposée
   * POST /api/ia-actions/{id}/rejeter
   */
  rejeterAction(id: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.apiUrl}/${id}/rejeter`, {});
  }

  /**
   * Récupérer les actions en attente pour la structure active
   * TODO: Endpoint backend à créer si nécessaire
   */
  getActionsEnAttente(): Observable<AiAction[]> {
    // Pour l'instant, cette fonctionnalité peut être extraite des messages de conversation
    // qui contiennent le champ actionsJson
    return this.http.get<AiAction[]>(`${this.apiUrl}/en-attente`);
  }
}
