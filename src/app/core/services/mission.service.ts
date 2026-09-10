import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Mission, StatutMission, CreateMissionRequest } from '../models/mission.model';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/missions`;

  /**
   * Créer une ou plusieurs missions
   * POST /api/missions
   * Backend: MissionController.createMission(@RequestBody CreateMissionRequest request)
   */
  createMission(request: CreateMissionRequest): Observable<Mission[]> {
    return this.http.post<Mission[]>(this.apiUrl, request);
  }

  /**
   * Récupérer toutes les missions de la structure active
   * GET /api/missions
   * Backend: MissionController.getMyMissions()
   */
  getMissions(): Observable<Mission[]> {
    return this.http.get<Mission[]>(this.apiUrl);
  }

  /**
   * Alias de getMissions() pour compatibilité
   */
  getAll(): Observable<Mission[]> {
    return this.getMissions();
  }

  /**
   * Récupérer les missions associées à un projet spécifique
   * GET /api/missions/projet/{projetId}
   * Backend: MissionController.getMissionsByProjet(@PathVariable UUID projetId)
   */
  getByProjet(projetId: string): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/projet/${projetId}`);
  }

  /**
   * Mettre à jour le statut d'une mission
   * PATCH /api/missions/{id}/statut
   * Backend: MissionController.updateStatut(@PathVariable UUID id, @RequestBody UpdateStatutMissionRequest request)
   */
  updateStatut(id: string, statut: StatutMission): Observable<Mission> {
    return this.http.patch<Mission>(`${this.apiUrl}/${id}/statut`, { statut });
  }

  getById(id: string): Observable<Mission> {
    return this.http.get<Mission>(`${this.apiUrl}/${id}`);
  }
}