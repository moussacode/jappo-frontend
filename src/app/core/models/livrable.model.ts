export type TypeLivrable = 'FICHIER' | 'LIEN';

export type StatutLivrable = 'EN_ATTENTE' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';

export interface LivrableVersionResponse {
  id: string;
  numeroVersion: number;
  nom: string;
  url: string;
  typePiece: TypeLivrable;
  statut: StatutLivrable;
  note?: number;
  commentaireCoach?: string;
  motifRefus?: string;
  pointsACorriger?: string;
  ressourceRecommandee?: string;
  dateEcheanceCorrection?: string; // YYYY-MM-DD
  dateDepot?: string;             // ISO LocalDateTime
  dateEvaluation?: string;        // ISO LocalDateTime
  commentaireEntrepreneur?: string;
}

export interface LivrableSoumis {
  id: string;
  nom: string;
  url: string;
  typePiece: TypeLivrable;
  statut: StatutLivrable;
  numeroVersion?: number;
  note?: number;
  commentaireCoach?: string;
  motifRefus?: string;
  pointsACorriger?: string;
  ressourceRecommandee?: string;
  dateEcheanceCorrection?: string; // YYYY-MM-DD
  dateDepot?: string;             // ISO LocalDateTime
  dateEvaluation?: string;        // ISO LocalDateTime
  missionProjetId: string;
  titreMission?: string;
  projetId: string;
  nomProjet?: string;
  structureId?: string;
  historique?: LivrableVersionResponse[];

  // Rétrocompatibilité UI
  dateSoumission?: string;
  statutValidation?: string;
  commentaireRevue?: string;
}

export interface LivrableResponse extends LivrableSoumis {}

// Alias pour compatibilité dans l'application : modèle soumis côté backend.
export type Livrable = LivrableSoumis;

export interface CreateLivrableRequest {
  nom: string;
  url: string;
  typePiece?: TypeLivrable;
  missionProjetId: string;
}

export interface SoumettreVersionRequest {
  nom?: string;
  url: string;
  typePiece?: TypeLivrable;
  commentaireEntrepreneur?: string;
}

export interface EvaluateLivrableRequest {
  statut: StatutLivrable;
  note?: number;
  commentaireCoach?: string;
  motifRefus?: string;
  pointsACorriger?: string;
  ressourceRecommandee?: string;
  dateEcheanceCorrection?: string; // YYYY-MM-DD
}