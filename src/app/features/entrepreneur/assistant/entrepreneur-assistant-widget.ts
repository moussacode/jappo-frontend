import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EntrepreneurAssistantPanel } from './entrepreneur-assistant-panel';
import { EntrepreneurAssistantService } from './entrepreneur-assistant.service';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-entrepreneur-assistant-widget',
  standalone: true,
  imports: [EntrepreneurAssistantPanel, TranslatePipe],
  template: `
    @if (!isAssistantPage()) {
      <div class="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
        @if (isOpen()) {
          <div
            id="entrepreneur-assistant-dialog"
            class="h-[min(76dvh,44rem)] w-[calc(100vw-2rem)] max-w-[52rem] overflow-hidden sm:w-[min(92vw,52rem)]"
          >
            <app-entrepreneur-assistant-panel mode="widget" (close)="isOpen.set(false)" />
          </div>
        }
        <button
          type="button"
          (click)="isOpen.update(open => !open)"
          [attr.aria-expanded]="isOpen()"
          [attr.aria-controls]="isOpen() ? 'entrepreneur-assistant-dialog' : null"
          [attr.aria-label]="(isOpen() ? 'entrepreneurAssistant.close' : 'entrepreneurAssistant.open') | translate"
          class="flex min-h-12 items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span class="text-lg" aria-hidden="true">✦</span>
          <span class="hidden sm:inline">{{ 'entrepreneurAssistant.title' | translate }}</span>
          <span class="sr-only sm:hidden">{{ 'entrepreneurAssistant.title' | translate }}</span>
        </button>
      </div>
    }
  `,
})
export class EntrepreneurAssistantWidget implements OnInit {
  private readonly router = inject(Router);
  private readonly assistant = inject(EntrepreneurAssistantService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly isOpen = signal(false);

  ngOnInit(): void {
    void this.assistant.initialize();
    this.syncMissionContext();
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncMissionContext());
  }

  protected isAssistantPage(): boolean {
    return this.router.url.split(/[?#]/)[0] === '/entrepreneur/assistant';
  }

  private syncMissionContext(): void {
    const path = this.router.url.split(/[?#]/)[0];
    const match = path.match(/^\/entrepreneur\/missions\/([^/]+)$/);
    if (match) void this.assistant.ensureMissionConversation(decodeURIComponent(match[1]));
  }
}
