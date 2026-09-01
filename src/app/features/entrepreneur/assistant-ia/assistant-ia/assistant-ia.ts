import {
  Component,
  computed,
  ElementRef,
  inject,
  HostListener,
  signal,
  viewChild,
} from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service';
import { ConversationService } from '../../../../core/services/conversation.service';
import { ConversationIA, MessageIA } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-assistant-ia',
  imports: [ButtonComponent],
  templateUrl: './assistant-ia.html',
})
export class AssistantIa {
  private readonly authService = inject(AuthService);
  private readonly conversationService = inject(ConversationService);

  private readonly userId =
    this.authService.currentUser()?.id ?? '';

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  protected readonly conversation =
    signal<ConversationIA | undefined>(undefined);

  protected readonly messages =
    signal<MessageIA[]>([]);

  protected readonly saisie =
    signal('');

  protected readonly envoiEnCours =
    signal(false);

  protected readonly suggestions = [
    'Rédiger ma slide Problème',
    'Revoir mon Business Model',
    "M'aider à trouver des financements",
  ];
  protected readonly models = [
  {
    id: 'fast',
    name: 'Rapide',
    description: 'Réponses rapides pour les tâches simples',
  },
  {
    id: 'balanced',
    name: 'Équilibré',
    description: 'Bon équilibre entre rapidité et qualité',
  },
  {
    id: 'reasoning',
    name: 'Raisonnement',
    description: 'Pour les analyses et décisions complexes',
  },
];

  constructor() {
    this.conversationService
      .getOrCreate(this.userId)
      .subscribe((conv) => {
        this.conversation.set(conv);

        this.conversationService
          .getMessages(conv.id)
          .subscribe((msgs) => {
            this.messages.set(msgs);
            this.scrollToBottom();
          });
      });
  }

  protected readonly selectedModel = signal('balanced');

  // ✅ AJOUTER CETTE LIGNE
  protected readonly modelMenuOpen = signal(false);

  // ✅ Modèle actuellement sélectionné
  protected readonly selectedModelInfo = computed(() =>
    this.models.find(
      (model) => model.id === this.selectedModel()
    )
  );
  

  @HostListener('document:click', ['$event'])
protected onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;

  if (!target.closest('.model-selector')) {
    this.modelMenuOpen.set(false);
  }
}
  protected selectModel(modelId: string): void {
    this.selectedModel.set(modelId);
    this.modelMenuOpen.set(false);
  }



  private scrollToBottom(): void {
    setTimeout(() => {
      const container =
        this.messagesContainer()?.nativeElement;

      if (!container) {
        return;
      }

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }

  protected envoyer(texte?: string): void {
    const contenu = (texte ?? this.saisie()).trim();
    const convId = this.conversation()?.id;

    if (
      !contenu ||
      !convId ||
      this.envoiEnCours()
    ) {
      return;
    }

    this.saisie.set('');

    this.resetTextarea();

    this.messages.update((msgs) => [
      ...msgs,
      {
        id: crypto.randomUUID(),
        conversationId: convId,
        auteur: 'entrepreneur',
        contenu,
        dateEnvoi: new Date().toISOString(),
        model: this.selectedModel(),
      },
    ]);

    this.scrollToBottom();

    this.envoiEnCours.set(true);

    this.conversationService
      .sendMessage(convId, contenu,this.selectedModel())
      .subscribe({
        next: (reponse) => {
          this.messages.update((msgs) => [
            ...msgs,
            reponse,
          ]);

          this.envoiEnCours.set(false);

          this.scrollToBottom();
        },

        error: () => {
          this.envoiEnCours.set(false);
        },
      });
  }

protected onSaisieInput(event: Event): void {
  const textarea = event.target as HTMLTextAreaElement;

  this.saisie.set(textarea.value);

  textarea.style.height = 'auto';
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
}

  protected onSaisieKeyDown(event: KeyboardEvent): void {
    if (
      event.key === 'Enter' &&
      !event.shiftKey
    ) {
      event.preventDefault();
      this.envoyer();
    }
  }

  private resizeTextarea(
    textarea: HTMLTextAreaElement,
  ): void {
    textarea.style.height = 'auto';

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      160,
    )}px`;
  }

  private resetTextarea(): void {
    setTimeout(() => {
      const textarea =
        document.querySelector<HTMLTextAreaElement>(
          'textarea',
        );

      if (!textarea) {
        return;
      }

      textarea.style.height = 'auto';
    });
  }
}