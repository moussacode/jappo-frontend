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
import { CommonModule, JsonPipe, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { ConversationService } from '../../../../core/services/conversation.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { AiActionService } from '../../../../core/services/ai-action.service';
import { VoiceService } from '../../../../core/services/voice.service';

import {
  ConversationContexte,
  ConversationIA,
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
  imports: [CommonModule, ButtonComponent, JsonPipe, RouterLink, DatePipe],
  templateUrl: './assistant-ia.html',
})
export class AssistantIa implements OnInit {

  // ── Services ──────────────────────────────────────────────────────────────

  private readonly cohorteService       = inject(CohorteService);
  private readonly projetService        = inject(ProjetService);
  private readonly conversationService  = inject(ConversationService);
  private readonly structureContext     = inject(StructureContextService);
  private readonly aiActionService      = inject(AiActionService);
  private readonly voiceService         = inject(VoiceService);
  private readonly destroyRef           = inject(DestroyRef);

  // ── Vue ───────────────────────────────────────────────────────────────────

  private readonly messagesContainer =
    viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  // ── État conversation ─────────────────────────────────────────────────────

  /** ID de la conversation en cours — null jusqu'au premier envoi */
  protected  readonly conversationId = signal<string | null>(null);

  protected readonly messages      = signal<MessageIA[]>([]);
  protected readonly envoiEnCours  = signal(false);

  /** Erreur à afficher à l'utilisateur (structure manquante, réseau...) */
  protected readonly erreur = signal<string | null>(null);

  // ── Sidebar historique ────────────────────────────────────────────────────

  /** Liste de toutes les conversations de la structure */
  protected readonly historique = signal<ConversationIA[]>([]);

  /** Indique si la sidebar est réduite */
  protected readonly sidebarCollapsed = signal(false);

  /** Indique le chargement de la liste */
  protected readonly loadingHistory = signal(false);

  /** Renommage en ligne */
  protected readonly renommageEnCours    = signal(false);
  protected readonly renommageValeur     = signal('');
  private renommageConvId: string | null = null;

  /** Titre de la conversation active pour l'en-tête */
  protected readonly titreConversationActif = computed(() => {
    const id = this.conversationId();
    if (!id) return null;
    return this.historique().find(c => c.id === id)?.titre ?? null;
  });

