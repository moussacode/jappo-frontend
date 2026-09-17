import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WebSocketService, WebSocketState } from '../../../core/services/websocket.service';
import { Observable, Subscription } from 'rxjs';

/**
 * Composant de diagnostic WebSocket pour tester la connexion.
 *
 * Affiche :
 * - État de connexion
 * - Logs de connexion
 * - Boutons pour tester l'abonnement
 * - Possibilité d'envoyer un message de test
 */
@Component({
  selector: 'app-websocket-diagnostic',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-gray-100 rounded-lg">
      <h2 class="text-xl font-bold mb-4">Diagnostic WebSocket</h2>

      <!-- État de connexion -->
      <div class="mb-4">
        <span class="font-semibold">État : </span>
        <span [class]="getStateClass(connectionState())">
          {{ connectionState() }}
        </span>
      </div>

      <!-- Logs -->
      <div class="mb-4">
        <h3 class="font-semibold mb-2">Logs</h3>
        <div class="bg-gray-800 text-green-400 p-4 rounded max-h-64 overflow-y-auto font-mono text-sm">
          @for (log of logs(); track log) {
            <div>{{ log }}</div>
          }
        </div>
      </div>

      <!-- Actions de test -->
      <div class="space-y-2">
        <button
          (click)="testConnection()"
          class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Tester la connexion
        </button>

        <button
          (click)="subscribeToTestTopic()"
          class="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          S'abonner à /topic/test
        </button>

        <button
          (click)="sendTestMessage()"
          class="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
        >
          Envoyer message de test
        </button>

        <button
          (click)="clearLogs()"
          class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Effacer les logs
        </button>
      </div>

      <!-- Événements reçus -->
      <div class="mt-4">
        <h3 class="font-semibold mb-2">Événements reçus</h3>
        <div class="bg-gray-800 text-white p-4 rounded max-h-64 overflow-y-auto font-mono text-sm">
          @if (eventsReceived().length === 0) {
            <div class="text-gray-400">Aucun événement reçu</div>
          } @else {
            @for (event of eventsReceived(); track event) {
              <div class="mb-2">{{ event }}</div>
            }
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class WebsocketDiagnosticComponent implements OnInit, OnDestroy {
  private wsService = inject(WebSocketService);

  connectionState = signal<WebSocketState>('DISCONNECTED');
  logs = signal<string[]>([]);
  eventsReceived = signal<string[]>([]);

  private stateSubscription: Subscription | null = null;
  private eventsSubscription: Subscription | null = null;

  ngOnInit(): void {
    this.addLog('Initialisation du diagnostic WebSocket...');

    // S'abonner à l'état de connexion
    this.stateSubscription = this.wsService.connectionState.subscribe(state => {
      this.connectionState.set(state);
      this.addLog(`État changé : ${state}`);
    });

    // S'abonner aux événements
    this.eventsSubscription = this.wsService.events.subscribe(event => {
      const eventStr = JSON.stringify(event, null, 2);
      this.eventsReceived.update(events => [eventStr, ...events]);
      this.addLog(`Événement reçu : ${event.type}`);
    });
  }

  ngOnDestroy(): void {
    this.stateSubscription?.unsubscribe();
    this.eventsSubscription?.unsubscribe();
  }

  /**
   * Tester la connexion.
   */
  testConnection(): void {
    this.addLog('Test de connexion...');
    const state = this.wsService['connectionState$'].value;
    this.addLog(`État actuel : ${state}`);
  }

  /**
   * S'abonner au topic de test.
   */
  subscribeToTestTopic(): void {
    this.addLog('Abonnement à /topic/test...');
    // Ce topic est géré par WebSocketTestController
    this.wsService.subscribeToDestination('/topic/test');
  }

  /**
   * Envoyer un message de test.
   */
  sendTestMessage(): void {
    this.addLog('Envoi d\'un message de test à /app/test...');
    this.wsService.publish('/app/test', {
      message: 'Test depuis Angular',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Effacer les logs.
   */
  clearLogs(): void {
    this.logs.set([]);
    this.eventsReceived.set([]);
  }

  /**
   * Ajouter un log.
   */
  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    this.logs.update(logs => [`[${timestamp}] ${message}`, ...logs]);
  }

  /**
   * Obtenir la classe CSS pour l'état.
   */
  getStateClass(state: WebSocketState): string {
    switch (state) {
      case 'CONNECTED':
        return 'text-green-600 font-bold';
      case 'CONNECTING':
      case 'RECONNECTING':
        return 'text-yellow-600';
      case 'ERROR':
        return 'text-red-600 font-bold';
      default:
        return 'text-gray-600';
    }
  }
}
