import { ConversationIA, MessageIA } from '../models/conversation-ia.model';

export const MOCK_CONVERSATIONS: ConversationIA[] = [
  {
    id: 'conv-001',
    projetId: 'projet-001',
    contexte: 'Pitch Deck - Cohorte 3 Fintech',
    dateCreation: '2026-08-05',
  },
];

export const MOCK_MESSAGES: MessageIA[] = [
  {
    id: 'msg-001',
    conversationId: 'conv-001',
    auteur: 'assistant',
    contenu: "Bonjour Awa ! Je vois que tu travailles sur ton Pitch Deck. Sur quelle partie veux-tu de l'aide aujourd'hui ?",
    dateEnvoi: '2026-08-05T10:00:00',
    model: 'balanced',
  },
  {
    id: 'msg-002',
    conversationId: 'conv-001',
    auteur: 'entrepreneur',
    contenu: "J'ai du mal à formuler le problème que je résous en une slide claire.",
    dateEnvoi: '2026-08-05T10:01:00',
    model: 'balanced',
  },
  {
    id: 'msg-003',
    conversationId: 'conv-001',
    auteur: 'assistant',
    contenu: "Bonne question. Une slide \"Problème\" efficace tient en 3 points : qui est concerné, quelle douleur précise ils vivent, et pourquoi les solutions actuelles ne suffisent pas. Veux-tu qu'on la rédige ensemble à partir de ton étude de marché ?",
    dateEnvoi: '2026-08-05T10:02:00',
    model: 'balanced',
  },
];