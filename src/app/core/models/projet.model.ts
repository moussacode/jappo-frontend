export type StatutProjet = 
  | 'IDEE' 
  | 'EN_INCUBATION' 
  | 'EN_ACCELERATION' 
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
  // Statistiques de missions (calculées côté backend)
  nombreMissionsTotal?: number;
  nombreMissionsValidees?: number;
}

export interface CreateProjetRequest {
  nom: string;
  description?: string;
  secteur?: string;
  cohorteId?: string;
  entrepreneurId?: string;
}