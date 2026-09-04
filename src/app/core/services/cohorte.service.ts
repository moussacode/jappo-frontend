import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Cohorte } from '../models/cohorte.model';
import { MOCK_COHORTES } from '../mocks/cohortes.mock';

@Injectable({ providedIn: 'root' })
export class CohorteService {
  private cohortes = [...MOCK_COHORTES];

  getByStructure(structureId: string): Observable<Cohorte[]> {
    // TODO backend réel : this.http.get<Cohorte[]>(`/api/structures/${structureId}/cohortes`)
    return of(this.cohortes.filter((c) => c.structureId === structureId)).pipe(delay(300));
  }

  getById(id: string): Observable<Cohorte | undefined> {
    return of(this.cohortes.find((c) => c.id === id)).pipe(delay(250));
  }

  create(structureId: string, nom: string, secteur: string, dateDemarrage: string): Observable<Cohorte> {
    // TODO backend réel : this.http.post<Cohorte>('/api/cohortes', { structureId, nom, secteur, dateDemarrage })
    const cohorte: Cohorte = { id: crypto.randomUUID(), nom, secteur, dateDemarrage, structureId };
    this.cohortes.push(cohorte);
    return of(cohorte).pipe(delay(400));
  }
}