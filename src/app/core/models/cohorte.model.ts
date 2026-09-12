export type StatutCohorte = 'PLANIFIEE' | 'EN_COURS' | 'TERMINEE';

export interface Cohorte {
  id: string;
  nom: string;
  description?: string;
  secteur?: string;
  dateDebut?: string;
  dateFin?: string;
  dateDemarrage?: string;
  statut: StatutCohorte;
  structureId?: string;
}

export interface CreateCohorteRequest {
  nom: string;
  description?: string;
  dateDebut?: string;
  dateFin?: string;
}