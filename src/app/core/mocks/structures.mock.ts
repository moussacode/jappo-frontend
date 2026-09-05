import { Structure } from '../models/structure.model';

export const MOCK_STRUCTURES: Structure[] = [
  {
    id: 'struct-001',
    nom: 'Fabrique 360 — Simplon Sénégal',
    emailContact: 'contact@fabrique360.sn',
    telephone: '+221 77 000 00 00',

    type: 'incubateur',
    pays: 'Sénégal',
    ville: 'Dakar',
    description:
      'Structure d’accompagnement dédiée à l’innovation, à l’entrepreneuriat et au développement des compétences numériques.',
    logo: null,
    statut: 'active',

    forfait: 'incubateur',
    dateInscription: '2026-01-10',
    abonnementId: 'abo-struct-001',
  },
];