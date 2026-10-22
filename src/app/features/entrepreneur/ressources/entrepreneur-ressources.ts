import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { Icon } from '../../../shared/components/icon/icon';
import { Ressource, PorteeRessource } from '../../../core/models/ressource.model';
import { RessourceService } from '../../../core/services/ressource.service';

@Component({
  selector: 'app-entrepreneur-ressources',
  standalone: true,
  imports: [TranslatePipe, Icon],
  template: `
    <section class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <header class="flex flex-col gap-2">
        <p class="text-xs font-semibold uppercase tracking-wider text-accent">
          {{ 'entrepreneur.ressources.eyebrow' | translate }}
        </p>
        <h1 class="text-xl font-semibold tracking-tight text-ink sm:text-[22px]">
          {{ 'entrepreneur.ressources.title' | translate }}
        </h1>
        <p class="max-w-2xl text-sm leading-6 text-ink-muted">
          {{ 'entrepreneur.ressources.description' | translate }}
        </p>
      </header>

      <div class="flex flex-col gap-3 sm:flex-row">
        <label class="relative flex-1">
          <span class="sr-only">{{ 'entrepreneur.ressources.search' | translate }}</span>
          <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-10 pr-3 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
            [placeholder]="'entrepreneur.ressources.search' | translate"
            [value]="search()"
            (input)="search.set($any($event.target).value)"
          />
        </label>
        <label class="flex items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <span class="text-xs font-medium text-ink-muted">{{ 'entrepreneur.ressources.filter' | translate }}</span>
          <select
            class="min-w-32 bg-transparent py-2 text-sm text-ink outline-none"
            [value]="scopeFilter()"
            (change)="scopeFilter.set($any($event.target).value)"
          >
            <option value="ALL">{{ 'entrepreneur.ressources.allScopes' | translate }}</option>
            @for (scope of scopes; track scope) {
              <option [value]="scope">{{ ('ressources.portee.' + scope) | translate }}</option>
            }
          </select>
        </label>
      </div>

      @if (fileError()) {
        <p class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {{ 'entrepreneur.ressources.fileError' | translate }}
        </p>
      }

      @if (loading()) {
        <div class="rounded-2xl border border-line bg-surface p-10 text-center text-sm text-ink-muted" role="status">
          {{ 'entrepreneur.ressources.loading' | translate }}
        </div>
      } @else if (error()) {
        <div class="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          {{ 'entrepreneur.ressources.error' | translate }}
          <button type="button" class="ml-2 font-semibold underline" (click)="load()">
            {{ 'entrepreneur.ressources.retry' | translate }}
          </button>
        </div>
      } @else if (filteredResources().length === 0) {
        <div class="rounded-2xl border border-dashed border-line bg-surface p-10 text-center">
          <app-icon name="book-open" class="mx-auto mb-3 size-8 text-ink-muted" />
          <h2 class="text-base font-semibold text-ink">{{ 'entrepreneur.ressources.emptyTitle' | translate }}</h2>
          <p class="mt-1 text-sm text-ink-muted">{{ 'entrepreneur.ressources.emptyDescription' | translate }}</p>
        </div>
      } @else {
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          @for (resource of filteredResources(); track resource.id) {
            <article class="flex min-w-0 flex-col rounded-2xl border border-line bg-surface p-5">
              <div class="flex items-start gap-3">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-strong">
                  <app-icon [name]="isFile(resource) ? 'file-text' : 'link'" class="size-5" />
                </span>
                <div class="min-w-0 flex-1">
                  <h2 class="truncate text-sm font-semibold text-ink" [title]="resource.titre">{{ resource.titre }}</h2>
                  <span class="mt-1 inline-flex rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-muted">
                    {{ ('ressources.portee.' + resource.portee) | translate }}
                  </span>
                </div>
              </div>

              @if (resource.description) {
                <p class="mt-4 line-clamp-3 text-sm leading-5 text-ink-muted">{{ resource.description }}</p>
              }
              @if (resource.nomCohorte || resource.nomParcours || resource.nomPhase) {
                <p class="mt-3 text-xs text-ink-muted">
                  {{ scopeNames(resource) }}
                </p>
              }

              <div class="mt-auto pt-5">
                @if (isFile(resource)) {
                  <button
                    type="button"
                    class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent disabled:cursor-wait disabled:opacity-60"
                    [disabled]="openingId() === resource.id"
                    (click)="openFile(resource)"
                  >
                    <app-icon name="external-link" class="size-4" />
                    {{ (openingId() === resource.id ? 'entrepreneur.ressources.opening' : 'ressources.ouvrir') | translate }}
                  </button>
                } @else if (safeExternalUrl(resource.url); as externalUrl) {
                  <a
                    class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface/70 px-4 py-2 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
                    [href]="externalUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <app-icon name="external-link" class="size-4" />
                    {{ 'ressources.ouvrir' | translate }}
                  </a>
                } @else {
                  <p class="text-xs text-ink-muted">{{ 'entrepreneur.ressources.unavailable' | translate }}</p>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
})
export class EntrepreneurRessources implements OnInit {
  private readonly ressourceService = inject(RessourceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly scopes: PorteeRessource[] = ['STRUCTURE', 'COHORTE', 'PARCOURS', 'PHASE', 'MISSION'];
  protected readonly resources = signal<Ressource[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly fileError = signal(false);
  protected readonly search = signal('');
  protected readonly scopeFilter = signal('ALL');
  protected readonly openingId = signal<string | null>(null);
  private readonly objectUrls = new Set<string>();

  protected readonly filteredResources = computed(() => {
    const query = this.search().trim().toLocaleLowerCase();
    const scope = this.scopeFilter();
    return this.resources().filter((resource) => {
      const matchesScope = scope === 'ALL' || resource.portee === scope;
      const searchable = `${resource.titre} ${resource.description ?? ''} ${resource.nomCohorte ?? ''} ${resource.nomParcours ?? ''} ${resource.nomPhase ?? ''}`
        .toLocaleLowerCase();
      return matchesScope && (!query || searchable.includes(query));
    });
  });

  ngOnInit(): void {
    this.load();
    this.destroyRef.onDestroy(() => {
      for (const url of this.objectUrls) URL.revokeObjectURL(url);
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.fileError.set(false);
    this.ressourceService.getAccessibleForEntrepreneur()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resources) => {
          this.resources.set(resources.filter((resource) => !resource.archivee));
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  protected isFile(resource: Ressource): boolean {
    return Boolean(resource.nomFichier)
      || /^\/fichiers\/ressources\/[^/]+\/[^/]+$/.test(resource.url ?? '');
  }

  protected scopeNames(resource: Ressource): string {
    return [resource.nomCohorte, resource.nomParcours, resource.nomPhase]
      .filter((name): name is string => Boolean(name))
      .join(' · ');
  }

  protected safeExternalUrl(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  }

  protected openFile(resource: Ressource): void {
    const preview = window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    this.openingId.set(resource.id);
    this.ressourceService.getEntrepreneurFile(resource.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.objectUrls.add(url);
          if (preview) {
            preview.location.href = url;
          } else {
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
          }
          this.openingId.set(null);
          window.setTimeout(() => {
            URL.revokeObjectURL(url);
            this.objectUrls.delete(url);
          }, 60_000);
        },
        error: () => {
          preview?.close();
          this.openingId.set(null);
          this.fileError.set(true);
        },
      });
  }
}
