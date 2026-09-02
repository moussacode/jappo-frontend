import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { Entrepreneur } from '../models/entrepreneur.model';
import { MOCK_ENTREPRENEURS } from '../mocks/utilisateurs.mock';

@Injectable({ providedIn: 'root' })
export class EntrepreneurService {
  private entrepreneurs = [...MOCK_ENTREPRENEURS];

  getAll(): Observable<Entrepreneur[]> {
    // TODO backend réel : this.http.get<Entrepreneur[]>('/api/structures/{id}/entrepreneurs')
    return of(this.entrepreneurs).pipe(delay(300));
  }

  getById(id: string): Observable<Entrepreneur | undefined> {
    // TODO backend réel : this.http.get<Entrepreneur>(`/api/entrepreneurs/${id}`)
    return of(this.entrepreneurs.find((e) => e.id === id)).pipe(delay(300));
  }

  updateProfil(id: string, changements: Partial<Pick<Entrepreneur, 'nom'>>): Observable<Entrepreneur> {
    // TODO backend réel : this.http.patch<Entrepreneur>(`/api/entrepreneurs/${id}`, changements)
    const entrepreneur = this.entrepreneurs.find((e) => e.id === id)!;
    Object.assign(entrepreneur, changements);
    return of(entrepreneur).pipe(delay(300));
  }
}