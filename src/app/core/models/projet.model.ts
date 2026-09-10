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
}

export interface CreateProjetRequest {
  nom: string;
  description?: string;
  secteur?: string;
  cohorteId?: string;
  entrepreneurId?: string;
}