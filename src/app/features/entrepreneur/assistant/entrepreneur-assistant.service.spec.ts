import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ConversationIA } from '../../../core/models/conversation-ia.model';
import { ConversationService } from '../../../core/services/conversation.service';
import { EntrepreneurAssistantService } from './entrepreneur-assistant.service';

const conversation = (id: string, missionId?: string): ConversationIA => ({
  id,
  structureId: 'structure-1',
  coachId: 'entrepreneur-1',
  contexte: missionId ? { missionId } : {},
  titre: 'Discussion',
  archivee: false,
  dateCreation: '2026-01-01T00:00:00Z',
  dateModification: '2026-01-01T00:00:00Z',
  messages: [{
    id: 'message-1',
    conversationId: id,
    auteur: 'ASSISTANT',
    contenu: 'Bonjour',
    dateEnvoi: '2026-01-01T00:00:00Z',
  }],
});

describe('EntrepreneurAssistantService', () => {
  let api: {
    listConversations: ReturnType<typeof vi.fn>;
    getConversation: ReturnType<typeof vi.fn>;
    createConversation: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    if (typeof sessionStorage !== 'undefined') sessionStorage.clear();
    api = {
      listConversations: vi.fn().mockReturnValue(of([])),
      getConversation: vi.fn().mockReturnValue(of(conversation('mission-conversation', 'mission-1'))),
      createConversation: vi.fn().mockReturnValue(of(conversation('created-conversation', 'mission-2'))),
    };
    TestBed.configureTestingModule({
      providers: [{ provide: ConversationService, useValue: api }],
    });
  });

  it('restores the matching mission conversation and its messages across repeated navigation', async () => {
    const saved = conversation('mission-conversation', 'mission-1');
    api.listConversations.mockReturnValue(of([saved]));
    const assistant = TestBed.inject(EntrepreneurAssistantService);

    await assistant.ensureMissionConversation('mission-1');
    await assistant.ensureMissionConversation('mission-1');

    expect(assistant.conversationId()).toBe('mission-conversation');
    expect(assistant.messages()).toEqual(saved.messages);
    expect(api.createConversation).not.toHaveBeenCalled();
    expect(api.getConversation).toHaveBeenCalledTimes(1);
  });

  it('creates and selects a persisted conversation with mission context when none exists', async () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);

    await assistant.ensureMissionConversation('mission-2');

    expect(api.createConversation).toHaveBeenCalledWith({
      contexte: { missionId: 'mission-2' },
    });
    expect(assistant.conversationId()).toBe('created-conversation');
    expect(assistant.missionId()).toBe('mission-2');
  });
});
