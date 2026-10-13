import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from './../../environments/environment';
import { Abonnement, PlanAbonnement, UsageAbonnement } from '../models/abonnement.model';

@Injectable({ providedIn: 'root' })
export class AbonnementService {

  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/structures`;

  getAbonnement(
    structureId: string
  ): Observable<Abonnement> {
    return this.http.get<Abonnement>(
      `${this.apiUrl}/${structureId}/abonnement`
    );
  }

  /** Limites du plan effectif et consommation courante (cohortes, tokens IA du mois). */
  getUsage(
    structureId: string
  ): Observable<UsageAbonnement> {
    return this.http.get<UsageAbonnement>(
      `${this.apiUrl}/${structureId}/abonnement/usage`
    );
  }

  /** Plans proposés à la souscription (page tarifs). */
  getPlansDisponibles(): Observable<PlanAbonnement[]> {
    return this.http.get<PlanAbonnement[]>(`${environment.apiUrl}/plans`);
  }
}
