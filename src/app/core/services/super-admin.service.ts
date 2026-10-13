import { PlanAbonnement, PlanAbonnementRequest } from '../models/abonnement.model';
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { SuperAdminAbonnement, SuperAdminDashboardData, SuperAdminHistoriqueAbonnement, SuperAdminStructureDetail, SuperAdminStructureList, SuperAdminTransaction } from '../models/super-admin.models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/super-admin`;

  getDashboard(): Observable<SuperAdminDashboardData> {
    return this.http.get<SuperAdminDashboardData>(
      `${this.apiUrl}/dashboard`
    );
  }


  getStructures(): Observable<SuperAdminStructureList[]> {
  return this.http.get<SuperAdminStructureList[]>(
    `${this.apiUrl}/structures`
  );
}

getStructure(id: string): Observable<SuperAdminStructureDetail> {
  return this.http.get<SuperAdminStructureDetail>(
    `${this.apiUrl}/structures/${id}`
  );
}

getStructureTransactions(
  id: string
): Observable<SuperAdminTransaction[]> {
  return this.http.get<SuperAdminTransaction[]>(
    `${this.apiUrl}/structures/${id}/transactions`
  );
}

getTransactions(): Observable<SuperAdminTransaction[]> {
  return this.http.get<SuperAdminTransaction[]>(
    `${this.apiUrl}/transactions`
  );
}


getAbonnements(): Observable<SuperAdminAbonnement[]> {
  return this.http.get<SuperAdminAbonnement[]>(
    `${this.apiUrl}/abonnements`
  );
}

getHistoriqueAbonnement(
  id: string
): Observable<SuperAdminHistoriqueAbonnement[]> {
  return this.http.get<SuperAdminHistoriqueAbonnement[]>(
    `${this.apiUrl}/structures/${id}/abonnement/historique`
  );
}

suspendreStructure(id: string): Observable<void> {
  return this.http.patch<void>(
    `${this.apiUrl}/structures/${id}/suspendre`,
    {}
  );
}

/** Attribue un plan à une structure (effet immédiat, pour la durée du plan). */
changerPlan(id: string, planId: string): Observable<void> {
  return this.http.patch<void>(
    `${this.apiUrl}/structures/${id}/plan`,
    { planId }
  );
}

// ── Plans d'abonnement ─────────────────────────────────────

getPlans(): Observable<PlanAbonnement[]> {
  return this.http.get<PlanAbonnement[]>(`${this.apiUrl}/plans`);
}

creerPlan(plan: PlanAbonnementRequest): Observable<PlanAbonnement> {
  return this.http.post<PlanAbonnement>(`${this.apiUrl}/plans`, plan);
}

modifierPlan(id: string, plan: PlanAbonnementRequest): Observable<PlanAbonnement> {
  return this.http.put<PlanAbonnement>(`${this.apiUrl}/plans/${id}`, plan);
}

activerPlan(id: string): Observable<PlanAbonnement> {
  return this.http.patch<PlanAbonnement>(`${this.apiUrl}/plans/${id}/activer`, {});
}

desactiverPlan(id: string): Observable<PlanAbonnement> {
  return this.http.patch<PlanAbonnement>(`${this.apiUrl}/plans/${id}/desactiver`, {});
}

/** Uniquement pour un plan jamais utilisé (409 sinon). */
supprimerPlan(id: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/plans/${id}`);
}
}