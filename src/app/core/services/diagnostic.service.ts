import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { DiagnosticOnboarding, SoumettreDiagnosticRequest } from '../models/diagnostic.model';

@Injectable({
  providedIn: 'root',
})
export class DiagnosticService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/diagnostics`;

  /**
   * Soumettre le diagnostic d'accueil suite à une invitation
   * POST /api/diagnostics/onboarding
   */
  soumettreDiagnostic(request: SoumettreDiagnosticRequest): Observable<DiagnosticOnboarding> {
    return this.http.post<DiagnosticOnboarding>(`${this.apiUrl}/onboarding`, request);
  }

  /**
   * Récupérer le diagnostic réalisé par un entrepreneur
   * GET /api/diagnostics/entrepreneur/:entrepreneurId
   */
  getByEntrepreneur(entrepreneurId: string): Observable<DiagnosticOnboarding> {
    return this.http.get<DiagnosticOnboarding>(`${this.apiUrl}/entrepreneur/${entrepreneurId}`);
  }
}