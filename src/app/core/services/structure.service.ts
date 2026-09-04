import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Structure } from '../models/structure.model';
import { MOCK_STRUCTURES } from '../mocks/structures.mock';

@Injectable({ providedIn: 'root' })
export class StructureService {
  private structures = [...MOCK_STRUCTURES];

  getById(id: string): Observable<Structure | undefined> {
    // TODO backend réel : this.http.get<Structure>(`/api/structures/${id}`)
    return of(this.structures.find((s) => s.id === id)).pipe(delay(250));
  }

  updateProfil(
    id: string,
    changements: Partial<Pick<Structure, 'nom' | 'emailContact' | 'telephone'>>,
  ): Observable<Structure> {
    // TODO backend réel : this.http.patch<Structure>(`/api/structures/${id}`, changements)
    const structure = this.structures.find((s) => s.id === id)!;
    Object.assign(structure, changements);
    return of(structure).pipe(delay(300));
  }
}