import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';

import { Icon, IconName } from '../icon/icon';
import { NavItem } from '../sidebar/sidebar';
import { CommandPaletteService } from './command-palette.service';
import { TranslationService } from '../../../core/services/translation.service';
import { ThemeService } from '../../../core/services/theme.service';

interface Commande {
  id: string;
  label: string;
  groupe: string;
  icon: IconName;
  run: () => void;
}

/**
 * Palette de commandes globale : navigation rapide entre les pages
 * de l'espace et actions courantes, au clavier (⌘K / Ctrl+K).
 */
@Component({
  selector: 'app-command-palette',
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (palette.isOpen()) {
      <div class="fixed inset-0 z-[60] flex items-start justify-center bg-black/30 px-4 pt-[12vh] backdrop-blur-sm" (click)="palette.close()">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Palette de commandes"
          class="lg-surface-strong lg-pop w-full max-w-xl overflow-hidden rounded-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-line px-4">
            <app-icon name="search" class="size-4.5 shrink-0 text-ink-faint" />
            <input
              #champ
              type="text"
              role="combobox"
              aria-controls="palette-resultats"
              [attr.aria-activedescendant]="'cmd-' + actif()"
              [value]="recherche()"
              (input)="onSaisie($any($event.target).value)"
              (keydown)="onClavier($event)"
              placeholder="Rechercher une page ou une action…"
              class="h-14 flex-1 text-sm text-ink outline-none placeholder:text-ink-faint"
              style="background: transparent; border: 0"
            />
            <span class="kbd">Échap</span>
          </div>

          <ul id="palette-resultats" role="listbox" class="max-h-[50vh] overflow-y-auto p-2">
            @for (cmd of resultats(); track cmd.id; let i = $index) {
              @if (i === 0 || resultats()[i - 1].groupe !== cmd.groupe) {
                <li class="px-2.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-ink-faint first:pt-1">{{ cmd.groupe }}</li>
              }
              <li
                [id]="'cmd-' + i"
                role="option"
                [attr.aria-selected]="i === actif()"
                (click)="executer(cmd)"
                (mousemove)="actif.set(i)"
                class="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm"
                [class]="i === actif() ? 'bg-accent-soft text-ink' : 'text-ink-muted'"
              >
                <span class="flex size-8 items-center justify-center rounded-lg border border-line bg-surface">
                  <app-icon [name]="cmd.icon" class="size-4" />
                </span>
                <span class="flex-1 truncate font-medium">{{ cmd.label }}</span>
                @if (i === actif()) {
                  <app-icon name="arrow-right" class="size-4 text-accent" />
                }
              </li>
            } @empty {
              <li class="px-4 py-10 text-center text-sm text-ink-muted">Aucun résultat pour « {{ recherche() }} »</li>
            }
          </ul>

          <div class="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[11px] text-ink-faint">
            <span class="flex items-center gap-1.5"><span class="kbd">↑</span><span class="kbd">↓</span> naviguer</span>
            <span class="flex items-center gap-1.5"><span class="kbd">↵</span> ouvrir</span>
          </div>
        </div>
      </div>
    }
  `,
})
export class CommandPalette {
  protected readonly palette = inject(CommandPaletteService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);
  private readonly theme = inject(ThemeService);

  /** Entrées de navigation de l'espace courant. */
  navItems = input<NavItem[]>([]);

  protected readonly recherche = signal('');
  protected readonly actif = signal(0);
  private readonly champ = viewChild<ElementRef<HTMLInputElement>>('champ');

  private readonly commandes = computed<Commande[]>(() => {
    const pages: Commande[] = this.navItems().flatMap((item) => {
      const label = this.translation.t(item.label);
      const enfants = (item.children ?? []).map((c) => ({
        id: c.path,
        label: `${label} › ${this.translation.t(c.label)}`,
        groupe: 'Pages',
        icon: item.icon,
        run: () => void this.router.navigateByUrl(c.path),
      }));
      return item.path
        ? [{ id: item.path, label, groupe: 'Pages', icon: item.icon, run: () => void this.router.navigateByUrl(item.path!) }, ...enfants]
        : enfants;
    });

    const actions: Commande[] = [
      {
        id: 'theme',
        label: this.theme.appliedTheme() === 'dark' ? 'Passer en thème clair' : 'Passer en thème sombre',
        groupe: 'Actions',
        icon: 'eye',
        run: () => this.theme.toggle(),
      },
      { id: 'aide', label: 'Centre d’aide', groupe: 'Actions', icon: 'book-open', run: () => void this.router.navigateByUrl('/assistance') },
    ];

    return [...pages, ...actions];
  });

  protected readonly resultats = computed(() => {
    const q = this.normaliser(this.recherche());
    return q ? this.commandes().filter((c) => this.normaliser(c.label).includes(q)) : this.commandes();
  });

  constructor() {
    effect(() => {
      if (this.palette.isOpen()) {
        this.recherche.set('');
        this.actif.set(0);
        queueMicrotask(() => this.champ()?.nativeElement.focus());
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  onRaccourci(event: KeyboardEvent): void {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.palette.toggle();
    } else if (event.key === 'Escape' && this.palette.isOpen()) {
      this.palette.close();
    }
  }

  protected onSaisie(valeur: string): void {
    this.recherche.set(valeur);
    this.actif.set(0);
  }

  protected onClavier(event: KeyboardEvent): void {
    const total = this.resultats().length;
    if (!total) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.actif.update((i) => (i + 1) % total);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.actif.update((i) => (i - 1 + total) % total);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      this.executer(this.resultats()[this.actif()]);
    }
  }

  protected executer(cmd: Commande): void {
    this.palette.close();
    cmd.run();
  }

  private normaliser(texte: string): string {
    return texte.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }
}
