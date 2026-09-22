import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from './../../environments/environment';
import {
  Cohorte,
  CreateCohorteRequest,
  UpdateCohorteRequest,
  InviterEntrepreneursRequest,
} from '../models/cohorte.model';
import { PromotionGroupeeRequest, PromotionGroupeeResultat } from '../models/projet.model';

@Injectable({ providedIn: 'root' })
export class CohorteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/cohortes`;

  /** Cohortes non archivées par défaut (filtrables par statut). */
  getCohortes(statut?: string): Observable<Cohorte[]> {
    const params = statut ? new HttpParams().set('statut', statut) : undefined;
    return this.http.get<Cohorte[]>(this.apiUrl, params ? { params } : {});
  }

  getActiveCohortes(): Observable<Cohorte[]> {
    return this.getCohortes();
  }

  getCohortesByStatut(statut: string): Observable<Cohorte[]> {
    return this.getCohortes(statut);
  }

  /**
   * Cibles de promotion : même parcours, phase d'ordre strictement supérieur.
   * Calculé côté client à partir de GET /api/cohortes (pas d'endpoint dédié).
   */
  getCohortesPhaseSuivante(cohorte: Cohorte): Observable<Cohorte[]> {
    const ordreActuel = cohorte.phase?.ordre ?? -1;
    return this.getCohortes().pipe(
      map((liste) =>
        liste.filter(
          (c) =>
            c.id !== cohorte.id &&
            c.parcoursId === cohorte.parcoursId &&
            (c.phase?.ordre ?? -1) > ordreActuel,
        ),
      ),
    );
  }

  /** Toutes les cohortes y compris archivées. */
  getAllCohortes(): Observable<Cohorte[]> {
    return this.http.get<Cohorte[]>(`${this.apiUrl}/toutes`);
  }

  /** Alias rétrocompatible. */
  getByStructure(): Observable<Cohorte[]> {
    return this.getCohortes();
  }

  getCohorteById(id: string): Observable<Cohorte> {
    return this.http.get<Cohorte>(`${this.apiUrl}/${id}`);
  }

  getById(id: string): Observable<Cohorte> {
    return this.getCohorteById(id);
  }

  createCohorte(request: CreateCohorteRequest): Observable<Cohorte> {
    return this.http.post<Cohorte>(this.apiUrl, request);
  }

  updateCohorte(id: string, changements: UpdateCohorteRequest): Observable<Cohorte> {
    return this.http.put<Cohorte>(`${this.apiUrl}/${id}`, changements);
  }

  archiverCohorte(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/archiver`, {});
  }

  restaurerCohorte(id: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
  }

  /** Inviter des entrepreneurs dans la cohorte. */
  inviterEntrepreneurs(id: string, request: InviterEntrepreneursRequest): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/entrepreneurs`, request);
  }

  /** Promotion groupée de plusieurs projets. */
  promotionGroupee(id: string, request: PromotionGroupeeRequest): Observable<PromotionGroupeeResultat[]> {
    return this.http.post<PromotionGroupeeResultat[]>(`${this.apiUrl}/${id}/promotion-groupee`, request);
  }
}
