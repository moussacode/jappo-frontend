import { Utilisateur } from './utilisateur.model';

export type RoleMembreEquipe = 'admin' | 'coach';

export interface MembreEquipe extends Utilisateur {
  role: RoleMembreEquipe;
  structureId: string;
}