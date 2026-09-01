import { Abonnement } from "../models";

export const MOCK_ABONNEMENTS: Abonnement[] = [
  { id: 'abo-001', type: 'gratuit', prix: 0, dateDebut: '2026-03-03', statut: 'actif' },
  { id: 'abo-002', type: 'gratuit', prix: 0, dateDebut: '2026-03-10', statut: 'actif' },
  { id: 'abo-003', type: 'premium', prix: 3000, dateDebut: '2026-06-01', dateRenouvellement: '2026-09-01', statut: 'actif' },
];