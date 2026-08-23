export type TypeUtilisateur = 'entrepreneur' | 'membre_equipe';

export interface Utilisateur {
  id: string; // UUID
  nom: string;
  email: string;
  typeUtilisateur: TypeUtilisateur;
  dateCreation: string; // ISO date
}