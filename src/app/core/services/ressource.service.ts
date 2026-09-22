import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Ressource,
  CreateRessourceRequest,
  UpdateRessourceRequest,
  PorteeRessource,
} from '../models/ressource.model';

@Injectable({ providedIn: 'root' })
export class RessourceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ressources`;

  /**
   * Récupérer toutes les ressources (actives par défaut)
   * GET /api/ressources?archivee=false
   */
  getAll(archivee = false): Observable<Ressource[]> {
    const params = new HttpParams().set('archivee', String(archivee));
    return this.http.get<Ressource[]>(this.apiUrl, { params });
  }

  /**
   * Récupérer une ressource par ID
   * GET /api/ressources/{id}
   */
  getById(id: string): Observable<Ressource> {
    return this.http.get<Ressource>(`${this.apiUrl}/${id}`);
  }

  /**
   * Ressources d'une cohorte
   * GET /api/ressources/cohorte/{cohorteId}
   */
  getByCohorte(cohorteId: string): Observable<Ressource[]> {
    return this.http.get<Ressource[]>(`${this.apiUrl}/cohorte/${cohorteId}`);
  }

  /**
   * Ressources d'une mission de cohorte
   * GET /api/ressources/mission/{missionId}
   */
  getByMission(missionId: string): Observable<Ressource[]> {
    return this.http.get<Ressource[]>(`${this.apiUrl}/mission/${missionId}`);
  }

  /**
   * Créer une ressource (lien ou URL externe)
   * POST /api/ressources
   */
  create(req: CreateRessourceRequest): Observable<Ressource> {
    return this.http.post<Ressource>(this.apiUrl, req);
  }

  /**
   * Créer une ressource avec upload de fichier
   * POST /api/ressources/upload  (multipart/form-data)
   *
   * @param file      Fichier à uploader
   * @param titre     Titre de la ressource (obligatoire)
   * @param options   Champs optionnels : description, portee, cohorteId, parcoursId, phaseId
   */
  uploadFichier(
    file: File,
    titre: string,
    options: {
      description?: string;
      portee?: PorteeRessource;
      cohorteId?: string;
      parcoursId?: string;
      phaseId?: string;
    } = {}
  ): Observable<Ressource> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('titre', titre);
    if (options.description) formData.append('description', options.description);
    if (options.portee) formData.append('portee', options.portee);
    if (options.cohorteId) formData.append('cohorteId', options.cohorteId);
    if (options.parcoursId) formData.append('parcoursId', options.parcoursId);
    if (options.phaseId) formData.append('phaseId', options.phaseId);

    return this.http.post<Ressource>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Mettre à jour une ressource
   * PUT /api/ressources/{id}
   */
  update(id: string, req: UpdateRessourceRequest): Observable<Ressource> {
    return this.http.put<Ressource>(`${this.apiUrl}/${id}`, req);
  }

  /**
   * Archiver une ressource (soft-delete)
   * PATCH /api/ressources/{id}/archiver
   */
  archiver(id: string): Observable<Ressource> {
    return this.http.patch<Ressource>(`${this.apiUrl}/${id}/archiver`, {});
  }

  /**
   * Restaurer une ressource archivée
   * PATCH /api/ressources/{id}/restaurer
   */
  restaurer(id: string): Observable<Ressource> {
    return this.http.patch<Ressource>(`${this.apiUrl}/${id}/restaurer`, {});
  }

  /**
   * Formate la taille d'un fichier en texte lisible
   */
  formatTaille(octets?: number): string {
    if (!octets) return '';
    if (octets < 1024) return `${octets} o`;
    if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(1)} Ko`;
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
  }
}
