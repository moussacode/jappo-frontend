import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

export type RoleEquipe = 'ADMIN_STRUCTURE' | 'COACH';
export type StatutMembre = 'ACCEPTE' | 'EN_ATTENTE' | 'REFUSE';
export interface MembreEquipe {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: RoleEquipe;
  statut: StatutMembre;
  estProprietaire?: boolean; // <-- Ajoute cette ligne
}
@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/invitations`;

  getMembresEquipe(): Observable<MembreEquipe[]> {
    return this.http.get<MembreEquipe[]>(`${environment.apiUrl}/structures/equipe`);
  }

  envoyerInvitation(email: string, role: RoleEquipe): Observable<void> {
    return this.http.post<void>(this.apiUrl, { email, role });
  }

  updateRoleMembre(membreId: string, role: RoleEquipe): Observable<void> {
    return this.http.patch<void>(`${environment.apiUrl}/structures/equipe/${membreId}/role`, { role });
  }

  getLienInvitation(role: RoleEquipe, regenerate = false): Observable<{ link: string }> {
  const params = new HttpParams()
    .set('role', role)
    .set('regenerate', String(regenerate));

  return this.http.get<{ link: string }>(`${this.apiUrl}/share-link`, { params });
}

  revoquerLienInvitation(role: RoleEquipe): Observable<void> {
    const params = new HttpParams().set('role', role);
    return this.http.delete<void>(`${this.apiUrl}/share-link`, { params });
  }
}