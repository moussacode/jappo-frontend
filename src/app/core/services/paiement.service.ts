import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InitiationPaiementResponse {
  redirectUrl: string;
}

export interface ConfirmationPaiementResponse {
  message: string;
  statut: 'EN_ATTENTE' | 'SUCCES' | 'ECHEC' | 'ANNULE';
  plan: 'FREEMIUM' | 'PREMIUM';
  montant: number;
  dateConfirmation: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PaiementService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl = 'http://localhost:8080/api';

  initierUpgradePremium(
    structureId: string
  ): Observable<InitiationPaiementResponse> {

    return this.http.post<InitiationPaiementResponse>(
      `${this.apiUrl}/structures/${structureId}/abonnement/upgrade`,
      {}
    );
  }

  confirmerPaiement(
    token: string
  ): Observable<ConfirmationPaiementResponse> {

    const params = new HttpParams()
      .set('token', token);

    return this.http.get<ConfirmationPaiementResponse>(
      `${this.apiUrl}/paiements/paydunya/confirmer`,
      { params }
    );
  }
}