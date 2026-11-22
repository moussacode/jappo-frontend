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

activerPremium(id: string): Observable<void> {
  return this.http.patch<void>(
    `${this.apiUrl}/structures/${id}/premium`,
    {}
  );
}

forcerFreemium(id: string): Observable<void> {
  return this.http.patch<void>(
    `${this.apiUrl}/structures/${id}/freemium`,
    {}
  );
}
}