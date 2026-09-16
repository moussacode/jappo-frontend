import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

export interface DashboardStatsResponse {
  totalEntrepreneurs: number;
  entrepreneursActifs: number;
  invitationsEnAttente: number;
  totalCohortes: number;
  scoreMaturiteMoyen: number;
  projetsAttention: number;
  livrablesEnAttente: number;
}

export interface AlerteProjetResponse {
  projetId: string;
  nomProjet: string;
  entrepreneurId?: string;
  nomEntrepreneur: string;
  emailEntrepreneur?: string;
  nomCohorte: string;
  scoreMaturite: number;
  raisonAlerte: string;
}

export interface LivrableRecentResponse {
  livrableId: string;
  nomLivrable: string;
  projetId?: string;
  nomProjet: string;
  nomEntrepreneur: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'A_CORRIGER' | 'REJETE' | string;
  dateDepot?: string;
  missionId?: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  /**
   * Récupérer les KPIs statistiques globaux de la structure
   * GET /api/dashboard/stats
   */
  getStats(): Observable<DashboardStatsResponse> {
    return this.http.get<DashboardStatsResponse>(`${this.apiUrl}/stats`);
  }

  /**
   * Récupérer la liste des projets sous le seuil de maturité (< 40%)
   * GET /api/dashboard/alertes
   */
  getAlertes(): Observable<AlerteProjetResponse[]> {
    return this.http.get<AlerteProjetResponse[]>(`${this.apiUrl}/alertes`);
  }

  /**
   * Récupérer les derniers livrables déposés par les entrepreneurs
   * GET /api/dashboard/livrables/recents?limit=5
   */
  getLivrablesRecents(limit = 5): Observable<LivrableRecentResponse[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<LivrableRecentResponse[]>(`${this.apiUrl}/livrables/recents`, { params });
  }
}