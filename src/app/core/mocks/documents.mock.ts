import { DocumentGenere } from '../models/document-genere.model';

export const MOCK_DOCUMENTS: DocumentGenere[] = [
  {
  id: 'doc-001',
    entrepreneurId: 'ent-001',
    type: 'bmc',
    contenu: {
      partenairesCles: "Simplon Sénégal · Fournisseurs de paiement mobile · Banques partenaires micro-crédit",
      activitesCles: "Développement produit · Support client · Formation des agents",
      ressourcesCles: "Équipe technique · Réseau d'agents · Plateforme mobile",
      propositionValeur: "Transferts d'argent instantanés et sans frais cachés pour les commerçants informels de Dakar",
      relationClient: "Accompagnement personnalisé · Support via WhatsApp",
      canaux: "Application mobile · Agents de proximité · Bouche-à-oreille",
      segmentsClients: "Commerçants informels · Micro-entrepreneurs · Diaspora sénégalaise",
      structureCouts: "Développement produit · Salaires équipe · Marketing d'acquisition · Frais de transaction",
      sourcesRevenus: "Commission sur transaction · Abonnement Premium commerçants · Frais de change",
    },
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
  contenu: {
    slides: [
      {
        titre: 'Problème',
        titrePrincipal: 'Les commerçants informels perdent du temps et de l’argent lors de leurs transactions.',
        texte:
          'Les paiements et transferts restent complexes, avec des frais peu transparents et un accès limité aux services financiers.'
      },
      {
        titre: 'Solution',
        titrePrincipal: 'Une plateforme simple pour transférer et gérer son argent.',
        texte:
          'JAPPO permet aux commerçants et micro-entrepreneurs d’effectuer leurs transferts rapidement grâce à une application mobile et un réseau d’agents de proximité.'
      },
      {
        titre: 'Marché',
        titrePrincipal: 'Un marché porté par la croissance du commerce informel au Sénégal.',
        texte:
          'Les commerçants informels, micro-entrepreneurs et membres de la diaspora représentent un marché important pour des services financiers accessibles et simples.'
      },
      {
        titre: 'Produit',
        titrePrincipal: 'Une expérience mobile pensée pour être simple et accessible.',
        texte:
          'Application mobile, réseau d’agents, suivi des transactions et accompagnement personnalisé via WhatsApp.'
      },
      {
        titre: 'Business Model',
        titrePrincipal: 'Un modèle économique basé sur les transactions et les services premium.',
        texte:
          'JAPPO génère ses revenus grâce aux commissions sur les transactions, aux abonnements Premium et aux frais de change.'
      },
      {
        titre: 'Avantage',
        titrePrincipal: 'La proximité et la simplicité comme avantage concurrentiel.',
        texte:
          'Une combinaison entre technologie, réseau d’agents locaux et accompagnement humain pour répondre aux besoins réels des commerçants.'
      },
      {
        titre: 'Traction',
        titrePrincipal: 'Une solution conçue autour des besoins des entrepreneurs locaux.',
        texte:
          'Les premiers retours permettent d’identifier les besoins prioritaires et d’améliorer progressivement l’expérience utilisateur.'
      },
      {
        titre: 'Équipe',
        titrePrincipal: 'Une équipe technique et opérationnelle engagée.',
        texte:
          'Une équipe combinant développement produit, connaissance du terrain et accompagnement des entrepreneurs pour construire une solution adaptée au marché.'
      },
      {
        titre: 'Vision',
        titrePrincipal: 'Rendre les services financiers plus simples et accessibles.',
        texte:
          'JAPPO ambitionne de devenir une plateforme de référence pour les commerçants et micro-entrepreneurs en Afrique de l’Ouest.'
      },
      {
        titre: 'Call to Action',
        titrePrincipal: 'Construisons ensemble la prochaine génération de services financiers.',
        texte:
          'Nous recherchons des partenaires, investisseurs et acteurs de l’écosystème pour accélérer le développement de JAPPO.'
      }
    ]
  },
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