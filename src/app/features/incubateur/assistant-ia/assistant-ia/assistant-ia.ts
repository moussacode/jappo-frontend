import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { ConversationService } from '../../../../core/services/conversation.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { AiActionService } from '../../../../core/services/ai-action.service';

import {
  ConversationContexte,
  ContexteChip,
  MessageIA,
  TypeContexte,
} from '../../../../core/models/conversation-ia.model';

import { Cohorte } from '../../../../core/models/cohorte.model';
import { Projet } from '../../../../core/models/projet.model';

import { ButtonComponent } from '../../../../shared/components/button/button.component';

/**
 * Assistant IA — côté coach/incubateur.
 *
 * Le contexte est entièrement OPTIONNEL :
 *   - aucun contexte → question au niveau de la structure globale
 *   - cohorte sélectionnée → contexte de la cohorte
 *   - projet sélectionné → contexte du projet
 *
 * Aucune conversation n'est créée au démarrage.
 * Elle est créée uniquement au premier envoi de message.
 *
 * La structure active (X-Structure-Id) est requise.
 * Le composant vérifie sa présence avant d'envoyer.
 */
@Component({
  selector: 'app-assistant-ia',
  standalone: true,
  imports: [CommonModule, ButtonComponent, JsonPipe, RouterLink],
  templateUrl: './assistant-ia.html',
})
export class AssistantIa implements OnInit {

  // ── Services ──────────────────────────────────────────────────────────────

  private readonly cohorteService       = inject(CohorteService);
  private readonly projetService        = inject(ProjetService);
  private readonly conversationService  = inject(ConversationService);
  private readonly structureContext     = inject(StructureContextService);
  private readonly aiActionService      = inject(AiActionService);
  private readonly destroyRef           = inject(DestroyRef);

  // ── Vue ───────────────────────────────────────────────────────────────────

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  // ── État conversation ─────────────────────────────────────────────────────

  /** ID de la conversation en cours — null jusqu'au premier envoi */
  private readonly conversationId = signal<string | null>(null);

  protected readonly messages      = signal<MessageIA[]>([]);
  protected readonly envoiEnCours  = signal(false);

  /** Erreur à afficher à l'utilisateur (structure manquante, réseau...) */
  protected readonly erreur = signal<string | null>(null);

  // ── État de traitement des actions IA ─────────────────────────────────────────
  
  /** Actions en cours de traitement (actionId -> status) */
  protected readonly actionsEnCours = signal<Record<string, 'confirming' | 'rejecting'>>({});
  
  /** Résultats des actions IA (actionId -> success, message, resource) */
  protected readonly actionResults = signal<Record<string, { success: boolean; message: string; resource?: any }>>({});

  // ── Structure active ──────────────────────────────────────────────────────

  /** Dérivé directement du service de contexte — jamais null si l'utilisateur est connecté */
  protected readonly structureActive = computed(
    () => this.structureContext.activeStructureId()
  );

  // ── Contexte sélectionné (chips) ──────────────────────────────────────────

  protected readonly contextChips    = signal<ContexteChip[]>([]);
  protected readonly contextMenuOpen = signal(false);

  // ── Données pour le sélecteur + ───────────────────────────────────────────

  protected readonly cohortes = signal<Cohorte[]>([]);
  protected readonly projets  = signal<Projet[]>([]);

  // ── Saisie ────────────────────────────────────────────────────────────────

  protected readonly saisie = signal('');

  // ── Suggestions rapides ───────────────────────────────────────────────────

  protected readonly suggestions = [
    "Combien d'entrepreneurs avons-nous ?",
    'Quels projets sont en retard ?',
    'Résume la progression de la cohorte',
  ];

  // ── Sélecteur de modèle ───────────────────────────────────────────────────

  protected readonly models = [
    { id: 'fast',      name: 'Rapide',       description: 'Réponses rapides pour les tâches simples' },
    { id: 'balanced',  name: 'Équilibré',    description: 'Bon équilibre entre rapidité et qualité' },
    { id: 'reasoning', name: 'Raisonnement', description: 'Pour les analyses et décisions complexes' },
  ];

