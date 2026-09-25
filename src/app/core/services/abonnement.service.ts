import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from './../../environments/environment';
import { Abonnement } from '../models/abonnement.model';

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
}