import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Projet } from '../models/projet.model';
import { EtapeParcours } from '../models/entrepreneur.model';
import { MOCK_PROJETS } from '../mocks/projets.mock';

@Injectable({ providedIn: 'root' })
export class ProjetService {
  private projets = [...MOCK_PROJETS];

  /** MVP : un entrepreneur n'a qu'un seul projet visible — celui-ci le retrouve (ou le crée s'il n'existe pas encore). */
  getPrincipalByEntrepreneur(entrepreneurId: string): Observable<Projet | undefined> {
    // TODO backend réel : this.http.get<Projet>(`/api/entrepreneurs/${entrepreneurId}/projets`)
    return of(this.projets.find((p) => p.entrepreneurId === entrepreneurId)).pipe(delay(250));
  }

  /** Appelé automatiquement à l'inscription — voir AuthService.register(). */
  creerProjetParDefaut(entrepreneurId: string, nom: string): Observable<Projet> {
    // TODO backend réel : this.http.post<Projet>('/api/projets', { entrepreneurId, nom })
    const projet: Projet = {
      id: crypto.randomUUID(),
      entrepreneurId,
      nom,
      scoreMaturite: 0,
      etapeActuelle: 'ideation',
      cohorteId: null,
      dateCreation: new Date().toISOString(),
    };
    this.projets.push(projet);
    return of(projet).pipe(delay(300));
  }

  updateDiagnostic(projetId: string, etape: EtapeParcours): Observable<Projet> {
    // TODO backend réel : this.http.patch<Projet>(`/api/projets/${projetId}/diagnostic`, { etape })
    const projet = this.projets.find((p) => p.id === projetId)!;
    projet.etapeActuelle = etape;
    return of(projet).pipe(delay(300));
  }
}