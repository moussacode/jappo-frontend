import { Component, input, output } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

export type VueMode = 'grid' | 'table';

@Component({
  selector: 'app-view-switcher',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs">
      <!-- Bouton Vue Grille / Cartes -->
      <button
        type="button"
        (click)="modeChange.emit('grid')"
        [class]="
          mode() === 'grid'
            ? 'bg-action-fill text-white shadow-xs'
            : 'text-ink-muted hover:text-ink'
        "
        class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
        [title]="gridTitle()"
      >
        <app-icon [name]="gridIcon()" class="size-4" />
      </button>

      <!-- Bouton Vue Tableau / Liste -->
      <button
        type="button"
        (click)="modeChange.emit('table')"
        [class]="
          mode() === 'table'
            ? 'bg-action-fill text-white shadow-xs'
            : 'text-ink-muted hover:text-ink'
        "
        class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
        [title]="tableTitle()"
      >
        <app-icon [name]="tableIcon()" class="size-4" />
      </button>
    </div>
  `,
})
export class ViewSwitcherComponent {
  // Input réactif pour le mode actif
  mode = input.required<VueMode>();

  // Titres et Icônes configurables (avec valeurs par défaut)
  gridTitle = input<string>('Vue cartes');
  tableTitle = input<string>('Vue liste');
  gridIcon = input<IconName>('dashboard');
  tableIcon = input<IconName>('missions');

  // Événement d'émission de changement
  modeChange = output<VueMode>();
}