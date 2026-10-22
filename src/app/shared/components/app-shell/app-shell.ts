import { ChangeDetectionStrategy, Component, computed, inject, input, viewChild } from '@angular/core';

import { NavItem, Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';
import { CommandPalette } from '../command-palette/command-palette';
import { StructureContextService } from '../../../core/services/structure-context.service';

/**
 * Coquille commune des espaces connectés (Entrepreneur, Incubateur,
 * Super-admin) : fond d'ambiance, sidebar vitrée, barre supérieure,
 * zone de contenu défilante et palette de commandes ⌘K.
 */
@Component({
  selector: 'app-shell',
  imports: [Sidebar, Topbar, CommandPalette],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full flex-col' },
  template: `
    <div class="app-ambient flex" [class]="integre() ? 'flex-1' : 'h-dvh min-h-0 overflow-hidden'">
      <app-sidebar #sidebar [navItems]="navItems()" [urlSimulee]="urlSimulee()" [class.!h-auto]="integre()" />

      <div class="flex min-h-0 min-w-0 flex-1 flex-col">
        <app-topbar [navItems]="navItems()" [espace]="espaceLabel()" [urlSimulee]="urlSimulee()" (menuClick)="sidebarRef()?.openMobile()" />
        <main id="contenu" class="min-h-0 flex-1" [class.overflow-y-auto]="!integre()">
          <ng-content />
        </main>
      </div>
    </div>

    @if (!integre()) {
      <app-command-palette [navItems]="navItems()" />
    }
  `,
})
export class AppShell {
  private readonly structureContext = inject(StructureContextService);

  navItems = input.required<NavItem[]>();
  /** Racine du fil d'Ariane ; par défaut, le nom de la structure active. */
  espace = input<string>();
  /** URL simulée transmise à la sidebar et à la barre supérieure (maquettes). */
  urlSimulee = input<string>();
  /** Remplit son conteneur au lieu de toute la fenêtre (aperçus des maquettes). */
  integre = input(false);

  protected readonly sidebarRef = viewChild<Sidebar>('sidebar');

  protected readonly espaceLabel = computed(
    () => this.espace() ?? this.structureContext.activeMembership()?.structure.nom ?? 'JAPPO',
  );
}
