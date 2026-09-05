import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Livrable, LivrableItem } from '../models/livrable.model';

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private livrables: Livrable[] = [];

  getByMission(missionId: string): Observable<Livrable | undefined> {
    // TODO backend réel : this.http.get<Livrable>(`/api/missions/${missionId}/livrable`)
    return of(this.livrables.find((l) => l.missionId === missionId)).pipe(delay(200));
  }

   submit(
    missionId: string,
    projetId: string,
    items: LivrableItem[],
    noteEntrepreneur: string,
  ): Observable<Livrable> {
    const livrable: Livrable = {
      id: crypto.randomUUID(),
      missionId,
      projetId,
      items,
      noteEntrepreneur,
      dateSoumission: new Date().toISOString(),
      statutValidation: 'en_attente',
    };

    this.livrables.push(livrable);

    return of(livrable).pipe(delay(400));
  
  }
}