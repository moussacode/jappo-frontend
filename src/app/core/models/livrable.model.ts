export type StatutValidation = 'en_attente' | 'en_revue' | 'valide' | 'rejete';

export interface Livrable {
  id: string;
  missionId: string;
  projetId: string;
  fichierUrl?: string;
  dateSoumission: string;
  statutValidation: StatutValidation;
  commentaireRevue?: string;
}