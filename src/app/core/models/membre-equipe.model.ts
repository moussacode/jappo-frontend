import { Utilisateur } from './utilisateur.model';

export type RoleMembreEquipe = 'admin_structure' | 'coach';

export interface MembreEquipe extends Utilisateur {
  prenom?: string;
  telephone?: string;
  role: RoleMembreEquipe;
  structureId: string;
  emailVerified: boolean;
}