import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../environments/environment';
import { TokenStorageService } from './token-storage.service';

export type WebSocketState = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR';

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

export interface WebSocketEvent {
  type: WebSocketEventType;
  structureId?: string | null;
  data: Record<string, any>;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private readonly tokenStorage = inject(TokenStorageService);

  private client: Client;
  private readonly connectionState$ = new BehaviorSubject<WebSocketState>('DISCONNECTED');
  private readonly events$ = new Subject<WebSocketEvent>();
  private readonly destinations = new Set<string>();
  private readonly stompSubscriptions = new Map<string, StompSubscription>();

  constructor() {
    this.client = new Client({
      webSocketFactory: () => new SockJS(`${environment.serverUrl}/ws`),
      reconnectDelay: 5000,
      // Envoi du JWT dans les headers STOMP au CONNECT
      // Le backend n'a pas de ChannelInterceptor JWT (GAP-08) mais l'envoie reste une bonne pratique
      connectHeaders: this.buildConnectHeaders(),
      onConnect: () => {
        this.connectionState$.next('CONNECTED');
        this.resubscribeAll();
      },
      onDisconnect: () => {
        this.connectionState$.next('DISCONNECTED');
      },
      onStompError: () => {
        this.connectionState$.next('ERROR');
      },
      onWebSocketError: () => {
        this.connectionState$.next('ERROR');
      },
    });

    this.connectionState$.next('CONNECTING');
    this.client.activate();
  }

  private buildConnectHeaders(): Record<string, string> {
    const token = this.tokenStorage.getToken();
    return token ? { login: 'jwt', passcode: token } : {};
  }

  get connectionState(): Observable<WebSocketState> {
    return this.connectionState$.asObservable();
  }

  get events(): Observable<WebSocketEvent> {
    return this.events$.asObservable();
  }

  onEvent(type: WebSocketEventType): Observable<WebSocketEvent> {
    return this.events$.pipe(filter(event => event.type === type));
  }

  subscribeToStructure(structureId: string): void {
    this.subscribeToDestination(`/topic/structure/${structureId}`);
  }

  subscribeToUser(userId: string): void {
    this.subscribeToDestination(`/topic/user/${userId}`);
  }

  subscribeToCohorte(structureId: string, cohorteId: string): void {
    this.subscribeToDestination(`/topic/structure/${structureId}/cohorte/${cohorteId}`);
  }

  subscribeToDestination(destination: string): void {
    this.destinations.add(destination);
    if (!this.client.connected) return;
    if (this.stompSubscriptions.has(destination)) return;

    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      try {
        const event = JSON.parse(message.body) as WebSocketEvent;
        this.events$.next(event);
      } catch { /* message non-JSON ignoré */ }
    });

    this.stompSubscriptions.set(destination, subscription);
  }

  private resubscribeAll(): void {
    this.stompSubscriptions.forEach(s => s.unsubscribe());
    this.stompSubscriptions.clear();
    this.destinations.forEach(d => this.subscribeToDestination(d));
  }

  publish(destination: string, body: unknown): void {
    if (!this.client.connected) return;
    this.client.publish({ destination, body: JSON.stringify(body) });
  }

  unsubscribeFrom(channel: string, id: string): void {
    const destination = `/topic/${channel}/${id}`;
    this.stompSubscriptions.get(destination)?.unsubscribe();
    this.stompSubscriptions.delete(destination);
    this.destinations.delete(destination);
  }

  disconnect(): void {
    this.stompSubscriptions.forEach(s => s.unsubscribe());
    this.stompSubscriptions.clear();
    this.destinations.clear();
    this.client.deactivate();
    this.connectionState$.next('DISCONNECTED');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
