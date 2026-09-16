export type AiActionType = 'CREATE_COHORTE' | 'CREATE_MISSION' | 'UPDATE_PROJET' | 'CREATE_PROJET' | 'ARCHIVE_PROJET' | 'RESTORE_PROJET';
export type AiActionStatus = 'EN_ATTENTE' | 'CONFIRMEE' | 'REJETEE';

export interface AiAction {
  id: string;
  messageId: string;
  type: AiActionType;
  payloadJson: string;
  statut: AiActionStatus;
  dateCreation: string;
  dateTraitement?: string;
  traiteParId?: string;
  traiteParNom?: string;
  erreurExecution?: string;
}

export interface AiActionPayload {
  [key: string]: any;
}
