import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

/** Racines déjà affichées par la barre supérieure : inutile de les répéter dans la page. */
const RACINES = ['incubateur', 'entrepreneur', 'accueil', 'super-admin', 'administration'];

/**
 * En-tête de page compact : fil d'Ariane discret (fiches de détail),
 * titre, sous-titre sur une ligne et actions alignées à droite.
 */
@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div class="min-w-0 flex-1">
        @if (fil().length > 1) {
          <nav aria-label="Fil d'Ariane" class="mb-1 flex min-w-0 items-center gap-1 text-xs text-ink-muted">
            @for (item of fil(); track $index; let isLast = $last) {
              @if (item.path && !isLast) {
                <a [routerLink]="item.path" class="truncate transition-colors hover:text-ink">{{ item.label }}</a>
              } @else if (!isLast) {
                <span class="truncate">{{ item.label }}</span>
              }
              @if (!isLast && $index < fil().length - 2) {
                <span class="text-ink-faint" aria-hidden="true">/</span>
              }
            }
          </nav>
        }
        <h1 class="truncate text-xl font-semibold tracking-tight text-ink sm:text-[22px]">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-ink-muted sm:line-clamp-1">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex shrink-0 flex-wrap items-center gap-2 empty:hidden">
        <ng-content />
      </div>
    </header>
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  breadcrumb = input<string | BreadcrumbItem[]>();

  /**
   * Fil d'Ariane normalisé : accepte « A > B > C » ou un tableau et retire
   * la racine de l'espace (déjà dans la barre supérieure). Le dernier niveau
   * (la page courante) n'est pas répété : c'est le titre.
   */
  protected readonly fil = computed<BreadcrumbItem[]>(() => {
    const bc = this.breadcrumb();
    if (!bc) return [];
    const items: BreadcrumbItem[] =
      typeof bc === 'string'
        ? bc.split('>').map((label) => ({ label: label.trim() })).filter((i) => i.label)
        : bc;
    return items.filter((item, index) => !(index === 0 && RACINES.includes(item.label.trim().toLowerCase())));
  });
}
