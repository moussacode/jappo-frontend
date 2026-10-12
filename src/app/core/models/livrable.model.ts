export type TypeLivrable = 'FICHIER' | 'LIEN' | 'TEXTE' | 'TEMPLATE';

export type StatutLivrable = 'EN_ATTENTE' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';

export interface LivrableVersionResponse {
  id: string;
  numeroVersion: number;
  nom: string;
  url: string;
  contenu?: string | null;
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
  contenu?: string | null;
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
  dateValidation?: string;       // ISO LocalDateTime
  missionProjetId: string;
  livrableAttenduId?: string | null;
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
  contenu?: string;
  typePiece?: TypeLivrable;
  missionProjetId: string;
  livrableAttenduId?: string;
}

export interface SoumettreVersionRequest {
  nom?: string;
  url: string;
  contenu?: string;
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