  /**
   * Conversations regroupées par période (Aujourd'hui / Hier / Plus ancien)
   * pour l'affichage dans la sidebar.
   */
  protected readonly conversationsParJour = computed(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const todayItems:     ConversationIA[] = [];
    const yesterdayItems: ConversationIA[] = [];
    const olderItems:     ConversationIA[] = [];

    for (const conv of this.historique()) {
      if (conv.archivee) continue;
      const d = new Date(conv.dateDerniereActivite ?? conv.dateCreation);
      const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (day.getTime() === today.getTime()) {
        todayItems.push(conv);
      } else if (day.getTime() === yesterday.getTime()) {
        yesterdayItems.push(conv);
      } else {
        olderItems.push(conv);
      }
    }

    const groupes: { label: string; conversations: ConversationIA[] }[] = [];
    if (todayItems.length)     groupes.push({ label: "Aujourd'hui", conversations: todayItems });
    if (yesterdayItems.length) groupes.push({ label: 'Hier',        conversations: yesterdayItems });
    if (olderItems.length)     groupes.push({ label: 'Plus ancien', conversations: olderItems });
    return groupes;
  });

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

  // ── Microphone (Phase 5) ──────────────────────────────────────────────────

  /** État du microphone exposé depuis VoiceService */
  protected readonly micState = this.voiceService.micState;
  protected readonly micError = this.voiceService.micError;

  /** true si le service vocal est disponible dans ce navigateur */
  protected readonly micSupported = this.voiceService.isSupported;

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
    this.cohorteService
      .getCohortes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (c) => this.cohortes.set(c), error: () => {} });

    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => this.projets.set(p), error: () => {} });

    // Charger l'historique des conversations
    this.chargerHistorique();
  }

  // ── Historique sidebar ────────────────────────────────────────────────────

  private chargerHistorique(): void {
    this.loadingHistory.set(true);
    this.conversationService
      .listConversations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          // Trier par activité la plus récente en premier
          const sorted = [...list].sort((a, b) => {
            const da = new Date(a.dateDerniereActivite ?? a.dateCreation).getTime();
            const db = new Date(b.dateDerniereActivite ?? b.dateCreation).getTime();
            return db - da;
          });
          this.historique.set(sorted);
          this.loadingHistory.set(false);
        },
        error: () => this.loadingHistory.set(false),
      });
  }

  /** Ouvrir une conversation existante depuis la sidebar */
  protected ouvrirConversation(conv: ConversationIA): void {
    this.conversationId.set(conv.id);
    this.messages.set(conv.messages ?? []);
    this.contextChips.set(this.buildChipsFromContexte(conv.contexte));
    this.erreur.set(null);
    this.scrollToBottom();
  }

  /** Démarrer une nouvelle conversation vide */
  protected nouvelleConversation(): void {
    this.conversationId.set(null);
    this.messages.set([]);
    this.contextChips.set([]);
    this.saisie.set('');
    this.erreur.set(null);
  }

  /** Charger une conversation si on n'a que son ID (après création) */
  private ajouterAuHistorique(conv: ConversationIA): void {
    this.historique.update(list => {
      const existe = list.some(c => c.id === conv.id);
      if (existe) return list.map(c => c.id === conv.id ? conv : c);
      return [conv, ...list];
    });
  }

  // ── Renommage ─────────────────────────────────────────────────────────────

  protected demanderRenommage(conv: ConversationIA): void {
    this.renommageConvId  = conv.id;
    this.renommageValeur.set(conv.titre ?? '');
    this.renommageEnCours.set(true);
  }

  protected validerRenommage(): void {
    const id    = this.renommageConvId;
    const titre = this.renommageValeur().trim();
    if (!id || !titre) { this.annulerRenommage(); return; }

    this.conversationService
      .renameConversation(id, titre)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.historique.update(list => list.map(c => c.id === id ? { ...c, titre: updated.titre } : c));
          this.annulerRenommage();
        },
        error: () => this.annulerRenommage(),
      });
  }

  protected annulerRenommage(): void {
    this.renommageEnCours.set(false);
    this.renommageConvId = null;
    this.renommageValeur.set('');
  }

  // ── Suppression ───────────────────────────────────────────────────────────

  protected supprimerConversation(id: string): void {
    if (!confirm('Supprimer définitivement cette conversation ?')) return;

    this.conversationService
      .deleteConversation(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.historique.update(list => list.filter(c => c.id !== id));
          if (this.conversationId() === id) {
            this.nouvelleConversation();
          }
        },
        error: () => {},
      });
  }

  // ── Helper inverse chips → contexte ──────────────────────────────────────

  private buildChipsFromContexte(ctx: ConversationContexte): ContexteChip[] {
    const chips: ContexteChip[] = [];
    if (ctx?.cohorteId) {
      const c = this.cohortes().find(x => x.id === ctx.cohorteId);
      if (c) chips.push({ type: 'COHORTE', id: c.id, label: c.nom });
    }
    if (ctx?.projetId) {
      const p = this.projets().find(x => x.id === ctx.projetId);
      if (p) chips.push({ type: 'PROJET', id: p.id, label: p.nom });
    }
    return chips;
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
            // Ajouter immédiatement à la sidebar
            this.ajouterAuHistorique(conv);
            this.doSendMessage(conv.id, contenu, tempId);
          },
          error: (err) => {
            this.messages.update((msgs) => msgs.filter((m) => m.id !== tempId));
            this.envoiEnCours.set(false);
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
          // Rafraîchir la conversation dans la sidebar (titre auto-généré après 1er message)
          this.conversationService.getConversation(convId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (conv) => this.ajouterAuHistorique(conv),
              error: () => {},
            });
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

  // ── Microphone ────────────────────────────────────────────────────────────

  /**
   * Bascule l'enregistrement :
   * - Si idle  → démarre l'enregistrement
   * - Si recording → arrête et transcrit
   */
  protected async basculerMicro(): Promise<void> {
    const state = this.micState();

    if (state === 'recording') {
      // Arrêter et transcrire
      this.voiceService.stopRecording();
      return;
    }

    if (state !== 'idle') return; // Ne pas démarrer si processing/error/requesting

    // Démarrer l'enregistrement
    let blobPromise: Promise<Blob>;
    try {
      blobPromise = this.voiceService.startRecording();
    } catch {
      return; // L'erreur est déjà dans micError via VoiceService
    }

    // Attendre la fin de l'enregistrement, puis transcrire
    const blob = await blobPromise;

    if (blob.size === 0) {
      this.voiceService.reset();
      return;
    }

    // Transcription
    this.voiceService.transcribe(blob)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (response.success && response.text.trim()) {
            // Injecter le texte dans le champ de saisie
            // L'utilisateur peut lire, corriger puis appuyer sur Entrée
            this.saisie.set(response.text.trim());
            this.autoResizeTextarea();
          } else {
            this.voiceService.micError.set('Aucun texte reconnu. Réessayez.');
          }
          this.voiceService.reset();
        },
        error: () => {
          this.voiceService.micError.set(
            'Impossible de contacter le service vocal. Vérifiez que jappo-voice est démarré sur le port 8001.'
          );
          this.voiceService.reset();
        },
      });
  }

  /**
   * Annule l'enregistrement en cours sans transcrire.
   */
  protected annulerMicro(): void {
    this.voiceService.cancelRecording();
  }

  private autoResizeTextarea(): void {
    setTimeout(() => {
      const ta = document.querySelector<HTMLTextAreaElement>('textarea');
      if (ta) {
        ta.style.height = 'auto';
        ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
      }
    });
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
