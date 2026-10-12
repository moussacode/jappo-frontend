import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { ConversationService } from '../../../core/services/conversation.service';
import { EntrepreneurAssistantPanel } from './entrepreneur-assistant-panel';
import { EntrepreneurAssistantService } from './entrepreneur-assistant.service';

describe('EntrepreneurAssistantPanel', () => {
  let fixture: ComponentFixture<EntrepreneurAssistantPanel>;
  let http: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    http = { get: vi.fn().mockReturnValue(of(new Blob(['document']))) };
    TestBed.configureTestingModule({
      imports: [EntrepreneurAssistantPanel],
      providers: [{
        provide: ConversationService,
        useValue: {
          listConversations: () => of([]),
          getConversation: () => of({}),
          createConversation: () => of({}),
          sendMessage: () => of([]),
          deleteConversation: () => of(undefined),
        },
      }, {
        provide: HttpClient,
        useValue: http,
      }],
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(EntrepreneurAssistantPanel);
    await fixture.whenStable();
  });

  it('renders a real source link with the canonical URL and opens it in a new tab', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.messages.set([{
      id: 'answer-1',
      conversationId: 'conversation-1',
      auteur: 'ASSISTANT',
      contenu: 'Voici une réponse documentée.',
      dateEnvoi: '2026-01-01T00:00:00Z',
      sourcesJson: JSON.stringify([{
        id: 'source-1',
        title: 'Guide officiel',
        url: 'https://example.org/guide?source=assistant',
        snippet: 'Extrait de référence.',
      }]),
    }]);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toBe('https://example.org/guide?source=assistant');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    expect(link.dispatchEvent(click)).toBe(true);
    expect(click.defaultPrevented).toBe(false);
    expect(link.href).toBe('https://example.org/guide?source=assistant');
    expect(fixture.nativeElement.textContent).toContain('Guide officiel');
  });

  it('renders bold assistant text as formatted markup', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.messages.set([{
      id: 'answer-bold',
      conversationId: 'conversation-1',
      auteur: 'ASSISTANT',
      contenu: 'La **définition importante** est ici.',
      dateEnvoi: '2026-01-01T00:00:00Z',
    }]);
    fixture.detectChanges();

    const strong = fixture.nativeElement.querySelector('strong') as HTMLElement;
    expect(strong?.textContent).toBe('définition importante');
    expect(fixture.nativeElement.textContent).not.toContain('**');
  });

  it('clearly labels an answer without citations as general', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.messages.set([{
      id: 'answer-2',
      conversationId: 'conversation-1',
      auteur: 'ASSISTANT',
      contenu: 'Une réponse non sourcée.',
      dateEnvoi: '2026-01-01T00:00:00Z',
    }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Réponse générale · aucune source citée');
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
  });

  it('shows the mission context without exposing its internal identifier', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.missionId.set('internal-mission-uuid');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Contexte de la mission');
    expect(fixture.nativeElement.textContent).not.toContain('internal-mission-uuid');
  });

  it('keeps conversation history selectable on narrow screens', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.history.set([{
      id: 'conversation-1',
      structureId: 'structure-1',
      coachId: 'entrepreneur-1',
      contexte: {},
      titre: 'Ma conversation',
      archivee: false,
      dateCreation: '2026-01-01T00:00:00Z',
      dateModification: '2026-01-01T00:00:00Z',
      messages: [],
    }]);
    assistant.conversationId.set('conversation-1');
    fixture.detectChanges();

    const selector = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(selector).toBeTruthy();
    expect(selector.options[0].textContent).toContain('Ma conversation');
  });

  it('routes stored upload citations through the conversation-scoped download endpoint', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.messages.set([{
      id: 'answer-3',
      conversationId: 'conversation-1',
      auteur: 'ASSISTANT',
      contenu: 'Consultez le document de votre incubateur.',
      dateEnvoi: '2026-01-01T00:00:00Z',
      sourcesJson: JSON.stringify([{
        id: 'source-upload-1',
        title: 'Guide de l’incubateur',
        url: '/fichiers/ressources/structure-1/guide.pdf',
        snippet: 'Extrait pertinent.',
      }]),
    }]);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(link).toBeTruthy();
    expect(link.href).toBe(
      'http://localhost:8080/api/conversations/conversation-1/sources/source-upload-1',
    );
  });

  it('opens protected upload citations through the authenticated API', () => {
    const assistant = TestBed.inject(EntrepreneurAssistantService);
    assistant.messages.set([{
      id: 'answer-4',
      conversationId: 'conversation-1',
      auteur: 'ASSISTANT',
      contenu: 'Consultez le document.',
      dateEnvoi: '2026-01-01T00:00:00Z',
      sourcesJson: JSON.stringify([{
        id: 'source-protected-1',
        title: 'Guide sécurisé',
        url: '/api/conversations/conversation-1/sources/source-protected-1',
      }]),
    }]);
    fixture.detectChanges();
    const sourceWindow = {
      opener: null,
      location: { href: 'about:blank' },
      close: vi.fn(),
    } as unknown as Window;
    vi.spyOn(window, 'open').mockReturnValue(sourceWindow);

    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    link.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(http.get).toHaveBeenCalledWith(
      'http://localhost:8080/api/conversations/conversation-1/sources/source-protected-1',
      { responseType: 'blob' },
    );
  });
});
