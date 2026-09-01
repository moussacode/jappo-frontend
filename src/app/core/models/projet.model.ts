import { EtapeParcours } from './entrepreneur.model';

export interface Projet {
  id: string;
  entrepreneurId: string;
  nom: string;
  scoreMaturite: number;
  etapeActuelle: EtapeParcours;
  cohorteId: string | null;
  dateCreation: string;
}