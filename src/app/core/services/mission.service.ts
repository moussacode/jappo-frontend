import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Mission, StatutMission, CreateMissionRequest, MissionCohorteResponse } from '../models/mission.model';

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
   * Récupérer les missions de cohorte agrégées avec leurs statistiques de suivi
   * GET /api/missions/agregees
   * Backend: MissionController.getMissionsCohorteAgregees()
   */
  getMissionsCohorteAgregees(): Observable<MissionCohorteResponse[]> {
    return this.http.get<MissionCohorteResponse[]>(`${this.apiUrl}/agregees`);
  }

  /**
   * Récupérer les suivis individuels d'une mission de cohorte
   * GET /api/missions/{missionCohorteId}/suivis
   */
  getSuivisIndividuels(missionCohorteId: string): Observable<Mission[]> {
    return this.http.get<Mission[]>(`${this.apiUrl}/${missionCohorteId}/suivis`);
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

  updateMissionDetails(
  id: string,
  changements: Partial<Pick<Mission, 'titre' | 'description' | 'dateEcheance' | 'priorite'>>,
): Observable<Mission> {
  return this.http.patch<Mission>(`${this.apiUrl}/${id}/details`, changements);
}

deleteMission(id: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}

/**
 * Archiver une mission de cohorte et tous ses suivis individuels
 * PATCH /api/missions/{id}/archiver
 */
archiverMissionCohorte(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/${id}/archiver`, {});
}

/**
 * Archiver un suivi de mission individuel
 * PATCH /api/missions/projet/{id}/archiver
 */
archiverMissionProjet(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/projet/${id}/archiver`, {});
}

/**
 * Restaurer une mission de cohorte et tous ses suivis individuels
 * PATCH /api/missions/{id}/restaurer
 */
restaurerMissionCohorte(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
}

/**
 * Restaurer un suivi de mission individuel
 * PATCH /api/missions/projet/{id}/restaurer
 */
restaurerMissionProjet(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/projet/${id}/restaurer`, {});
}
}