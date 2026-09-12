import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { ConversationIA, MessageIA } from '../models/conversation-ia.model';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/conversations`;

  /**
   * Récupérer ou créer automatiquement la conversation IA rattachée à un projet
   * GET /api/conversations/projet/:projetId
   */
  getOrCreate(projetId: string): Observable<ConversationIA> {
    return this.http.get<ConversationIA>(`${this.apiUrl}/projet/${projetId}`);
  }

  /**
   * Récupérer la liste des messages d'une conversation
   * GET /api/conversations/:conversationId/messages
   */
  getMessages(conversationId: string): Observable<MessageIA[]> {
    return this.http.get<MessageIA[]>(`${this.apiUrl}/${conversationId}/messages`);
  }

  /**
   * Envoyer un nouveau message à l'assistant IA
   * POST /api/conversations/:conversationId/messages
   */
  sendMessage(conversationId: string, contenu: string): Observable<MessageIA> {
    return this.http.post<MessageIA>(`${this.apiUrl}/${conversationId}/messages`, {
      contenu
    });
  }
}