export type TypeAbonnement = 'gratuit' | 'premium' | 'starter' | 'incubateur' | 'reseau';

export interface Abonnement {
  id: string;
  type: TypeAbonnement;
  prix: number;
  dateDebut: string;
  dateRenouvellement?: string;
  statut: 'actif' | 'expire';
}