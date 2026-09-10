import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AbonnementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/abonnements`;

  getAbonnementActuel(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/me`);
  }
}