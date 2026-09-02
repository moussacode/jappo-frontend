export interface ConversationIA {
  id: string;
  projetId: string;
  contexte?: string;
  dateCreation: string;
}

export interface MessageIA {
  id: string;
  conversationId: string;
  auteur: 'entrepreneur' | 'assistant';
  contenu: string;
  dateEnvoi: string;
  model?: string;
}