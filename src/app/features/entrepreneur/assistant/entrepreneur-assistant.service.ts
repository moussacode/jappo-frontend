import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ConversationIA, MessageIA } from '../../../core/models/conversation-ia.model';
import { ConversationService } from '../../../core/services/conversation.service';
import { StructureContextService } from '../../../core/services/structure-context.service';
import { AbonnementService } from '../../../core/services/abonnement.service';
import { ErreurLimitePlan, lireErreurLimitePlan } from '../../../core/models/abonnement.model';

const SELECTED_CONVERSATION_KEY = 'jappo.entrepreneur-assistant.conversation';

@Injectable({ providedIn: 'root' })
export class EntrepreneurAssistantService {
  private readonly conversationsApi = inject(ConversationService);
  private readonly structureContext = inject(StructureContextService);
  private readonly abonnementService = inject(AbonnementService);
  private initialized = false;
  private initialization?: Promise<void>;

  readonly conversationId = signal<string | null>(null);
  readonly missionId = signal<string | null>(null);
  readonly messages = signal<MessageIA[]>([]);
  readonly history = signal<ConversationIA[]>([]);
  readonly loading = signal(false);
  readonly sending = signal(false);
  readonly error = signal<string | null>(null);

  /**
   * Accès à l'IA selon le plan de l'incubateur : false = assistant visible mais désactivé,
   * null = pas encore connu (on ne bloque rien à l'aveugle).
   */
  readonly iaDisponible = this.structureContext.iaDisponible;
  /** Limite du plan renvoyée par le serveur (reconnue par son code). */
  readonly limitePlan = signal<ErreurLimitePlan | null>(null);
  /** Libellé d'une offre qui inclut l'assistant pour les entrepreneurs, pour le message d'indisponibilité. */
  readonly offreAvecAssistant = signal<string | null>(null);
  private offreAvecAssistantChargee = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (!this.initialization) this.initialization = this.loadHistory();
    await this.initialization;
  }

  async ensureMissionConversation(missionId: string): Promise<void> {
    if (!missionId) return;
    this.missionId.set(missionId);
    await this.initialize();
    if (this.iaDisponible() === false) return;

    const active = this.activeConversation();
    if (active?.contexte?.missionId === missionId) return;

    const existing = this.history().find(
      (conversation) => !conversation.archivee && conversation.contexte?.missionId === missionId,
    );
    if (existing) {
      await this.openConversation(existing.id);
      return;
    }

    await this.createConversation(missionId);
  }

  async startNewConversation(): Promise<void> {
    await this.initialize();
    await this.createConversation(this.missionId());
  }

  async openConversation(id: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const conversation = await firstValueFrom(this.conversationsApi.getConversation(id));
      this.setActiveConversation(conversation);
    } catch {
      this.error.set('entrepreneurAssistant.error.load');
    } finally {
      this.loading.set(false);
    }
  }

  async sendMessage(content: string): Promise<void> {
    const normalized = content.trim();
    if (!normalized || this.sending() || this.iaDisponible() === false) return;
    this.error.set(null);
    this.limitePlan.set(null);
    this.sending.set(true);
    try {
      let id = this.conversationId();
      if (!id) {
        const conversation = await this.createConversation(this.missionId());
        if (!conversation) return;
        id = conversation.id;
      }
      const newMessages = await firstValueFrom(this.conversationsApi.sendMessage(id, normalized));
      this.messages.update((current) => [...current, ...newMessages]);
      this.structureContext.refreshUsage();
      const updated = await firstValueFrom(this.conversationsApi.getConversation(id));
      this.upsertHistory(updated);
    } catch (err) {
      if (!this.gererLimitePlan(err)) {
        this.error.set('entrepreneurAssistant.error.send');
      }
    } finally {
      this.sending.set(false);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    try {
      await firstValueFrom(this.conversationsApi.deleteConversation(id));
      this.history.update((history) => history.filter((conversation) => conversation.id !== id));
      if (this.conversationId() === id) {
        this.conversationId.set(null);
        this.messages.set([]);
        this.saveSelectedConversation(null);
      }
    } catch {
      this.error.set('entrepreneurAssistant.error.delete');
    }
  }

  private async loadHistory(): Promise<void> {
    this.loading.set(true);
    try {
      const conversations = await firstValueFrom(this.conversationsApi.listConversations());
      this.history.set(conversations ?? []);
      this.initialized = true;
      const savedId = this.readSelectedConversation();
      if (savedId && conversations.some((conversation) => conversation.id === savedId)) {
        await this.openConversation(savedId);
      }
    } catch {
      this.error.set('entrepreneurAssistant.error.history');
      this.initialized = true;
    } finally {
      this.loading.set(false);
    }
  }

  private async createConversation(missionId: string | null): Promise<ConversationIA | null> {
    if (this.iaDisponible() === false) return null;
    this.error.set(null);
    this.loading.set(true);
    try {
      const conversation = await firstValueFrom(
        this.conversationsApi.createConversation({
          contexte: missionId ? { missionId } : {},
        }),
      );
      this.setActiveConversation(conversation);
      return conversation;
    } catch (err) {
      if (!this.gererLimitePlan(err)) {
        this.error.set('entrepreneurAssistant.error.create');
      }
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  private setActiveConversation(conversation: ConversationIA): void {
    this.conversationId.set(conversation.id);
    this.missionId.set(conversation.contexte?.missionId ?? null);
    this.messages.set(conversation.messages ?? []);
    this.upsertHistory(conversation);
    this.saveSelectedConversation(conversation.id);
  }

  private upsertHistory(conversation: ConversationIA): void {
    this.history.update((history) => [
      conversation,
      ...history.filter((item) => item.id !== conversation.id),
    ]);
  }

  private activeConversation(): ConversationIA | undefined {
    const id = this.conversationId();
    return id ? this.history().find((conversation) => conversation.id === id) : undefined;
  }

  private saveSelectedConversation(id: string | null): void {
    if (typeof sessionStorage === 'undefined') return;
    if (id) sessionStorage.setItem(SELECTED_CONVERSATION_KEY, id);
    else sessionStorage.removeItem(SELECTED_CONVERSATION_KEY);
  }

  private readSelectedConversation(): string | null {
    return typeof sessionStorage === 'undefined'
      ? null
      : sessionStorage.getItem(SELECTED_CONVERSATION_KEY);
  }

  /** Charge (une seule fois) le libellé d'une offre incluant l'assistant pour les entrepreneurs. */
  chargerOffreAvecAssistant(): void {
    if (this.offreAvecAssistantChargee) return;
    this.offreAvecAssistantChargee = true;
    this.abonnementService.getPlansDisponibles().subscribe({
      next: (plans) => {
        const plan = [...plans]
          .sort((a, b) => a.ordre - b.ordre)
          .find((p) => p.iaEntrepreneurActive);
        this.offreAvecAssistant.set(plan?.libelle ?? null);
      },
      error: () => this.offreAvecAssistant.set(null),
    });
  }

  private gererLimitePlan(err: unknown): boolean {
    const limite = lireErreurLimitePlan(err);
    if (!limite) return false;
    this.limitePlan.set(limite);
    this.structureContext.refreshUsage();
    return true;
  }
}
