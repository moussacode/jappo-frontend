import { Projet } from '../models/projet.model';

export const MOCK_PROJETS: Projet[] = [
  {
    id: 'projet-001',
    entrepreneurId: 'ent-001',
    nom: 'JAPPO Pay',
    scoreMaturite: 78,
    etapeActuelle: 'pitch_deck',
    cohorteId: 'coh-003',
    dateCreation: '2026-03-03',
  },
  {
    id: 'projet-002',
    entrepreneurId: 'ent-002',
    nom: 'Mon projet',
    scoreMaturite: 52,
    etapeActuelle: 'business_model_canvas',
    cohorteId: 'coh-003',
    dateCreation: '2026-03-10',
  },
  {
    id: 'projet-003',
    entrepreneurId: 'ent-003',
    nom: 'Mon projet',
    scoreMaturite: 85,
    etapeActuelle: 'business_plan',
    cohorteId: 'coh-002',
    dateCreation: '2026-02-15',
  },
];