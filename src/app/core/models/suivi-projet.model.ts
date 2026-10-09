export interface EcheanceDTO {
  missionId: string;
  titreMission: string;
  dateLimite: string; // ISO datetime
  priorite: string; // BASSE | MOYENNE | HAUTE | URGENTE
}

export interface HistoriqueProgressionDTO {
  id: string;
  dateEntree: string; // ISO datetime
  etapeEntree?: string;
  etapeSortie?: string;
  effectuePar?: string;
}

export interface SuiviProjetDTO {
  // Projet
  projetId: string;
  nomProjet: string;
  secteur?: string;

  // Entrepreneur
  entrepreneurId: string;
  nomEntrepreneur: string;

  // Programme actuel
  programmeId?: string;
  nomProgramme?: string;

  // Parcours actuel
  parcoursId?: string;
  nomParcours?: string;

  // Phase actuelle
  phaseId?: string;
  nomPhase?: string;

  // Étape actuelle
  etapeId?: string;
  nomEtape?: string;

  // Progression
  statutProgression?: string; // EN_COURS | EN_PAUSE | TERMINE | ABANDONNE
  pourcentageAvancement?: number;
  dateDebutProgression?: string; // ISO datetime
  dateDerniereMajProgression?: string; // ISO datetime
  dateFinProgression?: string; // ISO datetime

  // Historique de progression
  historiqueProgression?: HistoriqueProgressionDTO[];

  // Missions
  missionsEnCours: number;
  missionsEnRetard: number;
  missionsTerminees: number;
  missionsTotal: number;

  // Prochaines échéances
  prochainesEcheances: EcheanceDTO[];

  // Livrables
  livrablesEnAttente: number;
  livrablesRefuses: number;
  livrablesValides: number;
  livrablesAttendusTotal: number;
  livrablesTotal: number;

  // Réunions
  derniereReunion?: string; // ISO datetime
  prochaineReunion?: string; // ISO datetime
  derniereReunionObjectif?: string;
  derniereReunionCompteRendu?: string;
  derniereReunionDecisions?: string;
  prochaineReunionObjectif?: string;

  // Cohorte
  cohorteId?: string;
  nomCohorte?: string;
}
