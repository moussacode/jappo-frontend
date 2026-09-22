import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from './../../environments/environment';
import {
  LivrableResponse,
  CreateLivrableRequest,
  SoumettreVersionRequest,
  EvaluateLivrableRequest,
} from '../models/livrable.model';
import { WebSocketService } from './websocket.service';
import { StructureContextService } from './structure-context.service';

export interface UploadFichierResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class LivrableService {
  private readonly http = inject(HttpClient);
  private readonly wsService = inject(WebSocketService);
  private readonly structureContext = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl = `${environment.apiUrl}/livrables`;

  /**
   * Signal partagé : livrables de la mission actuellement affichée.
   * Les composants MissionDetail lisent ce signal au lieu de stocker le leur.
   */
  private readonly _livrables = signal<LivrableResponse[]>([]);
  readonly livrables = this._livrables.asReadonly();

  /**
   * Mission active dont on surveille les livrables.
   * Permet de filtrer les événements WebSocket pertinents.
   */
  private _activeMissionId: string | null = null;

  /**
   * Déduplication simple : type + livrableId + timestamp.
   * On garde une fenêtre glissante de 200 signatures max.
   */
  private readonly _processedEvents = new Set<string>();

  constructor() {
    this.initWebSocketListeners();
  }

  // ────────────────────────────────────────────────────────────────
  // Gestion du contexte mission actif
  // ────────────────────────────────────────────────────────────────

  /**
   * Appelé par MissionDetail lors de l'init pour déclarer la mission affichée
   * et pré-charger les livrables.
   */
  setActiveMission(missionId: string): void {
    this._activeMissionId = missionId;
    this.chargerLivrablesDeMission(missionId);
  }

  /**
   * Appelé par MissionDetail lors de la destruction pour libérer le contexte.
   */
  clearActiveMission(): void {
    this._activeMissionId = null;
    this._livrables.set([]);
  }

  /**
   * Recharge les livrables de la mission active depuis le backend.
   * Utilisé après une action locale (soumission, évaluation).
   */
  rechargerLivrablesMissionActive(): void {
    if (this._activeMissionId) {
      this.chargerLivrablesDeMission(this._activeMissionId);
    }
  }

  // ────────────────────────────────────────────────────────────────
  // WebSocket — abonnements aux événements livrables
  // ────────────────────────────────────────────────────────────────

  private initWebSocketListeners(): void {
    this.wsService.onEvent('LIVRABLE_SOUMIS')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleLivrableEvent(event.type, event.data, event.timestamp));

