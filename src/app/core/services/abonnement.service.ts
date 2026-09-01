import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Abonnement } from '../models/abonnement.model';
import { MOCK_ABONNEMENTS } from '../mocks/abonnements.mock';

@Injectable({ providedIn: 'root' })
export class AbonnementService {
  private abonnements = [...MOCK_ABONNEMENTS];

  getById(id: string | null): Observable<Abonnement | undefined> {
    // TODO backend réel : this.http.get<Abonnement>(`/api/abonnements/${id}`)
    return of(this.abonnements.find((a) => a.id === id)).pipe(delay(250));
  }
}