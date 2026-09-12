import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Structure } from '../models/structure.model';

@Injectable({ providedIn: 'root' })
export class StructureService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/structures`;

  /**
   * Récupérer les détails d'une structure par ID
   * GET /api/structures/:id
   */
  getById(id: string): Observable<Structure> {
    return this.http.get<Structure>(`${this.apiUrl}/${id}`);
  }

  /**
   * Mettre à jour le profil de l'incubateur/structure
   * PATCH /api/structures/:id
   */
  updateProfil(
    id: string,
    changements: Partial<Pick<Structure, 'nom' | 'emailContact' | 'telephone'>>,
  ): Observable<Structure> {
    return this.http.patch<Structure>(`${this.apiUrl}/${id}`, changements);
  }

  update(id: string, data: Partial<Structure>): Observable<Structure> {
    return this.http.put<Structure>(`${this.apiUrl}/${id}`, data);
  }
}