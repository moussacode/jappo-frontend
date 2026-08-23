import { DocumentGenere } from '../models/document-genere.model';

export const MOCK_DOCUMENTS: DocumentGenere[] = [
  {
    id: 'doc-001',
    entrepreneurId: 'ent-001',
    type: 'bmc',
    contenu: {},
    statut: 'genere',
    dateGeneration: '2026-08-02',
  },
  {
    id: 'doc-002',
    entrepreneurId: 'ent-001',
    type: 'etude_marche',
    contenu: {},
    statut: 'genere',
    dateGeneration: '2026-07-28',
  },
  {
    id: 'doc-003',
    entrepreneurId: 'ent-001',
    type: 'pitch_deck',
    contenu: {},
    statut: 'genere',
    dateGeneration: '2026-08-05',
  },
  {
    id: 'doc-004',
    entrepreneurId: 'ent-001',
    type: 'business_plan',
    contenu: {},
    statut: 'en_cours',
    dateGeneration: '2026-08-10',
  },
];