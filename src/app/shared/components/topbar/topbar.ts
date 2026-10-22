import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';

import { Icon } from '../icon/icon';
import { NavItem } from '../sidebar/sidebar';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';
import { CommandPaletteService } from '../command-palette/command-palette.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';

/**
 * Barre supérieure vitrée des espaces connectés : menu mobile,
 * fil d'Ariane, recherche globale (⌘K), thème et notifications.
 */
@Component({
  selector: 'app-topbar',
  imports: [Icon, RouterLink, NotificationBellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-line/60 bg-surface-muted/50 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        (click)="menuClick.emit()"
        class="flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface hover:text-ink md:hidden"
        aria-label="Ouvrir le menu"
      >
        <app-icon name="menu" class="size-5" />
      </button>

      <nav aria-label="Fil d'Ariane" class="flex min-w-0 items-center gap-1.5 text-[13px]">
        <a [routerLink]="accueil()" class="hidden truncate text-ink-muted hover:text-ink sm:inline">{{ espace() }}</a>
        <span class="hidden text-ink-faint sm:inline-flex" aria-hidden="true"><app-icon name="chevron-right" class="size-3.5" /></span>
        <span class="truncate font-semibold text-ink" aria-current="page">{{ pageCourante() }}</span>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <button
          type="button"
          (click)="palette.open()"
          class="hidden h-8 w-56 items-center gap-2 rounded-lg border border-line/70 bg-surface/60 px-2.5 text-[13px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted lg:flex"
        >
          <app-icon name="search" class="size-4" />
          <span class="flex-1 text-left">Rechercher…</span>
          <span class="kbd">{{ raccourci }}</span>
        </button>
        <button
          type="button"
          (click)="palette.open()"
          class="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink lg:hidden"
          aria-label="Rechercher"
        >
          <app-icon name="search" class="size-4" />
        </button>

        <button
          type="button"
          (click)="theme.toggle()"
          class="flex size-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface hover:text-ink"
          [attr.aria-label]="sombre() ? 'Passer en thème clair' : 'Passer en thème sombre'"
        >
          @if (sombre()) {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" class="size-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
          } @else {
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="size-4"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>
          }
        </button>

        <app-notification-bell />
      </div>
    </header>
  `,
})
export class Topbar {
  protected readonly palette = inject(CommandPaletteService);
  protected readonly theme = inject(ThemeService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);

  navItems = input<NavItem[]>([]);
  /** Libellé racine du fil d'Ariane (ex. nom de la structure). */
  espace = input('JAPPO');
  menuClick = output<void>();
  /** URL affichée à la place de celle du routeur (aperçus des maquettes). */
  urlSimulee = input<string>();

  protected readonly raccourci = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';
  protected readonly sombre = computed(() => this.theme.appliedTheme() === 'dark');

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  protected readonly accueil = computed(() => this.navItems()[0]?.path ?? '/');

  /** Libellé de l'entrée de menu dont le chemin correspond le mieux à l'URL. */
  protected readonly pageCourante = computed(() => {
    const url = (this.urlSimulee() ?? this.url()).split('?')[0];
    const entrees = this.navItems().flatMap((i) => [
      ...(i.path ? [{ path: i.path, label: i.label }] : []),
      ...(i.children ?? []),
    ]);
    const match = entrees
      .filter((e) => url === e.path || url.startsWith(e.path + '/'))
      .sort((a, b) => b.path.length - a.path.length)[0];
    return match ? this.translation.t(match.label) : 'Tableau de bord';
  });
}
