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
    console.log(id)
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
   * Récupérer les projets de l'entrepreneur connecté
   * GET /api/projets/mes-projets
   */
  getMesProjets(): Observable<Projet[]> {
    return this.http.get<Projet[]>(`${this.apiUrl}/mes-projets`);
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

updateProjet(
  id: string,
  changements: Partial<Pick<Projet, 'nom' | 'description' | 'secteur'>>,
): Observable<Projet> {
  return this.http.patch<Projet>(`${this.apiUrl}/${id}`, changements);
}

archiverProjet(id: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}

restaurerProjet(id: string): Observable<void> {
  return this.http.patch<void>(`${this.apiUrl}/${id}/restaurer`, {});
}


/**
 * Créer un projet (avec ou sans cohorte)
 * POST /api/projets
 */
create(payload: {
  nom: string;
  description?: string;
  secteur?: string;
  cohorteId?: string | null;
  entrepreneurId?: string | null;
}): Observable<Projet> {
  return this.http.post<Projet>(this.apiUrl, payload);
}


promouvoirProjet(projetId: string, nouvelleCohorteId: string | null): Observable<Projet> {
  return this.http.post<Projet>(`${this.apiUrl}/${projetId}/promouvoir`, { nouvelleCohorteId });
}
}