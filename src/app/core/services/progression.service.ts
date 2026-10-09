import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { FeuilleRouteProjet, Progression, Etape, LivrableAttendu } from '../models/parcours.model';
import { MissionProjet } from '../models/mission.model';
import { Livrable } from '../models/livrable.model';
import { EtapeService } from './etape.service';

export interface HistoriqueProgressionDTO {
  id: string;
  progressionId: string;
  etapeEntreeId?: string;
  etapeSortieId?: string;
  phaseEntreeId?: string;
  phaseSortieId?: string;
  dateEntree: string;
  dateSortie?: string;
  raison?: string;
  typeChangement: 'MANUEL' | 'AUTOMATIQUE';
  effectueParId?: string;
}

export interface ProgressionDTO {
  id: string;
  projetId: string;
  parcoursId: string;
  phaseId: string;
  etapeId?: string;
  statut: string;
  pourcentageAvancement: number;
  dateDebut?: string;
  dateFin?: string;
  dateDerniereMaj?: string;
}

@Injectable({ providedIn: 'root' })
export class ProgressionService {
  private readonly http = inject(HttpClient);
  private readonly etapeService = inject(EtapeService);
  private readonly apiUrl = `${environment.apiUrl}/progression`;

  getAllProgressions(): Observable<ProgressionDTO[]> {
    return this.http.get<ProgressionDTO[]>(this.apiUrl);
  }

  getProgressionsByProjetId(projetId: string): Observable<ProgressionDTO[]> {
    return this.http.get<ProgressionDTO[]>(`${this.apiUrl}/projet/${projetId}`);
  }

  getFeuilleRouteProjet(projetId: string): Observable<FeuilleRouteProjet> {
    return this.http.get<FeuilleRouteProjet>(`${this.apiUrl}/projet/${projetId}/feuille-de-route`);
  }

  getMissionsByProjetId(projetId: string): Observable<MissionProjet[]> {
    return this.http.get<MissionProjet[]>(`${environment.apiUrl}/missions/projet/${projetId}`);
  }

  getLivrablesByMissionId(missionProjetId: string): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${environment.apiUrl}/livrables/mission/${missionProjetId}`);
  }

  getLivrablesByProjetId(projetId: string): Observable<Livrable[]> {
    return this.http.get<Livrable[]>(`${environment.apiUrl}/livrables/projet/${projetId}`);
  }

  getLivrablesAttendusByMissionEtape(etapeId: string, missionId: string): Observable<LivrableAttendu[]> {
    return this.http.get<LivrableAttendu[]>(`${environment.apiUrl}/etapes/${etapeId}/missions/${missionId}/livrables`);
  }

  getProgressionById(id: string): Observable<ProgressionDTO> {
    return this.http.get<ProgressionDTO>(`${this.apiUrl}/${id}`);
  }

  getHistoriqueByProgressionId(progressionId: string): Observable<HistoriqueProgressionDTO[]> {
    return this.http.get<HistoriqueProgressionDTO[]>(`${this.apiUrl}/${progressionId}/historique`);
  }

  isEtapeAccessible(progressionId: string, etapeId: string): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/${progressionId}/etape/${etapeId}/accessible`);
  }

  validerEtape(progressionId: string): Observable<ProgressionDTO> {
    return this.http.post<ProgressionDTO>(`${this.apiUrl}/${progressionId}/valider-etape`, {});
  }

  /**
   * Récupère les étapes d'une phase avec leur statut de progression
   */
  getEtapesProgression(progressionId: string, phaseId: string): Observable<Etape[]> {
    if (!phaseId) {
      return of([]);
    }

    return this.etapeService.getEtapesByPhaseId(phaseId).pipe(
      switchMap((etapes: Etape[]) => {
        if (etapes.length === 0) {
          return of([]);
        }

        // Récupérer la progression actuelle et l'historique
        return forkJoin({
          progression: this.getProgressionById(progressionId),
          historique: this.getHistoriqueByProgressionId(progressionId)
        }).pipe(
          map(({ progression, historique }) => {
            // Déterminer les étapes validées depuis l'historique
            const etapesValidees = new Set(
              historique
                .filter(h => h.raison === 'VALIDATION_COACH' && h.etapeEntreeId)
                .map(h => h.etapeEntreeId)
            );

            // Déterminer les étapes accessibles
            return etapes.map((etape: Etape) => {
              // Si c'est l'étape actuelle → ACTIVE
              if (etape.id === progression.etapeId) {
                return { ...etape, statut: 'ACTIVE' as const, accessible: true };
              }

              // Si l'étape est validée → VALIDEE
              if (etapesValidees.has(etape.id)) {
                return { ...etape, statut: 'VALIDEE' as const, accessible: true };
              }

              // Si c'est la première étape → ACTIVE
              if (etape.ordre === 1) {
                return { ...etape, statut: 'ACTIVE' as const, accessible: true };
              }

              // Vérifier si l'étape précédente est validée
              const etapePrecedente = etapes.find((e: Etape) => e.ordre === etape.ordre - 1);
              if (etapePrecedente && etapesValidees.has(etapePrecedente.id)) {
                return { ...etape, statut: 'ACTIVE' as const, accessible: true };
              }

              // Sinon → VERROUILLEE
              return { ...etape, statut: 'VERROUILLEE' as const, accessible: false };
            });
          })
        );
      })
    );
  }
}
