export type Forfait = 'starter' | 'incubateur' | 'reseau';

export interface Structure {
  id: string;
  nom: string;
  emailContact: string;
  telephone?: string;
  forfait: Forfait;
  dateInscription: string;
  abonnementId: string | null;
}