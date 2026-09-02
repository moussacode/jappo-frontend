import { Mission } from '../models/mission.model';

export const MOCK_MISSIONS: Mission[] = [
  {
    id: 'mis-001',
    titre: 'Finaliser le pitch deck',
    description: "Préparer une présentation de 10 slides maximum incluant le problème, la solution, le marché, le business model, la traction et l'équipe.",
    categorie: 'Pitch Deck',
    dateEcheance: '2026-08-28',
    statut: 'en_cours',
    dateCreation: '2026-08-01',
    assigneePar: 'coach-001',
    cibleProjetId: 'projet-001',
    cibleCohorteId: null,
  },
  {
    id: 'mis-002',
    titre: 'Répétition du pitch avec le coach',
    categorie: 'Pitch Deck',
    dateEcheance: '2026-08-20',
    statut: 'a_faire',
    dateCreation: '2026-08-05',
    assigneePar: 'coach-001',
    cibleProjetId: 'projet-001',
    cibleCohorteId: null,
  },
];