    this.wsService.onEvent('LIVRABLE_REJETE')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleLivrableEvent(event.type, event.data, event.timestamp));

    this.wsService.onEvent('LIVRABLE_VALIDE')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(event => this.handleLivrableEvent(event.type, event.data, event.timestamp));
  }

  private handleLivrableEvent(
    type: string,
    data: Record<string, any>,
    timestamp: string
  ): void {
    const livrableId = data['livrableId'] as string | undefined;

    if (!livrableId) {
      console.warn('[LivrableService] Événement sans livrableId ignoré', { type, data });
      return;
    }

    // Déduplication
    const signature = `${type}-${livrableId}-${timestamp}`;
    if (this._processedEvents.has(signature)) {
      console.log('[LivrableService] Événement dupliqué ignoré :', signature);
      return;
    }
    this._processedEvents.add(signature);
    if (this._processedEvents.size > 200) {
      // Nettoyer la moitié la plus ancienne (Set garde l'ordre d'insertion)
      const toDelete = [...this._processedEvents].slice(0, 100);
      toDelete.forEach(k => this._processedEvents.delete(k));
    }

    // Ne traiter que si ce livrable appartient à la mission active
    const missionProjetId = data['missionProjetId'] as string | undefined;
    if (this._activeMissionId && missionProjetId && missionProjetId !== this._activeMissionId) {
      // Le livrable appartient à une autre mission : pas notre affaire pour les données,
      // mais la notification a déjà été traitée par NotificationService.
      return;
    }

    // Si on a une mission active, on peut vérifier si ce livrable en fait partie
    if (this._activeMissionId) {
      const existeDansMission = this._livrables().some(l => l.id === livrableId);
      const apartientMissionActive = missionProjetId === this._activeMissionId;

      if (!existeDansMission && !apartientMissionActive) {
        // Livrable d'une autre mission, inutile de rafraîchir
        return;
      }

      this.refreshLivrable(livrableId);
    }
  }

  /**
   * Rafraîchit un livrable unique depuis le backend et met à jour le signal.
   *
   * Stratégie :
   * - Si le livrable existe déjà dans le signal → on le remplace
   * - Si c'est un nouveau livrable (nouvelle soumission initiale) → on l'ajoute
   */
  private refreshLivrable(livrableId: string): void {
    this.getById(livrableId).subscribe({
      next: (livrable) => {
        this._livrables.update(current => {
          const idx = current.findIndex(l => l.id === livrable.id);
          if (idx >= 0) {
            // Remplacement en place — même livrableId, version ou statut mis à jour
            const updated = [...current];
            updated[idx] = livrable;
            return updated;
          } else {
            // Nouveau livrable dans cette mission (ex: première soumission d'un autre entrepreneur)
            return [...current, livrable];
          }
        });
        console.log('[LivrableService] Signal mis à jour pour livrable :', livrableId);
      },
      error: (err) => {
        console.error('[LivrableService] Erreur lors du rafraîchissement du livrable', livrableId, err);
        // En cas d'erreur sur GET/{id}, fallback : recharger toute la mission
        if (this._activeMissionId) {
          this.chargerLivrablesDeMission(this._activeMissionId);
        }
      }
    });
  }

  private chargerLivrablesDeMission(missionId: string): void {
    this.getLivrablesByMission(missionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this._livrables.set(list || []),
        error: (err) => console.error('[LivrableService] Erreur chargement livrables mission', err),
      });
  }

  // ────────────────────────────────────────────────────────────────
  // API HTTP
  // ────────────────────────────────────────────────────────────────

  /**
   * Upload d'un fichier physique.
   */
  uploaderFichier(file: File): Observable<UploadFichierResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadFichierResponse>(`${this.apiUrl}/upload`, formData);
  }

  /**
   * Récupérer un livrable par son ID.
   */
  getById(id: string): Observable<LivrableResponse> {
    return this.http.get<LivrableResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Soumettre un nouveau livrable pour une mission (Version 1).
   */
  soumettreLivrable(request: CreateLivrableRequest): Observable<LivrableResponse> {
    return this.http.post<LivrableResponse>(this.apiUrl, request);
  }

  /**
   * Soumettre une nouvelle version (V2, V3...) pour un livrable existant en correction.
   */
  soumettreNouvelleVersion(
    id: string,
    request: SoumettreVersionRequest,
  ): Observable<LivrableResponse> {
    return this.http.post<LivrableResponse>(`${this.apiUrl}/${id}/versions`, request);
  }

  /**
   * Récupérer tous les livrables d'une mission spécifique.
   */
  getLivrablesByMission(missionProjetId: string): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/mission/${missionProjetId}`);
  }

  /**
   * Récupérer tous les livrables d'un projet/startup.
   */
  getLivrablesByProjet(projetId: string): Observable<LivrableResponse[]> {
    return this.http.get<LivrableResponse[]>(`${this.apiUrl}/projet/${projetId}`);
  }

  /**
   * Évaluer un livrable (Validation ou Demande de correction structurée).
   */
  evaluerLivrable(
    id: string,
    request: EvaluateLivrableRequest,
  ): Observable<LivrableResponse> {
    return this.http.patch<LivrableResponse>(`${this.apiUrl}/${id}/evaluer`, request);
  }

  ouvrirFichier(url: string): void {
    if (!url) return;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      window.open(url, '_blank');
      return;
    }
    const urlComplete = `${environment.serverUrl}${url}`;
    this.http.get(urlComplete, { responseType: 'blob' }).subscribe((blob) => {
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
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
