/**
 * Périmètre métier sélectionné par le coach dans l'interface Assistant IA.
 * Tous les champs sont optionnels — {} = aucun contexte = structure globale.
 */
export interface ConversationContexte {
  cohorteId?: string;
  projetId?: string;
  entrepreneurId?: string;
}

export interface ConversationIA {
  id: string;
  structureId: string;
  coachId: string;
  contexte: ConversationContexte;
  titre?: string;
  archivee: boolean;
  dateCreation: string;
  dateModification: string;
  dateDerniereActivite?: string;
  messages: MessageIA[];
}

export interface MessageIA {
  id: string;
  conversationId: string;
  /** COACH = message du coach humain, ASSISTANT = réponse générée par l'IA */
  auteur: 'COACH' | 'ASSISTANT';
  contenu: string;
  dateEnvoi: string;
  model?: string;
  sourcesJson?: string;
  actionsJson?: string;
  /** Actions IA parsées depuis actionsJson pour affichage dans l'UI */
  actions?: AiAction[];
}

export interface AiAction {
  id?: string;
  type: string;
  payload: any;
  requiresConfirmation?: boolean;
}

export interface CreateConversationRequest {
  contexte?: ConversationContexte;
  titre?: string;
}

export interface SendMessageRequest {
  contenu: string;
}

export interface UpdateContexteRequest {
  cohorteId?: string | null;
  projetId?: string | null;
  entrepreneurId?: string | null;
}

/** Type du contexte sélectionnable dans l'interface */
export type TypeContexte = 'COHORTE' | 'PROJET' | 'ENTREPRENEUR';

/** Item de contexte affiché sous forme de chip dans l'interface */
export interface ContexteChip {
  type: TypeContexte;
  id: string;
  label: string;
}
