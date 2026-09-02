export type StatutMission = 'a_faire' | 'en_cours' | 'en_retard' | 'terminee';

export interface Mission {
  id: string;
  titre: string;
  description?: string;
  categorie?: string;
  dateEcheance?: string;
  statut: StatutMission;
  dateCreation: string;
  assigneePar: string;
  cibleProjetId?: string | null;
  cibleCohorteId?: string | null;
}