import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService implements OnDestroy {

  private client: Client;

  private connectionState$ =
    new BehaviorSubject<WebSocketState>('DISCONNECTED');

  private events$ =
    new Subject<WebSocketEvent>();

  /**
   * Destinations auxquelles nous sommes abonnés.
   *
   * Exemple :
   * /topic/structure/xxx
   * /topic/user/xxx
   */
  private destinations = new Set<string>();

  private stompSubscriptions =
    new Map<string, StompSubscription>();

  constructor() {

    this.client = new Client({

      /**
       * IMPORTANT :
       * Le backend utilise .withSockJS()
       *
       * On utilise donc webSocketFactory
       * et non brokerURL.
       */
      webSocketFactory: () => {
        return new SockJS('http://localhost:8080/ws');
      },

      reconnectDelay: 5000,

      debug: (message: string) => {
        console.log('[STOMP]', message);
      },

      onConnect: () => {

        console.log('[WebSocket] STOMP connecté');

        this.connectionState$.next('CONNECTED');

        this.resubscribeAll();
      },

      onDisconnect: () => {

        console.log('[WebSocket] STOMP déconnecté');

        this.connectionState$.next('DISCONNECTED');
      },

      onStompError: (frame) => {

        console.error(
          '[WebSocket] Erreur STOMP :',
          frame.headers['message'],
          frame.body
        );

        this.connectionState$.next('ERROR');
      },

      onWebSocketError: (error) => {

        console.error(
          '[WebSocket] Erreur WebSocket :',
          error
        );

        this.connectionState$.next('ERROR');
      }
    });

    this.connectionState$.next('CONNECTING');

    this.client.activate();
  }

  /**
   * État de la connexion.
   */
  get connectionState(): Observable<WebSocketState> {
    return this.connectionState$.asObservable();
  }

  /**
   * Tous les événements reçus.
   */
  get events(): Observable<WebSocketEvent> {
    return this.events$.asObservable();
  }

  /**
   * Écouter un type d'événement précis.
   */
  onEvent(
    type: WebSocketEventType
  ): Observable<WebSocketEvent> {

    return this.events$.pipe(
      filter(event => event.type === type)
    );
  }

  /**
   * S'abonner aux événements d'une structure.
   */
  subscribeToStructure(
    structureId: string
  ): void {

    this.subscribeToDestination(
      `/topic/structure/${structureId}`
    );
  }

  /**
   * S'abonner aux événements privés d'un utilisateur.
   */
  subscribeToUser(
    userId: string
  ): void {

    this.subscribeToDestination(
      `/topic/user/${userId}`
    );
  }

  /**
   * S'abonner à une cohorte.
   */
  subscribeToCohorte(
    structureId: string,
    cohorteId: string
  ): void {

    this.subscribeToDestination(
      `/topic/structure/${structureId}/cohorte/${cohorteId}`
    );
  }

  /**
   * Abonnement STOMP réel.
   * Public pour permettre les tests depuis le composant de diagnostic.
   */
  subscribeToDestination(
    destination: string
  ): void {

    /**
     * On mémorise toujours la destination.
     *
     * Comme ça, après une reconnexion,
     * on pourra automatiquement se réabonner.
     */
    this.destinations.add(destination);

    /**
     * Si STOMP n'est pas encore connecté,
     * on attend onConnect().
     */
    if (!this.client.connected) {

      console.log(
        '[WebSocket] Abonnement en attente :',
        destination
      );

      return;
    }

    /**
     * Éviter les doubles abonnements.
     */
    if (this.stompSubscriptions.has(destination)) {
      return;
    }

    const subscription =
      this.client.subscribe(
        destination,
        (message: IMessage) => {

          try {

            const event =
              JSON.parse(message.body) as WebSocketEvent;

            console.log(
              '[WebSocket] Événement reçu :',
              event
            );

            this.events$.next(event);

          } catch (error) {

            console.error(
              '[WebSocket] Erreur de parsing :',
              error
            );

            console.error(
              '[WebSocket] Message reçu :',
              message.body
            );
          }
        }
      );

    this.stompSubscriptions.set(
      destination,
      subscription
    );

    console.log(
      '[WebSocket] Abonné à :',
      destination
    );
  }

  /**
   * Réabonnement après reconnexion.
   */
  private resubscribeAll(): void {

    console.log(
      '[WebSocket] Réabonnement aux destinations...'
    );

    this.stompSubscriptions.forEach(
      subscription => subscription.unsubscribe()
    );

    this.stompSubscriptions.clear();

    this.destinations.forEach(
      destination => {
        this.subscribeToDestination(destination);
      }
    );
  }

  /**
   * Envoyer un message à une destination STOMP.
   */
  publish(destination: string, body: any): void {
    if (!this.client.connected) {
      console.error('[WebSocket] Impossible d\'envoyer : non connecté');
      return;
    }

    this.client.publish({
      destination: destination,
      body: JSON.stringify(body)
    });

    console.log('[WebSocket] Message envoyé à :', destination);
  }

  /**
   * Se désabonner.
   */
  unsubscribeFrom(
    channel: string,
    id: string
  ): void {

    const destination =
      `/topic/${channel}/${id}`;

    const subscription =
      this.stompSubscriptions.get(destination);

    if (subscription) {

      subscription.unsubscribe();

      this.stompSubscriptions.delete(
        destination
      );
    }

    this.destinations.delete(
      destination
    );

    console.log(
      '[WebSocket] Désabonné de :',
      destination
    );
  }

  /**
   * Fermer proprement la connexion.
   */
  disconnect(): void {

    this.stompSubscriptions.forEach(
      subscription => subscription.unsubscribe()
    );

    this.stompSubscriptions.clear();

    this.destinations.clear();

    this.client.deactivate();

    this.connectionState$.next(
      'DISCONNECTED'
    );
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}


/**
 * États de connexion.
 */
export type WebSocketState =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'RECONNECTING'
  | 'ERROR';


/**
 * Types d'événements JAPPO.
 */
export type WebSocketEventType =
  | 'LIVRABLE_SOUMIS'
  | 'LIVRABLE_VALIDE'
  | 'LIVRABLE_REJETE'
  | 'MISSION_CREEE'
  | 'MISSION_MODIFIEE'
  | 'MISSION_ARCHIVEE'
  | 'PROJET_CREE'
  | 'PROJET_MODIFIE'
  | 'PROJET_ARCHIVE'
  | 'COHORTE_CREEE'
  | 'COHORTE_MODIFIEE'
  | 'COHORTE_ARCHIVEE'
  | 'ENTREPRENEUR_INVITE'
  | 'ENTREPRENEUR_ACCEPTE'
  | 'REUNION_CREEE'
  | 'REUNION_MODIFIEE';


/**
 * Structure d'un événement reçu.
 */
export interface WebSocketEvent {

  type: WebSocketEventType;

  structureId?: string | null;

  data: Record<string, any>;

  timestamp: string;
}