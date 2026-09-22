import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Cohorte } from '../models/cohorte.model';
import {
  Projet,
  CreateProjetRequest,
  UpdateProjetRequest,
  PromouvoirProjetRequest,
  PromotionGroupeeRequest,
  PromotionGroupeeResultat,
  ParticipationCohorteResponse,
} from '../models/projet.model';

@Injectable({ providedIn: 'root' })
export class ProjetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/projets`;

  getProjets(statutArchivage?: string): Observable<Projet[]> {
    const params = statutArchivage ? new HttpParams().set('statutArchivage', statutArchivage) : undefined;
    return this.http.get<Projet[]>(this.apiUrl, params ? { params } : {});
  }

  getById(id: string): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiUrl}/${id}`);
  }

  getByCohorte(cohorteId: string): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.apiUrl}/cohorte/${cohorteId}`);
  }

  getPrincipalByEntrepreneur(entrepreneurId: string): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiUrl}/entrepreneur/${entrepreneurId}`);
  }

  getMesProjets(): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.apiUrl}/mes-projets`);
  }

  create(payload: CreateProjetRequest): Observable<Projet> {
    return this.http.post<Projet>(this.apiUrl, payload);
  }

  updateProjet(id: string, changements: UpdateProjetRequest): Observable<Projet> {
    return this.http.patch<Projet>(`${this.apiUrl}/${id}`, changements);
  }

  updateNomProjet(projetId: string, nom: string): Observable<Projet> {
    return this.http.patch<Projet>(`${this.apiUrl}/${projetId}/nom`, { nom });
  }

  archiverProjet(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  restaurerProjet(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }

  /** Promotion individuelle vers une cohorte cible. */
  promouvoir(projetId: string, request: PromouvoirProjetRequest): Observable<Projet> {
    return this.http.post<Projet>(`${this.apiUrl}/${projetId}/promouvoir`, request);
  }

  /** Alias : l'ancien appel passait { nouvelleCohorteId }. */
  promouvoirProjet(
    projetId: string,
    request: PromouvoirProjetRequest | { nouvelleCohorteId: string; raison?: string; forcer?: boolean },
  ): Observable<Projet> {
    if ('cohorteCibleId' in request) {
      return this.promouvoir(projetId, request);
    }
    return this.promouvoir(projetId, {
      cohorteCibleId: request.nouvelleCohorteId,
      raison: request.raison,
      forcer: request.forcer ?? false,
    });
  }

  /** Historique des participations aux cohortes (frise). */
  getHistorique(projetId: string): Observable<ParticipationCohorteResponse[]> {
    return this.http.get<ParticipationCohorteResponse[]>(`${this.apiUrl}/${projetId}/historique`);
  }

  /** Cohortes éligibles à la promotion pour un projet. */
  getCohortesEligibles(projetId: string): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(`${this.apiUrl}/${projetId}/cohortes-eligibles`);
  }
}