export type TypeLivrable = 'FICHIER' | 'LIEN';

export type StatutLivrable = 'EN_ATTENTE' | 'VALIDE' | 'A_CORRIGER';

export interface LivrableResponse {
  id: string;
  nom: string;
  url: string;
  typePiece: TypeLivrable;
  statut: StatutLivrable;
  note?: number;
  commentaireCoach?: string;
  dateDepot?: string;          // ISO LocalDateTime
  missionProjetId: string;
  titreMission?: string;
  projetId: string;
  nomProjet?: string;
  structureId?: string;

  // Rétrocompatibilité UI
  dateSoumission?: string;
  statutValidation?: string;
  commentaireRevue?: string;
}

// Alias pour compatibilité dans l'application
export type Livrable = LivrableResponse;

export interface CreateLivrableRequest {
  nom: string;
  url: string;
  typePiece?: TypeLivrable;
  missionProjetId: string;
}

export interface EvaluateLivrableRequest {
  statut: StatutLivrable;
  note?: number;
  commentaireCoach?: string;
}