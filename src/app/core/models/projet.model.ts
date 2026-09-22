export type StatutProjet =
  | 'ACTIF'
  | 'DIPLOME'
  | 'ABANDONNE';

export interface Projet {
  id: string;
  nom: string;
  description?: string;
  secteur?: string;
  scoreMaturite?: number;
  statut: StatutProjet | string;

  entrepreneurId?: string;
  nomEntrepreneur?: string;

  cohorteId?: string;
  nomCohorte?: string;

  structureId?: string;

  dateCreation?: string;

  archive?: boolean;
  dateArchivage?: string;

  // Statistiques calculées côté backend
  nombreMissionsTotal?: number;
  nombreMissionsValidees?: number;

  // Parcours et phase actuelle
  parcoursId?: string;
  nomParcours?: string;
  phaseId?: string;
  nomPhase?: string;
  phaseOrdre?: number;
}

export interface CreateProjetRequest {
  nom: string;
  description?: string;
  secteur?: string;
  cohorteId?: string;
  entrepreneurId?: string;
}

export interface UpdateProjetRequest {
  nom?: string;
  description?: string;
  secteur?: string;
}

export interface PromouvoirProjetRequest {
  cohorteCibleId: string;
  raison?: string;
  forcer?: boolean;
}

export interface PromotionGroupeeRequest {
  projetIds: string[];
  cohorteCibleId: string;
  raison?: string;
  forcer?: boolean;
}

export interface PromotionGroupeeResultat {
  projetId: string;
  nomProjet: string;
  succes: boolean;
  message: string;
  missionsNonValidees: string[];
}

export interface ParticipationCohorteResponse {
  id: string;

  cohorteId: string;
  nomCohorte: string;

  parcoursId: string;
  nomParcours: string;

  phaseId: string;
  nomPhase: string;
  phaseOrdre: number;

  dateEntree: string;
  dateSortie?: string;

  motifSortie?: 'PROMU' | 'RETIRE' | 'TERMINE';

  raison?: string;

  active: boolean;
}