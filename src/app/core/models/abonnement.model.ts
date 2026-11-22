export type PlanAbonnement = 'FREEMIUM' | 'PREMIUM';

export type StatutAbonnement =
  | 'ACTIF'
  | 'EXPIRE'
  | 'EN_ATTENTE_PAIEMENT'
  | 'ANNULE';

export interface Abonnement {
  id: string;
  plan: PlanAbonnement;
  statut: StatutAbonnement;
  dateDebut: string | null;
  dateFin: string | null;
  renouvellementAuto: boolean;
  dateCreation: string;
}