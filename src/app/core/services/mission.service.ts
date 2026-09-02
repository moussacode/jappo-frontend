import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Mission, StatutMission } from '../models/mission.model';
import { MOCK_MISSIONS } from '../mocks/missions.mock';

@Injectable({ providedIn: 'root' })
export class MissionService {
  private missions = [...MOCK_MISSIONS];

  getByProjet(projetId: string): Observable<Mission[]> {
    // TODO backend réel : this.http.get<Mission[]>(`/api/missions?projetId=${projetId}`)
    return of(this.missions.filter((m) => m.cibleProjetId === projetId)).pipe(delay(300));
  }

  getById(id: string): Observable<Mission | undefined> {
    return of(this.missions.find((m) => m.id === id)).pipe(delay(300));
  }

  updateStatut(id: string, statut: StatutMission): Observable<Mission> {
    const mission = this.missions.find((m) => m.id === id)!;
    mission.statut = statut;
    return of(mission).pipe(delay(300));
  }
}