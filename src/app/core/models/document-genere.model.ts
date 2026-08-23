export type TypeDocument = 'bmc' | 'etude_marche' | 'pitch_deck' | 'business_plan';
export type StatutDocument = 'en_cours' | 'genere';

export interface DocumentGenere {
  id: string;
  entrepreneurId: string;
  type: TypeDocument;
  contenu: unknown; // structure JSON, propre à chaque type de document
  statut: StatutDocument;
  dateGeneration: string;
  dateDerniereModif?: string;
}