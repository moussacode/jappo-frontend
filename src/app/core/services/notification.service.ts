import { Injectable, signal, computed } from '@angular/core';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { WebSocketService, WebSocketEvent } from './websocket.service';

/**
 * Service de notifications temps réel pour JAPPO.
 *
 * Responsabilités :
 * - Recevoir les événements WebSocket
 * - Les convertir en notifications utilisateur
 * - Gérer l'état lu/non lu
 * - Fournir un compteur de notifications non lues
 * - Permettre de marquer comme lu/supprimer
 * - Gérer la déduplication des notifications
 * - Fournir les routes de navigation
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private wsService = inject(WebSocketService);
  private router = inject(Router);

  // État des notifications avec signals
  private notifications = signal<Notification[]>([]);
  private unreadCount = computed(() => {
    return this.notifications().filter(n => !n.lu).length;
  });

  // Set pour la déduplication basée sur type + resourceId + timestamp
  private notificationSignatures = new Set<string>();

  constructor() {
    this.initializeWebSocketListeners();
  }

  /**
   * Initialiser les écouteurs WebSocket.
   */
  private initializeWebSocketListeners(): void {
    // Écouter tous les événements WebSocket et les convertir en notifications
    this.wsService.events.subscribe((event: WebSocketEvent) => {
      this.handleWebSocketEvent(event);
    });
  }

  /**
   * Convertir un événement WebSocket en notification.
   */
  private handleWebSocketEvent(event: WebSocketEvent): void {
    const notification = this.createNotificationFromEvent(event);

    if (notification) {
      // Vérifier la déduplication
      const signature = this.createNotificationSignature(notification);
      if (this.notificationSignatures.has(signature)) {
        console.log('[NotificationService] Notification dupliquée ignorée:', signature);
        return;
      }

      this.notificationSignatures.add(signature);
      this.addNotification(notification);

      // Nettoyer les signatures anciennes (plus de 1000 notifications)
      if (this.notificationSignatures.size > 1000) {
        this.notificationSignatures.clear();
      }
    }
  }

  /**
   * Créer une signature unique pour la déduplication.
   */
  private createNotificationSignature(notification: Notification): string {
    const resourceId = notification.metadata?.['livrableId'] ||
                      notification.metadata?.['missionId'] ||
                      notification.metadata?.['projetId'] ||
                      notification.metadata?.['cohorteId'] ||
                      notification.metadata?.['reunionId'] ||
                      'unknown';
    return `${notification.type}-${resourceId}-${notification.dateCreation}`;
  }

  /**
   * Créer une notification à partir d'un événement WebSocket.
   */
  private createNotificationFromEvent(event: WebSocketEvent): Notification | null {
    const now = new Date().toISOString();

    switch (event.type) {
      case 'LIVRABLE_SOUMIS':
        return {
          id: crypto.randomUUID(),
          type: 'LIVRABLE_SOUMIS',
          titre: 'Nouveau livrable soumis',
          message: `${event.data['message'] || 'Un livrable a été soumis'}`,
          lu: false,
          dateCreation: now,
          route: this.getRouteForLivrable(event.data),
          metadata: event.data
        };

      case 'LIVRABLE_VALIDE':
        return {
          id: crypto.randomUUID(),
          type: 'LIVRABLE_VALIDE',
          titre: 'Livrable validé',
          message: event.data['message'] || 'Votre livrable a été validé',
          lu: false,
          dateCreation: now,
          route: this.getRouteForLivrable(event.data),
          metadata: event.data
        };

      case 'LIVRABLE_REJETE':
        return {
          id: crypto.randomUUID(),
          type: 'LIVRABLE_REJETE',
          titre: 'Livrable à corriger',
          message: event.data['message'] || 'Votre livrable nécessite des corrections',
          lu: false,
          dateCreation: now,
          route: this.getRouteForLivrable(event.data),
          metadata: event.data
        };

      case 'MISSION_CREEE':
        return {
          id: crypto.randomUUID(),
          type: 'MISSION_CREEE',
          titre: 'Nouvelle mission',
          message: 'Une nouvelle mission vous a été attribuée',
          lu: false,
          dateCreation: now,
          route: this.getRouteForMission(event.data),
          metadata: event.data
        };

      case 'MISSION_MODIFIEE':
        return {
          id: crypto.randomUUID(),
          type: 'MISSION_MODIFIEE',
          titre: 'Mission modifiée',
          message: 'Une mission a été modifiée',
          lu: false,
          dateCreation: now,
          route: this.getRouteForMission(event.data),
          metadata: event.data
        };

      case 'REUNION_CREEE':
        return {
          id: crypto.randomUUID(),
          type: 'REUNION_CREEE',
          titre: 'Nouvelle réunion',
          message: 'Une nouvelle réunion a été créée',
          lu: false,
          dateCreation: now,
          route: this.getRouteForReunion(event.data),
          metadata: event.data
        };

      case 'PROJET_CREE':
        return {
          id: crypto.randomUUID(),
          type: 'PROJET_CREE',
          titre: 'Nouveau projet',
          message: 'Un nouveau projet a été créé',
          lu: false,
          dateCreation: now,
          route: this.getRouteForProjet(event.data),
          metadata: event.data
        };

      case 'COHORTE_CREEE':
        return {
          id: crypto.randomUUID(),
          type: 'COHORTE_CREEE',
          titre: 'Nouvelle cohorte',
          message: 'Une nouvelle cohorte a été créée',
          lu: false,
          dateCreation: now,
          route: this.getRouteForCohorte(event.data),
          metadata: event.data
        };

      default:
        // Ignorer les événements qui ne génèrent pas de notifications
        return null;
    }
  }

  /**
   * Obtenir la route pour un livrable.
   */
  private getRouteForLivrable(data: any): string[] | null {
    const missionId = data['missionId'] || data['missionProjetId'];
    if (missionId) {
      return ['/incubateur/missions', missionId];
    }
    return null;
  }

  /**
   * Obtenir la route pour une mission.
   */
  private getRouteForMission(data: any): string[] | null {
    const missionId = data['missionId'];
    if (missionId) {
      return ['/incubateur/missions', missionId];
    }
    return null;
  }

  /**
   * Obtenir la route pour une réunion.
   */
  private getRouteForReunion(data: any): string[] | null {
    // Pas encore de route de réunion dans le routing actuel
    return null;
  }

  /**
   * Obtenir la route pour un projet.
   */
  private getRouteForProjet(data: any): string[] | null {
    const projetId = data['projetId'];
    if (projetId) {
      return ['/incubateur/projets', projetId];
    }
    return null;
  }

  /**
   * Obtenir la route pour une cohorte.
   */
  private getRouteForCohorte(data: any): string[] | null {
    const cohorteId = data['cohorteId'];
    if (cohorteId) {
      return ['/incubateur/cohortes', cohorteId];
    }
    return null;
  }

  /**
   * Ajouter une notification.
   */
  private addNotification(notification: Notification): void {
    this.notifications.update(current => [notification, ...current]);
  }

  /**
   * Marquer une notification comme lue et naviguer vers la ressource.
   */
  handleNotificationClick(notification: Notification): void {
    this.markAsRead(notification.id);

    if (notification.route) {
      this.router.navigate(notification.route);
    }
  }

  /**
   * Marquer une notification comme lue.
   */
  markAsRead(notificationId: string): void {
    this.notifications.update(current =>
      current.map(n => (n.id === notificationId ? { ...n, lu: true } : n))
    );
  }

  /**
   * Marquer toutes les notifications comme lues.
   */
  markAllAsRead(): void {
    this.notifications.update(current => current.map(n => ({ ...n, lu: true })));
  }

  /**
   * Supprimer une notification.
   */
  deleteNotification(notificationId: string): void {
    this.notifications.update(current => current.filter(n => n.id !== notificationId));
  }

  /**
   * Obtenir le signal des notifications.
   */
  getNotifications() {
    return this.notifications;
  }

  /**
   * Obtenir le signal du compteur de notifications non lues.
   */
  getUnreadCount() {
    return this.unreadCount;
  }
}

/**
 * Structure d'une notification.
 */
export interface Notification {
  id: string;
  type: string;
  titre: string;
  message: string;
  lu: boolean;
  dateCreation: string;
  route: string[] | null;
  metadata: Record<string, any>;
}
