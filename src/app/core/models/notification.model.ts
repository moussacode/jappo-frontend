export interface Notification {
  id: string;
  utilisateurId: string;
  type: string;
  message: string;
  lu: boolean;
  dateCreation: string;
  entiteType?: 'mission' | 'livrable' | 'document_genere' | 'note_coach';
  entiteId?: string;
}