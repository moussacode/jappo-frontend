export type StatutCohorte =
  | 'PLANIFIEE'
  | 'EN_COURS'
  | 'TERMINEE'
  | 'ARCHIVEE';

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
}

export interface UpdateCohorteRequest {
  nom?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: StatutCohorte;
  parcoursId?: string;
  phaseId?: string;
}

export interface InviterEntrepreneursRequest {
  emails: string[];
}

export interface Phase {
  id: string;
  nom: string;
  description?: string;
  archive?: boolean;
  dateCreation?: string;
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
  phases?: ParcoursPhase[];
}

export interface CreateParcoursRequest {
  nom: string;
  description?: string;
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