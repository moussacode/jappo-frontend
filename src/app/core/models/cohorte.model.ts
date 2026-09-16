export type StatutCohorte = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE' | 'ARCHIVEE';
export type PhaseParcours = 'PRE_INCUBATION' | 'INCUBATION' | 'POST_INCUBATION';

export interface Cohorte {
  id: string;
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  statut: StatutCohorte;
  phase: PhaseParcours;
  structureId?: string;
}

export interface CreateCohorteRequest {
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  phase?: PhaseParcours;
}

export interface UpdateCohorteRequest {
  nom?: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
  statut?: StatutCohorte;
  phase?: PhaseParcours;
}