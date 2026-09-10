import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Projet } from '../models/projet.model';

@Injectable({
  providedIn: 'root',
})
export class ProjetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/projets`;

  /**
   * Récupérer tous les projets de la structure active
   * GET /api/projets
   */
  getProjets(): Observable<Projet[]> {
    return this.http.get<Projet[]>(this.apiUrl);
  }

  /**
   * Récupérer un projet par ID
   * GET /api/projets/:id
   */
  getById(id: string): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer les projets rattachés à une cohorte
   * GET /api/projets/cohorte/:cohorteId
   */
  getByCohorte(cohorteId: string): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.apiUrl}/cohorte/${cohorteId}`);
  }

  /**
   * Récupérer le projet principal d'un entrepreneur
   * GET /api/projets/entrepreneur/:entrepreneurId
   */
  getPrincipalByEntrepreneur(entrepreneurId: string): Observable<Projet> {
    return this.http.get<Projet>(`${this.apiUrl}/entrepreneur/${entrepreneurId}`);
  }

  /**
   * Mettre à jour l'étape du diagnostic
   * PATCH /api/projets/:id/diagnostic
   */
  updateDiagnostic(projetId: string, etape: string): Observable<Projet> {
    return this.http.patch<Projet>(`${this.apiUrl}/${projetId}/diagnostic`, { etape });
  }
  
  updateNomProjet(projetId: string, nom: string): Observable<Projet> {
  return this.http.patch<Projet>(`${this.apiUrl}/${projetId}/nom`, { nom });
}
}