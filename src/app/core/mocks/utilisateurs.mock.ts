import { Entrepreneur } from '../models/entrepreneur.model';
import { MembreEquipe } from '../models/membre-equipe.model';

export const MOCK_ENTREPRENEURS: Entrepreneur[] = [
  {
    id: 'ent-001',
    nom: 'Awa Ndiaye',
    email: 'awa.ndiaye@email.com',
    typeUtilisateur: 'entrepreneur',
    dateCreation: '2026-03-03',
    abonnementId: 'abo-001',
  },
  {
    id: 'ent-002',
    nom: 'Moussa Diop',
    email: 'moussa.diop@email.com',
    typeUtilisateur: 'entrepreneur',
    dateCreation: '2026-03-10',
    abonnementId: 'abo-002',
  },
  {
    id: 'ent-003',
    nom: 'Fatou Sarr',
    email: 'fatou.sarr@email.com',
    typeUtilisateur: 'entrepreneur',
    dateCreation: '2026-02-15',
    abonnementId: 'abo-003',
  },
];

export const MOCK_MEMBRES_EQUIPE: MembreEquipe[] = [
  {
    id: 'admin-001',
    nom: 'Moussa Mchangama',
    email: 'admin@fabrique360.sn',
    typeUtilisateur: 'membre_equipe',
    dateCreation: '2026-01-10',
    role: 'admin_structure',
    structureId: 'struct-001',
    emailVerified: true,
  },
  {
    id: 'coach-001',
    nom: 'Aïda Diagne',
    email: 'aida@fabrique360.sn',
    typeUtilisateur: 'membre_equipe',
    dateCreation: '2026-01-10',
    role: 'coach',
    structureId: 'struct-001',
    emailVerified: true,
  },
];