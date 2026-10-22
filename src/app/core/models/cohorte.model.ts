export type StatutCohorte =
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'ARCHIVEE';

export interface CoachSummary {
  id: string;
  prenom?: string;
  nom?: string;
  email: string;
}

export interface Cohorte {
  id: string;
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  statut: StatutCohorte;
  parcoursId?: string;
  phaseId?: string;
  phase?: PhaseSummary;
  structureId?: string;
  coachs?: CoachSummary[];
}

export interface PhaseSummary {
  id: string;
  nom: string;
  ordre?: number;
}

export interface CreateCohorteRequest {
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  parcoursId: string;
  phaseId: string;
  programmeId?: string;
  coachIds?: string[];
}

export interface UpdateCohorteRequest {
  nom?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: StatutCohorte;
  parcoursId?: string;
  phaseId?: string;
  coachIds?: string[];
}

export interface AffecterCoachsRequest {
  coachIds: string[];
}

export interface InviterEntrepreneursRequest {
  emails: string[];
}

/** Stade d'accompagnement d'une phase (le nom de la phase reste libre). */
export type StadeAccompagnement = 'PRE_INCUBATION' | 'INCUBATION' | 'ACCELERATION' | 'POST_INCUBATION';

export const STADES_ACCOMPAGNEMENT: { value: StadeAccompagnement; label: string }[] = [
  { value: 'PRE_INCUBATION', label: 'Pré-incubation' },
  { value: 'INCUBATION', label: 'Incubation' },
  { value: 'ACCELERATION', label: 'Accélération' },
  { value: 'POST_INCUBATION', label: 'Post-incubation' },
];

export function libelleStade(stade: StadeAccompagnement | null | undefined): string | null {
  return STADES_ACCOMPAGNEMENT.find((s) => s.value === stade)?.label ?? null;
}

export interface Phase {
  id: string;
  nom: string;
  description?: string;
  ordre?: number;
  stade?: StadeAccompagnement | null;
  archive: boolean;
  dateCreation: string;
  dateModification?: string;
}

export interface ParcoursPhase extends Phase {
  ordre: number;
}

export interface Parcours {
  id: string;
  nom: string;
  description?: string;
  archive: boolean;
  dateCreation: string;
  dateModification?: string;
  programmeId?: string;
  programmeNom?: string;
  phases?: ParcoursPhase[];
}

export interface CreateParcoursRequest {
  nom: string;
  description?: string;
  programmeId?: string;
}

export interface CreatePhaseRequest {
  nom: string;
  description?: string;
}

export function libelleStatutCohorte(statut: StatutCohorte): string {
  const map: Record<StatutCohorte, string> = {
    PLANIFIEE: 'Planifiée',
    EN_COURS: 'En cours',
    TERMINEE: 'Terminée',
    ARCHIVEE: 'Archivée',
  };

  return map[statut] ?? statut;
}

export function libellePhase(phase?: PhaseSummary | null): string {
  return phase?.nom?.trim() ? phase.nom : 'Phase non définie';
}
/** Situation d'un projet vis-à-vis d'une cohorte dans le rapport. */
export type SituationRapport = 'EN_COURS' | 'PROMU' | 'DIPLOME' | 'ABANDON' | 'RETIRE';

export interface RapportCohorteSynthese {
  projets: number;
  enCours: number;
  promus: number;
  diplomes: number;
  abandons: number;
  retires: number;
  missionsTotal: number;
  missionsValidees: number;
  tauxValidationMissions: number;
  missionsEnRetard: number;
  projetsEnRetard: number;
  livrablesEnAttente: number;
  livrablesACorriger: number;
  livrablesValides: number;
  avancementMoyen: number | null;
}

export interface RapportCohorteLigne {
  projetId: string;
  nomProjet: string;
  entrepreneurId: string | null;
  nomEntrepreneur: string | null;
  emailEntrepreneur: string | null;
  situation: SituationRapport;
  dateEntree: string;
  dateSortie: string | null;
  raisonSortie: string | null;
  phaseActuelle: string | null;
  stadeActuel: StadeAccompagnement | null;
  avancement: number | null;
  missionsTotal: number;
  missionsValidees: number;
  missionsEnRetard: number;
  livrablesEnAttente: number;
  livrablesACorriger: number;
  livrablesValides: number;
}

/** Rapport de pilotage d'une cohorte (GET /api/cohortes/{id}/rapport). */
export interface RapportCohorte {
  cohorteId: string;
  nomCohorte: string;
  statutCohorte: StatutCohorte | null;
  dateDebut: string | null;
  dateFin: string | null;
  nomProgramme: string | null;
  nomParcours: string | null;
  nomPhase: string | null;
  stade: StadeAccompagnement | null;
  dateGeneration: string;
  synthese: RapportCohorteSynthese;
  projets: RapportCohorteLigne[];
}
