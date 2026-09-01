import { Injectable } from '@angular/core';
import { Observable, of, delay, tap } from 'rxjs';
import { ConversationIA, MessageIA } from '../models/conversation-ia.model';
import { MOCK_CONVERSATIONS, MOCK_MESSAGES } from '../mocks/conversation.mock';

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private conversations = [...MOCK_CONVERSATIONS];
  private messages = [...MOCK_MESSAGES];

  getOrCreate(entrepreneurId: string): Observable<ConversationIA> {
    // TODO backend réel : this.http.get<ConversationIA>(`/api/conversations?entrepreneurId=${entrepreneurId}`)
    let conv = this.conversations.find((c) => c.entrepreneurId === entrepreneurId);
    if (!conv) {
      conv = { id: crypto.randomUUID(), entrepreneurId, dateCreation: new Date().toISOString() };
      this.conversations.push(conv);
    }
    return of(conv).pipe(delay(200));
  }

  getMessages(conversationId: string): Observable<MessageIA[]> {
    return of(this.messages.filter((m) => m.conversationId === conversationId)).pipe(delay(200));
  }

  sendMessage(conversationId: string, contenu: string,model: string): Observable<MessageIA> {
    // TODO backend réel : this.http.post<MessageIA>(`/api/conversations/${conversationId}/messages`, { contenu })
    const messageUtilisateur: MessageIA = {
      id: crypto.randomUUID(),
      conversationId,
      auteur: 'entrepreneur',
      contenu,
      dateEnvoi: new Date().toISOString(),
      model,
    };
    this.messages.push(messageUtilisateur);

    // Réponse IA simulée — à remplacer par l'appel réel au service IA
    const reponseAssistant: MessageIA = {
      id: crypto.randomUUID(),
      conversationId,
      auteur: 'assistant',
      contenu: "C'est noté - dès que le vrai service IA sera connecté, je te répondrai avec une vraie suggestion contextualisée à ton projet.",
      dateEnvoi: new Date().toISOString(),
      model,
    };
    this.messages.push(reponseAssistant);

    return of(reponseAssistant).pipe(delay(600));
  }
}