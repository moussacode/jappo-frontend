export type Forfait = 'starter' | 'incubateur' | 'reseau';
export type TypeStructure = 'incubateur' | 'accelerateur' | 'coworking' | 'association' | 'autre';

export interface Structure {
  id: string;
  nom: string;
  email: string;
  telephone?: string;
  type: TypeStructure;
  pays: string;
  ville: string;
  description?: string;
  logo?: string | null;
  statut: 'active';
  forfait: Forfait;
  dateInscription: string;
  abonnementId: string | null;
}