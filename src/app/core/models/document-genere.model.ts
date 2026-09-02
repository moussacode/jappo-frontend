export type TypeDocument = 'bmc' | 'etude_marche' | 'pitch_deck' | 'business_plan';
export type StatutDocument = 'en_cours' | 'genere';

export interface DocumentGenere {
  id: string;
  projetId: string;
  type: TypeDocument;
  contenu: unknown;
  statut: StatutDocument;
  dateGeneration: string;
  dateDerniereModif?: string;
}