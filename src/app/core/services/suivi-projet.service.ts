import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { SuiviProjetDTO } from '../models/suivi-projet.model';

@Injectable({ providedIn: 'root' })
export class SuiviProjetService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/suivi`;

  getSuiviProjet(projetId: string): Observable<SuiviProjetDTO> {
    return this.http.get<SuiviProjetDTO>(`${this.apiUrl}/projet/${projetId}`);
  }
}
