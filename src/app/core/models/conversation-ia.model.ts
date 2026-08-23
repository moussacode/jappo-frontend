export interface ConversationIA {
  id: string;
  entrepreneurId: string;
  contexte?: string;
  dateCreation: string;
}

export interface MessageIA {
  id: string;
  conversationId: string;
  auteur: 'entrepreneur' | 'assistant';
  contenu: string;
  dateEnvoi: string;
}