import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import {
  ConversationIA,
  MessageIA,
  CreateConversationRequest,
  SendMessageRequest,
  UpdateContexteRequest,
} from '../models/conversation-ia.model';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/conversations`;

  /**
   * Créer une nouvelle conversation.
   * POST /api/conversations
   * Le contexte est optionnel — {} = aucun contexte = structure globale.
   */
  createConversation(request?: CreateConversationRequest): Observable<ConversationIA> {
    return this.http.post<ConversationIA>(this.apiUrl, request ?? { contexte: {} });
  }

  /**
   * Lister toutes les conversations du coach pour la structure active.
   * GET /api/conversations
   */
  listConversations(): Observable<ConversationIA[]> {
    return this.http.get<ConversationIA[]>(this.apiUrl);
  }

  /**
   * Récupérer une conversation avec ses messages et son contexte.
   * GET /api/conversations/:id
   */
  getConversation(conversationId: string): Observable<ConversationIA> {
    return this.http.get<ConversationIA>(`${this.apiUrl}/${conversationId}`);
  }

  /**
   * Envoyer un message et obtenir la réponse de l'Assistant IA.
   * POST /api/conversations/:id/messages
   * Retourne [messageCoach, messageAssistant].
   */
  sendMessage(conversationId: string, contenu: string): Observable<MessageIA[]> {
    const body: SendMessageRequest = { contenu };
    return this.http.post<MessageIA[]>(`${this.apiUrl}/${conversationId}/messages`, body);
  }

  /**
   * Mettre à jour le périmètre métier sélectionné par le coach.
   * PATCH /api/conversations/:id/contexte
   */
  updateContexte(conversationId: string, request: UpdateContexteRequest): Observable<ConversationIA> {
    return this.http.patch<ConversationIA>(`${this.apiUrl}/${conversationId}/contexte`, request);
  }

  /**
   * Renommer une conversation.
   * PATCH /api/conversations/:id/titre
   */
  renameConversation(conversationId: string, titre: string): Observable<ConversationIA> {
    return this.http.patch<ConversationIA>(`${this.apiUrl}/${conversationId}/titre`, { titre });
  }

  /**
   * Archiver une conversation.
   * PATCH /api/conversations/:id/archiver
   */
  archiveConversation(conversationId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${conversationId}/archiver`, {});
  }

  /**
   * Restaurer une conversation archivée.
   * PATCH /api/conversations/:id/restaurer
   */
  restaurerConversation(conversationId: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${conversationId}/restaurer`, {});
  }

  /**
   * Supprimer définitivement une conversation.
   * DELETE /api/conversations/:id
   */
  deleteConversation(conversationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${conversationId}`);
  }

  /**
   * Lister les conversations archivées.
   * GET /api/conversations/archivees
   */
  listArchivedConversations(): Observable<ConversationIA[]> {
    return this.http.get<ConversationIA[]>(`${this.apiUrl}/archivees`);
  }
}
