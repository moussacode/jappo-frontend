export type StatutValidation =
  | 'en_attente'
  | 'en_revue'
  | 'valide'
  | 'rejete';

export type TypeLivrableItem = 'fichier' | 'lien';

export interface LivrableItem {
  id: string;
  type: TypeLivrableItem;
  titre: string;
  valeur: string;
  taille?: string;
}

export interface Livrable {
  id: string;
  missionId: string;
  projetId: string;
  items: LivrableItem[];
  noteEntrepreneur?: string;
  dateSoumission: string;
  statutValidation: StatutValidation;
  commentaireRevue?: string;
}