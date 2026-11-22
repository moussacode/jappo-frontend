
export interface RevenuMensuelResponse {
  mois: string;
  montant: number;
}

export interface NouvellesStructuresMensuellesResponse {
  mois: string;
  nombre: number;
}

export enum StatutStructure {
  ACTIVE = 'ACTIVE',
  SUSPENDUE = 'SUSPENDUE',
}

export interface SuperAdminDashboardData {
  totalStructures: number;
  structuresPremium: number;
  structuresFreemium: number;
  revenuTotal: number;
  revenuMois: number;
  transactionsEchecRecentes: number;
  abonnementsExpiration7Jours: number;
  nouvellesStructuresCetteSemaine: number;
  nouvellesStructuresCeMois: number;
  revenusMensuels: RevenuMensuelResponse[];
  nouvellesStructuresMensuelles: NouvellesStructuresMensuellesResponse[];
  transactionsParStatut: Record<string, number>;
}

export interface SuperAdminStructureList {
  id: string;
  nom: string;
  slug: string;
  plan: string;
  statutStructure: StatutStructure;
  statutAbonnement: string;
  dateCreation: string;
  nombreMembres: number;
  nombreCohortesActives: number;
}

export interface SuperAdminStructureMembre {
  id: string;
  userId: string;
  prenom: string;
  nom: string;
  email: string;
  role: string;
  statut: string;
}

export interface SuperAdminStructureProprietaire {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  emailVerified: boolean;
  roleGlobal: string;
}

export interface SuperAdminStructureAbonnement {
  id: string;
  plan: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  renouvellementAuto: boolean;
}

export interface SuperAdminStructureDetail {
  id: string;
  nom: string;
  slug: string;
  statutStructure: StatutStructure;
  statutAbonnement: string;
  type: string | null;
  pays: string | null;
  ville: string | null;
  description: string | null;
  email: string | null;
  telephone: string | null;
  adresse: string | null;
  siteWeb: string | null;
  logo: string | null;
  dateCreation: string;
  proprietaire: SuperAdminStructureProprietaire;
  abonnement: SuperAdminStructureAbonnement | null;
  nombreMembres: number;
  nombreCohortesActives: number;
  membres: SuperAdminStructureMembre[];
}

export interface SuperAdminHistoriqueAbonnement {
  id: string;
  plan: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  renouvellementAuto: boolean;
  source: string;
  dateCreation: string;
}

export interface SuperAdminTransaction {
  id: string;
  structureNom: string;
  structureId: string;
  montant: number;
  devise: string;
  statut: string;
  moyenPaiement: string | null;
  telephoneClient: string | null;
  refCommand: string;
  tokenPaiement: string | null;
  planVise: string;
  dateCreation: string;
  dateConfirmation: string | null;
  payloadIpnBrut: string | null;
}


export interface SuperAdminAbonnement {
  id: string;
  structureId: string;
  structureNom: string;
  plan: string;
  statut: string;
  dateDebut: string | null;
  dateFin: string | null;
  renouvellementAuto: boolean;
  dateCreation: string;
}
