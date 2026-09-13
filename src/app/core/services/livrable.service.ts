import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import {
  LivrableResponse,
  CreateLivrableRequest,
  EvaluateLivrableRequest,
} from '../models/livrable.model';

export interface UploadFichierResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = `${environment.apiUrl}/livrables`;
  /** * Upload d'un fichier physique. * * Le backend reçoit le fichier en multipart/form-data * et retourne l'URL où le fichier a été stocké. */ uploaderFichier(
    file: File,
  ): Observable<UploadFichierResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadFichierResponse>(`${this.apiUrl}/upload`, formData);
  }

  /** * Soumettre un nouveau livrable pour une mission. */ 
  soumettreLivrable(
    request: CreateLivrableRequest,
  ): Observable<LivrableResponse> {
    return this.http.post<LivrableResponse>(this.apiUrl, request);
  }
  /** * Récupérer tous les livrables d'une mission spécifique. */ 
  getLivrablesByMission(
    missionProjetId: string,
  ): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/mission/${missionProjetId}`);
  }
  /** * Récupérer tous les livrables d'un projet/startup. */ 
  getLivrablesByProjet(
    projetId: string,
  ): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/projet/${projetId}`);
  }
  /** * Évaluer un livrable. */ 
  evaluerLivrable(
    id: string,
    request: EvaluateLivrableRequest,
  ): Observable<LivrableResponse> {
    return this.http.patch<LivrableResponse>(`${this.apiUrl}/${id}/evaluer`, request);
  }


  ouvrirFichier(url: string): void {
  const urlComplete = url.startsWith('http') ? url : `${environment.serverUrl}${url}`;
  this.http.get(urlComplete, { responseType: 'blob' }).subscribe((blob) => {
    const objectUrl = window.URL.createObjectURL(blob);
    window.open(objectUrl, '_blank');
    // Libère la mémoire après un court délai (le temps que l'onglet charge le blob)
    setTimeout(() => window.URL.revokeObjectURL(objectUrl), 10000);
  });
}

updateLivrable(
  id: string,
  changements: Partial<Pick<LivrableResponse, 'nom' | 'url'>>,
): Observable<LivrableResponse> {
  return this.http.patch<LivrableResponse>(`${this.apiUrl}/${id}`, changements);
}

deleteLivrable(id: string): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${id}`);
}
}
