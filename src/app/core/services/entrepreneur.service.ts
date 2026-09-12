import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { Entrepreneur } from '../models/entrepreneur.model';

export interface InvitationResultResponse {
  invites: string[];
  dejaMembres: string[];
  totalEnvoyes: number;
}

export interface InviterEntrepreneursPayload {
  emails: string[];
  cohorteId?: string;
}
export interface EntrepreneurResponse {
  id: string;
  prenom?: string;
  nom?: string;
  email: string;
  cohorteId?: string;
  nomCohorte?: string;
  statutInvitation: 'ACTIF' | 'EN_ATTENTE' | string;
  dateInvitation?: string;
}

@Injectable({ providedIn: 'root' })
export class EntrepreneurService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;


  /**
   * Récupérer la liste des entrepreneurs avec leur statut d'invitation (DTO)
   * GET /api/users/entrepreneurs
   */
  getEntrepreneurs(): Observable<EntrepreneurResponse[]> {
    return this.http.get<EntrepreneurResponse[]>(`${this.apiUrl}/entrepreneurs`);
  }

  /**
   * Récupérer la liste des entrepreneurs de la structure
   * GET /api/users/entrepreneurs
   */
  getAll(): Observable<Entrepreneur[]> {
    return this.http.get<Entrepreneur[]>(`${this.apiUrl}/entrepreneurs`);
  }

  /**
   * Récupérer les détails d'un entrepreneur par ID
   * GET /api/users/{id}
   */
  getById(id: string): Observable<EntrepreneurResponse> {
    return this.http.get<EntrepreneurResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Mettre à jour le profil d'un entrepreneur
   * PATCH /api/users/{id}
   */
  updateProfil(id: string, changements: Partial<Entrepreneur>): Observable<Entrepreneur> {
    return this.http.patch<Entrepreneur>(`${this.apiUrl}/${id}`, changements);
  }

  /**
   * Envoyer une invitation à un ou plusieurs entrepreneurs
   * POST /api/users/inviter
   */

inviterMultiple(payload: InviterEntrepreneursPayload): Observable<InvitationResultResponse> {
  return this.http.post<InvitationResultResponse>(`${this.apiUrl}/inviter`, payload);
}
}