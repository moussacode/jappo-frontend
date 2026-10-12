import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AiSource, MessageIA } from '../../../core/models/conversation-ia.model';
import { environment } from '../../../environments/environment';
import { EntrepreneurAssistantService } from './entrepreneur-assistant.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Component({
  selector: 'app-entrepreneur-assistant-panel',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, TranslatePipe, MarkdownPipe],
  template: `
    <section
      class="flex min-h-0 flex-col overflow-hidden bg-surface text-ink"
      [class.h-full]="mode === 'page'"
      [class.rounded-2xl]="mode === 'widget'"
      [class.border]="mode === 'widget'"
      [class.border-line]="mode === 'widget'"
      [class.shadow-2xl]="mode === 'widget'"
      [attr.aria-label]="'entrepreneurAssistant.title' | translate"
      [attr.role]="mode === 'widget' ? 'dialog' : null"
    >
      <header class="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div class="min-w-0">
          <h2 class="truncate text-sm font-semibold">{{ 'entrepreneurAssistant.title' | translate }}</h2>
          @if (assistant.missionId()) {
            <p class="mt-0.5 text-xs text-ink-muted">
              {{ 'entrepreneurAssistant.missionContext' | translate }}
            </p>
          }
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <button
            type="button"
            (click)="assistant.startNewConversation()"
            class="rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
          >{{ 'entrepreneurAssistant.newConversation' | translate }}</button>
          @if (mode === 'widget') {
            <button
              type="button"
              (click)="close.emit()"
              [attr.aria-label]="'entrepreneurAssistant.close' | translate"
              class="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-accent"
            ><span aria-hidden="true">×</span></button>
          }
        </div>
      </header>

      <div class="flex min-h-0 flex-1">
        <aside class="hidden w-56 shrink-0 flex-col border-r border-line bg-surface-muted sm:flex">
          <h3 class="px-3 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {{ 'entrepreneurAssistant.history' | translate }}
          </h3>
          <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            @if (assistant.history().length === 0 && !assistant.loading()) {
              <p class="px-2 py-3 text-xs text-ink-muted">{{ 'entrepreneurAssistant.emptyHistory' | translate }}</p>
            }
            @for (conversation of assistant.history(); track conversation.id) {
              @if (!conversation.archivee) {
                <button
                  type="button"
                  (click)="assistant.openConversation(conversation.id)"
                  [class.bg-surface]="assistant.conversationId() === conversation.id"
                  [attr.aria-current]="assistant.conversationId() === conversation.id ? 'page' : null"
                  class="group mb-1 flex w-full items-center gap-1 rounded-lg px-2 py-2 text-left text-xs hover:bg-surface"
                >
                  <span class="min-w-0 flex-1 truncate">{{ conversation.titre || ('entrepreneurAssistant.untitled' | translate) }}</span>
                  <span class="text-[10px] text-ink-muted">{{ conversation.dateDerniereActivite || conversation.dateCreation | date:'shortDate' }}</span>
                </button>
              }
            }
          </div>
        </aside>

        <div class="flex min-h-0 min-w-0 flex-1 flex-col">
          @if (assistant.history().length > 0) {
            <label class="border-b border-line px-3 py-2 sm:hidden">
              <span class="sr-only">{{ 'entrepreneurAssistant.history' | translate }}</span>
              <select
                [value]="assistant.conversationId() ?? ''"
                (change)="onConversationSelect($event)"
                class="w-full rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink"
              >
                @for (conversation of assistant.history(); track conversation.id) {
                  @if (!conversation.archivee) {
                    <option [value]="conversation.id">
                      {{ conversation.titre || ('entrepreneurAssistant.untitled' | translate) }}
                    </option>
                  }
                }
              </select>
            </label>
          }
          <div #messageList class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5" aria-live="polite" aria-relevant="additions">
            @if (assistant.messages().length === 0 && !assistant.loading()) {
              <div class="mx-auto mt-8 max-w-md text-center">
                <div class="mx-auto mb-3 flex size-11 items-center justify-center rounded-2xl bg-accent/10 text-accent" aria-hidden="true">✦</div>
                <h3 class="text-base font-semibold">{{ 'entrepreneurAssistant.welcome' | translate }}</h3>
                <p class="mt-2 text-sm text-ink-muted">{{ 'entrepreneurAssistant.welcomeHint' | translate }}</p>
              </div>
            }
            @for (message of assistant.messages(); track message.id) {
              <article class="max-w-[92%]" [class.ml-auto]="message.auteur === 'COACH'">
                <div
                  class="rounded-2xl px-4 py-3 text-sm leading-6"
                  [class.bg-accent]="message.auteur === 'COACH'"
                  [class.text-white]="message.auteur === 'COACH'"
                  [class.bg-surface-muted]="message.auteur === 'ASSISTANT'"
                  [class.text-ink]="message.auteur === 'ASSISTANT'"
                >
                  <p class="whitespace-pre-wrap wrap-break-word" [innerHTML]="message.contenu | markdown"></p>
                  @if (message.auteur === 'ASSISTANT') {
                    @if (sourcesFor(message); as sources) {
                      @if (sources.length > 0) {
                        <div class="mt-3 border-t border-line/70 pt-2">
                          <p class="mb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                            {{ 'entrepreneurAssistant.sources' | translate }}
                          </p>
                          <ul class="space-y-2">
                            @for (source of sources; track source.id) {
                              <li>
                                <a
                                  [href]="source.url"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  (click)="openSource($event, source)"
                                  class="group block rounded-lg border border-line bg-surface px-3 py-2 hover:border-accent focus-visible:outline-2 focus-visible:outline-accent"
                                >
                                  <span class="flex items-center gap-1 text-xs font-semibold text-accent underline">
                                    {{ source.title }} <span aria-hidden="true">↗</span>
                                    <span class="sr-only">{{ 'entrepreneurAssistant.openSource' | translate }}</span>
                                  </span>
                                  @if (source.snippet) {
                                    <span class="mt-1 block text-xs leading-5 text-ink-muted">{{ source.snippet }}</span>
                                  }
                                </a>
                              </li>
                            }
                          </ul>
                        </div>
                      } @else {
                        <p class="mt-3 inline-flex rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                          {{ 'entrepreneurAssistant.generalAnswer' | translate }}
                        </p>
                      }
                    } @else {
                      <p class="mt-3 inline-flex rounded-full bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted">
                        {{ 'entrepreneurAssistant.generalAnswer' | translate }}
                      </p>
                    }
                  }
                </div>
                <time class="mt-1 block px-1 text-[10px] text-ink-muted" [class.text-right]="message.auteur === 'COACH'">
                  {{ message.dateEnvoi | date:'shortTime' }}
                </time>
              </article>
            }
            @if (assistant.sending()) {
              <p class="text-xs text-ink-muted" role="status">{{ 'entrepreneurAssistant.thinking' | translate }}</p>
            }
            @if (assistant.loading() && assistant.messages().length === 0) {
              <p class="text-xs text-ink-muted" role="status">{{ 'commun.chargement' | translate }}…</p>
            }
          </div>

          @if (assistant.error(); as errorKey) {
            <p class="mx-4 mb-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700" role="alert">{{ errorKey | translate }}</p>
          }
          <form (ngSubmit)="send()" class="border-t border-line p-3 sm:p-4">
            <label class="sr-only" for="entrepreneur-assistant-input">{{ 'entrepreneurAssistant.inputLabel' | translate }}</label>
            <div class="flex items-end gap-2 rounded-2xl border border-line bg-surface px-3 py-2 focus-within:border-accent">
              <textarea
                id="entrepreneur-assistant-input"
                name="message"
                [(ngModel)]="draft"
                (keydown.enter)="onEnter($event)"
                [placeholder]="'entrepreneurAssistant.placeholder' | translate"
                rows="1"
                class="max-h-32 min-h-8 flex-1 resize-y bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-muted"
              ></textarea>
              <button
                type="submit"
                [disabled]="assistant.sending() || !draft.trim()"
                [attr.aria-label]="'entrepreneurAssistant.send' | translate"
                class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              ><span aria-hidden="true">↑</span></button>
            </div>
            <p class="mt-2 text-center text-[10px] text-ink-muted">{{ 'entrepreneurAssistant.disclaimer' | translate }}</p>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class EntrepreneurAssistantPanel {
  @Input() mode: 'widget' | 'page' = 'widget';
  @Output() close = new EventEmitter<void>();

  protected readonly assistant = inject(EntrepreneurAssistantService);
  private readonly http = inject(HttpClient);
  protected draft = '';

  protected sourcesFor(message: MessageIA): AiSource[] {
    const raw = message.sources ?? message.sourcesJson;
    if (!raw) return [];
    try {
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const values: unknown[] = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && 'sources' in parsed && Array.isArray(parsed.sources)
          ? parsed.sources
          : parsed && typeof parsed === 'object' && 'url' in parsed
            ? [parsed]
          : [];
      return values.flatMap((entry): AiSource[] => {
        if (!isRecord(entry) || typeof entry['url'] !== 'string') return [];
        try {
          let url = new URL(entry['url'], environment.serverUrl || window.location.origin);
          if (url.protocol !== 'https:' && url.protocol !== 'http:') return [];
          const sourceId = String(entry['id'] ?? url.href);
          const backendOrigin = new URL(environment.serverUrl || window.location.origin).origin;
          if (
            url.origin === backendOrigin
            && /^\/fichiers\/ressources\/[^/]+\/[^/]+$/.test(url.pathname)
          ) {
            url = new URL(
              `/api/conversations/${encodeURIComponent(message.conversationId)}/sources/${encodeURIComponent(sourceId)}`,
              backendOrigin,
            );
          }
          return [{
            id: sourceId,
            title: String(entry['title'] ?? url.hostname),
            url: url.href,
            snippet: String(entry['snippet'] ?? ''),
          }];
        } catch {
          return [];
        }
      });
    } catch {
      return [];
    }
  }

  protected send(): void {
    const content = this.draft.trim();
    if (!content) return;
    this.draft = '';
    void this.assistant.sendMessage(content);
  }

  protected onConversationSelect(event: Event): void {
    const id = (event.target as HTMLSelectElement).value;
    if (id) void this.assistant.openConversation(id);
  }

  protected openSource(event: MouseEvent, source: AiSource): void {
    const sourceUrl = new URL(source.url);
    const backendOrigin = new URL(environment.serverUrl || window.location.origin).origin;
    const isProtectedUpload = sourceUrl.origin === backendOrigin
      && /^\/api\/conversations\/[^/]+\/sources\/[^/]+$/.test(sourceUrl.pathname);
    if (!isProtectedUpload) return;

    event.preventDefault();
    const sourceWindow = window.open('about:blank', '_blank');
    if (!sourceWindow) {
      this.assistant.error.set('entrepreneurAssistant.error.source');
      return;
    }
    sourceWindow.opener = null;
    this.assistant.error.set(null);

    void firstValueFrom(this.http.get(sourceUrl.href, { responseType: 'blob' }))
      .then((file) => {
        const fileUrl = URL.createObjectURL(file);
        sourceWindow.location.href = fileUrl;
        window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
      })
      .catch(() => {
        sourceWindow.close();
        this.assistant.error.set('entrepreneurAssistant.error.source');
      });
  }

  protected onEnter(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (!keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      this.send();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.mode === 'widget') this.close.emit();
  }
}
