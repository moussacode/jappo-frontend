import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Projet, ParticipationCohorteResponse } from '../models/projet.model';
import { MissionResponse } from '../models/mission.model';

/**
 * Service dédié à la vue "Mon Parcours" de l'entrepreneur.
 * Appelle les endpoints /api/mon-parcours/*.
 */
@Injectable({ providedIn: 'root' })
export class MonParcoursService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/mon-parcours`;

  /** Résumé du projet principal de l'entrepreneur connecté. */
  getMonProjet(): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiUrl}/projet`);
  }

  /** Historique complet de participation aux cohortes (frise). */
  getHistorique(): Observable<ParticipationCohorteResponse[]> {
    return this.http.get<ParticipationCohorteResponse[]>(`${this.apiUrl}/historique`);
  }

  /** Missions actives dans la cohorte courante. */
  getMesMissions(): Observable<MissionResponse[]> {
    return this.http.get<MissionResponse[]>(`${this.apiUrl}/missions`);
  }
}