  protected readonly selectedModel     = signal('balanced');
  protected readonly modelMenuOpen     = signal(false);
  protected readonly selectedModelInfo = computed(() =>
    this.models.find((m) => m.id === this.selectedModel())
  );

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngOnInit(): void {
    // Charger cohortes et projets de la structure pour alimenter le menu +
    // Ces appels ne dépendent d'aucun entrepreneur ni d'aucun userId.
    this.cohorteService
      .getCohortes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.cohortes.set(c), error: () => {} });

    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.projets.set(p), error: () => {} });
  }

  // ── Envoi de message ──────────────────────────────────────────────────────

  protected envoyer(texte?: string): void {
    const contenu = (texte ?? this.saisie()).trim();
    if (!contenu || this.envoiEnCours()) return;

    // Vérification préalable : structure active requise
    if (!this.structureActive()) {
      this.erreur.set('Aucune structure active sélectionnée. Veuillez sélectionner une structure.');
      return;
    }

    this.erreur.set(null);
    this.saisie.set('');
    this.resetTextarea();

    // Affichage optimiste du message COACH
    const tempId = crypto.randomUUID();
    const tempMsg: MessageIA = {
      id: tempId,
      conversationId: '',
      auteur: 'COACH',
      contenu,
      dateEnvoi: new Date().toISOString(),
    };
    this.messages.update((msgs) => [...msgs, tempMsg]);
    this.scrollToBottom();
    this.envoiEnCours.set(true);

    const convId = this.conversationId();
    if (convId) {
      this.doSendMessage(convId, contenu, tempId);
    } else {
      // Créer la conversation au premier envoi uniquement
      const contexte = this.buildContexteFromChips(this.contextChips());
      this.conversationService
        .createConversation({ contexte })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (conv) => {
            this.conversationId.set(conv.id);
            this.doSendMessage(conv.id, contenu, tempId);
          },
          error: (err) => {
            this.messages.update((msgs) => msgs.filter((m) => m.id !== tempId));
            this.envoiEnCours.set(false);
            // 401 = structure non reconnue côté backend
            if (err?.status === 401 || err?.status === 403) {
              this.erreur.set('Session expirée ou structure non autorisée. Rechargez la page.');
            }
          },
        });
    }
  }

  private doSendMessage(convId: string, contenu: string, tempId: string): void {
    this.conversationService
      .sendMessage(convId, contenu)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (nouveauxMessages) => {
          this.messages.update((msgs) => [
            ...msgs.filter((m) => m.id !== tempId),
            ...nouveauxMessages,
          ]);
          this.envoiEnCours.set(false);
          this.scrollToBottom();
        },
        error: () => {
          this.messages.update((msgs) => msgs.filter((m) => m.id !== tempId));
          this.envoiEnCours.set(false);
        },
      });
  }

  // ── Gestion du contexte ───────────────────────────────────────────────────

  protected toggleContextMenu(): void {
    this.contextMenuOpen.update((v) => !v);
  }

  protected selectModel(modelId: string): void {
    this.selectedModel.set(modelId);
    this.modelMenuOpen.set(false);
  }

  protected addContexte(type: TypeContexte, id: string, label: string): void {
    const updated = [...this.contextChips().filter((c) => c.type !== type), { type, id, label }];
    this.contextChips.set(updated);
    this.contextMenuOpen.set(false);
    this.syncContexteConversation(updated);
  }

  protected removeContexte(type: TypeContexte): void {
    const updated = this.contextChips().filter((c) => c.type !== type);
    this.contextChips.set(updated);
    this.syncContexteConversation(updated);
  }

  private syncContexteConversation(chips: ContexteChip[]): void {
    const convId = this.conversationId();
    if (!convId) return;

    const ctx = this.buildContexteFromChips(chips);
    this.conversationService
      .updateContexte(convId, {
        cohorteId:      ctx.cohorteId      ?? null,
        projetId:       ctx.projetId       ?? null,
        entrepreneurId: ctx.entrepreneurId ?? null,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => {} });
  }

  private buildContexteFromChips(chips: ContexteChip[]): ConversationContexte {
    const ctx: ConversationContexte = {};
    for (const c of chips) {
      if (c.type === 'COHORTE')      ctx.cohorteId      = c.id;
      if (c.type === 'PROJET')       ctx.projetId       = c.id;
      if (c.type === 'ENTREPRENEUR') ctx.entrepreneurId = c.id;
    }
    return ctx;
  }

  // ── Helpers clavier / UI ──────────────────────────────────────────────────

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.context-menu'))  this.contextMenuOpen.set(false);
    if (!target.closest('.model-selector')) this.modelMenuOpen.set(false);
  }

  protected onSaisieInput(event: Event): void {
    const ta = event.target as HTMLTextAreaElement;
    this.saisie.set(ta.value);
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }

  protected onSaisieKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.envoyer();
    }
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      const el = this.messagesContainer()?.nativeElement;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    });
  }

  private resetTextarea(): void {
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('textarea');
      if (ta) ta.style.height = 'auto';
    });
  }

  // ── Helpers template ──────────────────────────────────────────────────────

  protected isCoach(msg: MessageIA): boolean { return msg.auteur === 'COACH'; }
  protected hasContexte(): boolean           { return this.contextChips().length > 0; }

  // ── Gestion des actions IA ─────────────────────────────────────────────────

  /**
   * Parser les actions depuis actionsJson pour affichage dans l'UI
   */
  protected parseActions(msg: MessageIA): any[] {
    if (!msg.actionsJson) return [];
    try {
      const parsed = JSON.parse(msg.actionsJson);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [];
    }
  }

  /**
   * Formater le type d'action pour affichage
   */
  protected formatActionType(type: string): string {
    const typeMap: Record<string, string> = {
      'CREATE_COHORTE': 'Créer une cohorte',
      'UPDATE_COHORTE': 'Modifier une cohorte',
      'ARCHIVE_COHORTE': 'Archiver une cohorte',
      'CREATE_MISSION': 'Créer une mission',
      'UPDATE_MISSION': 'Modifier une mission',
      'ARCHIVE_MISSION': 'Archiver une mission',
      'UPDATE_PROJET': 'Modifier un projet',
      'ARCHIVE_PROJET': 'Archiver un projet',
      'CREATE_PROJET': 'Créer un projet',
      'RESTORE_PROJET': 'Restaurer un projet',
    };
    return typeMap[type] || type;
  }

  /**
   * Générer une description lisible pour une action IA
   */
  protected getActionDescription(action: any): string {
    if (!action.payload) return '';
    
    const type = action.type;
    const payload = action.payload;
    
    if (type === 'ARCHIVE_COHORTE' || type === 'UPDATE_COHORTE') {
      if (payload.cohorteId) {
        // Trouver le nom de la cohorte dans les données chargées
        const cohorte = this.cohortes().find(c => c.id === payload.cohorteId);
        if (cohorte) {
          const actionText = type === 'ARCHIVE_COHORTE' ? 'archivée' : 'modifiée';
          return `Cohorte "${cohorte.nom}" sera ${actionText}.`;
        }
      }
    }
    
    if (type === 'ARCHIVE_PROJET' || type === 'UPDATE_PROJET') {
      if (payload.entityId) {
        const projet = this.projets().find(p => p.id === payload.entityId);
        if (projet) {
          const actionText = type === 'ARCHIVE_PROJET' ? 'archivé' : 'modifié';
          return `Projet "${projet.nom}" sera ${actionText}.`;
        }
      }
    }
    
    if (type === 'CREATE_COHORTE' && payload.nom) {
      return `Créer la cohorte "${payload.nom}".`;
    }
    
    if (type === 'CREATE_MISSION' && payload.titre) {
      return `Créer la mission "${payload.titre}".`;
    }
    
    return '';
  }

  /**
   * Générer le texte du bouton de navigation vers la ressource
   */
  protected getResourceActionText(resourceType: string): string {
    const textMap: Record<string, string> = {
      'COHORTE': 'Voir la cohorte',
      'MISSION': 'Voir la mission',
      'PROJET': 'Voir le projet',
    };
    return textMap[resourceType] || 'Voir la ressource';
  }

  /**
   * Confirmer une action IA
   */
  protected confirmerAction(actionId: string): void {
    // Marquer l'action comme en cours de confirmation
    this.actionsEnCours.update(prev => ({ ...prev, [actionId]: 'confirming' }));
    
    this.aiActionService.confirmerAction(actionId).subscribe({
      next: (response) => {
        // Enregistrer le résultat
        this.actionResults.update(prev => ({ 
          ...prev, 
          [actionId]: { 
            success: response.success, 
            message: response.message,
            resource: response.resource 
          } 
        }));
        
        // Retirer l'action du traitement en cours
        this.actionsEnCours.update(prev => {
          const copy = { ...prev };
          delete copy[actionId];
          return copy;
        });
        
        if (response.success) {
          // Recharger les messages pour mettre à jour l'état
          this.rechargerMessages();
        }
      },
      error: (err) => {
        // Enregistrer l'erreur
        this.actionResults.update(prev => ({ 
          ...prev, 
          [actionId]: { 
            success: false, 
            message: 'Erreur lors de la confirmation de l\'action' 
          } 
        }));
        
        // Retirer l'action du traitement en cours
        this.actionsEnCours.update(prev => {
          const copy = { ...prev };
          delete copy[actionId];
          return copy;
        });
      },
    });
  }

  /**
   * Rejeter une action IA
   */
  protected rejeterAction(actionId: string): void {
    this.aiActionService.rejeterAction(actionId).subscribe({
      next: (response) => {
        if (response.success) {
          // Recharger les messages pour mettre à jour l'état
          this.rechargerMessages();
          console.log('Action rejetée avec succès:', response.message);
        } else {
          console.error('Erreur rejet action:', response.message);
        }
      },
      error: (err) => {
        console.error('Erreur rejet action:', err);
      },
    });
  }

  /**
   * Recharger les messages de la conversation
   */
  private rechargerMessages(): void {
    const convId = this.conversationId();
    if (!convId) return;

    this.conversationService.getConversation(convId).subscribe({
      next: (conv) => {
        this.messages.set(conv.messages);
      },
      error: (err) => {
        console.error('Erreur rechargement messages:', err);
      },
    });
  }
}
