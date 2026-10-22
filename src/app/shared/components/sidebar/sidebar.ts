import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
  computed,
  inject,
  ElementRef,
  HostListener,
} from '@angular/core';

import {
  RouterLink,
  RouterLinkActive,
  Router,
} from '@angular/router';

import {
  IconName,
  Icon,
} from '../icon/icon';

import {
  StructureContextService,
} from '../../../core/services/structure-context.service';

import {
  AuthService,
  StructureMembership,
} from '../../../core/services/auth.service';

import {
  TranslationService,
} from '../../../core/services/translation.service';

import {
  ParametresModal,
} from '../parametres-modal/parametres-modal';

import { CommandPaletteService } from '../command-palette/command-palette.service';

import {
  TranslatePipe,
} from '../../pipes/translate.pipe';


export interface SubNavItem {
  label: string;
  path: string;
}

export interface NavItem {
  label: string;
  path?: string;
  icon: IconName;
  children?: SubNavItem[];
  /** Titre de section : les entrées consécutives partageant un groupe sont regroupées. */
  group?: string;
  /** Pastille de compteur affichée à droite du libellé. */
  badge?: string | number;
}


@Component({
  selector: 'app-sidebar',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    Icon,
    ParametresModal,
    TranslatePipe,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <!-- Fond semi-transparent (mobile uniquement, quand le tiroir est ouvert) -->
    @if (mobileOpen()) {
      <div class="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden" (click)="closeMobile()"></div>
    }

    <aside
      class="lg-surface fixed inset-y-0 left-0 z-40 flex h-dvh w-[272px] shrink-0 flex-col border-y-0 border-l-0 p-3 transition-[transform,width] duration-300 ease-out select-none md:relative md:z-30 md:h-full md:min-h-0 md:translate-x-0"
      [class.translate-x-0]="mobileOpen()"
      [class.-translate-x-full]="!mobileOpen()"
      [class.md:w-[272px]]="!collapsed()"
      [class.md:w-[76px]]="collapsed()"
      aria-label="Navigation principale"
    >

      <!-- Réduire / déplier (desktop) -->
      <button
        type="button"
        (click)="toggleCollapsed()"
        class="absolute -right-3 top-7 z-50 hidden size-6 items-center justify-center rounded-full border border-line bg-surface text-ink-muted transition-colors hover:text-ink md:flex"
        [attr.aria-label]="collapsed() ? ('sidebar.ouvrir' | translate) : ('sidebar.reduire' | translate)"
      >
        <app-icon name="chevron-left" class="size-3.5 transition-transform duration-200" [class.rotate-180]="collapsed()" />
      </button>

      <!-- Fermer (mobile) -->
      <button
        type="button"
        (click)="closeMobile()"
        class="absolute right-3 top-4 flex size-8 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted md:hidden"
        [attr.aria-label]="'sidebar.reduire' | translate"
      >
        <app-icon name="x" class="size-4" />
      </button>

      <!-- Sélecteur d'espace de travail (multi-structure) -->
      <div class="relative mb-3 shrink-0">
        @if (activeMembership(); as active) {
          <button
            type="button"
            (click)="toggleStructureMenu()"
            class="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-surface-muted/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
            [class.justify-center]="collapsed()"
            [title]="collapsed() ? active.structure.nom : ''"
            aria-haspopup="true"
            [attr.aria-expanded]="isStructureMenuOpen()"
          >
            <div class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-sm font-semibold text-ink uppercase ring-1 ring-white/20">
              {{ getStructureInitial(active.structure.nom) }}
            </div>
            @if (!collapsed()) {
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-[13px] font-semibold leading-tight text-ink">{{ active.structure.nom }}</span>
                <span class="mt-0.5 truncate text-[11px] leading-tight text-ink-muted">
                  {{ getRoleTranslationKey(active.role) | translate }}
                  @if (planEffectif(); as plan) { · {{ plan.libelle }} }
                </span>
              </div>
              <app-icon name="chevrons-up-down" class="size-3.5 shrink-0 text-ink-faint group-hover:text-ink-muted" />
            }
          </button>

          @if (isStructureMenuOpen()) {
            <div
              class="lg-surface-strong lg-pop absolute z-50 flex flex-col rounded-xl p-1.5"
              [class.left-0]="!collapsed()"
              [class.right-0]="!collapsed()"
              [class.top-[calc(100%+6px)]]="!collapsed()"
              [class.left-[calc(100%+12px)]]="collapsed()"
              [class.top-0]="collapsed()"
              [class.w-64]="collapsed()"
            >
              <div class="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {{ 'sidebar.espacesDeTravail' | translate:{ count: memberships().length } }}
              </div>
              <div class="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
                @for (m of memberships(); track m.structure.id) {
                  <button
                    type="button"
                    (click)="switchStructure(m)"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors"
                    [class]="m.structure.id === active.structure.id ? 'bg-accent-soft font-semibold text-ink' : 'text-ink-muted hover:bg-surface-muted hover:text-ink'"
                  >
                    <div class="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent-strong uppercase">
                      {{ getStructureInitial(m.structure.nom) }}
                    </div>
                    <div class="flex min-w-0 flex-1 flex-col">
                      <span class="truncate leading-tight">{{ m.structure.nom }}</span>
                      <span class="truncate text-[10px] leading-tight text-ink-muted">{{ getRoleTranslationKey(m.role) | translate }}</span>
                    </div>
                    @if (m.structure.id === active.structure.id) {
                      <app-icon name="check" class="size-3.5 shrink-0 text-accent" />
                    }
                  </button>
                }
              </div>
            </div>
          }
        } @else {
          <div class="flex items-center gap-3 p-2" [class.justify-center]="collapsed()">
            <div class="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-surface text-sm font-semibold text-ink">J</div>
            @if (!collapsed()) { <span class="text-sm font-bold tracking-tight text-ink">JAPPO</span> }
          </div>
        }
      </div>

      <!-- Recherche globale (⌘K) -->
      <button
        type="button"
        (click)="openPalette()"
        class="mb-4 flex h-9 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface/50 px-2.5 text-[13px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-muted"
        [class.justify-center]="collapsed()"
        title="Rechercher"
      >
        <app-icon name="search" class="size-4 shrink-0" />
        @if (!collapsed()) {
          <span class="flex-1 text-left">Rechercher</span>
          <span class="kbd">{{ raccourci }}</span>
        }
      </button>

      <!-- Navigation groupée -->
      <nav class="-mr-1 flex flex-1 flex-col gap-5 overflow-y-auto pr-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        @for (groupe of groupes(); track $index) {
          <div class="flex flex-col gap-0.5">
            @if (groupe.titre && !collapsed()) {
              <span class="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{{ groupe.titre }}</span>
            } @else if (groupe.titre) {
              <span class="mx-auto mb-1 h-px w-6 bg-line"></span>
            }

            @for (item of groupe.items; track item.label) {
              @if (!item.children || item.children.length === 0) {
                <a
                  [routerLink]="item.path"
                  routerLinkActive
                  #rla="routerLinkActive"
                  (click)="onNavItemClick()"
                  class="group relative flex h-9 items-center gap-3 rounded-[10px] px-2.5 text-[13px] transition-colors"
                  [class]="estActif(item.path, rla.isActive)
                    ? 'bg-surface font-semibold text-ink shadow-[inset_0_0_0_1px_var(--color-line)]'
                    : 'font-medium text-ink-muted hover:bg-surface-muted/70 hover:text-ink'"
                  [class.justify-center]="collapsed()"
                  [class.px-0]="collapsed()"
                  [attr.aria-current]="estActif(item.path, rla.isActive) ? 'page' : null"
                  [title]="collapsed() ? getNavLabel(item.label) : ''"
                >
                  @if (estActif(item.path, rla.isActive)) {
                    <span class="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent"></span>
                  }
                  <app-icon
                    [name]="item.icon"
                    class="size-4 shrink-0 transition-colors"
                    [class]="estActif(item.path, rla.isActive) ? 'text-accent' : 'text-ink-faint group-hover:text-ink-muted'"
                  />
                  @if (!collapsed()) {
                    <span class="flex-1 truncate">{{ item.label | translate }}</span>
                    @if (item.badge) {
                      <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 text-[10px] font-semibold text-accent-strong">{{ item.badge }}</span>
                    }
                  }
                </a>
              } @else {
                <button
                  type="button"
                  (click)="toggleSubmenu(item.label)"
                  class="group flex h-9 w-full items-center gap-3 rounded-[10px] px-2.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-surface-muted/70 hover:text-ink"
                  [class.justify-center]="collapsed()"
                  [class.px-0]="collapsed()"
                  [attr.aria-expanded]="isSubmenuOpen(item.label)"
                  [title]="collapsed() ? getNavLabel(item.label) : ''"
                >
                  <app-icon [name]="item.icon" class="size-4 shrink-0 text-ink-faint group-hover:text-ink-muted" />
                  @if (!collapsed()) {
                    <span class="flex-1 truncate text-left">{{ item.label | translate }}</span>
                    <app-icon name="chevron-right" class="size-3.5 text-ink-faint transition-transform duration-200" [class.rotate-90]="isSubmenuOpen(item.label)" />
                  }
                </button>

                @if (isSubmenuOpen(item.label) && !collapsed()) {
                  <div class="relative my-0.5 ml-[18px] flex flex-col gap-0.5 border-l border-line pl-3">
                    @for (child of item.children; track child.path) {
                      <a
                        [routerLink]="child.path"
                        routerLinkActive
                        #childRla="routerLinkActive"
                        (click)="onNavItemClick()"
                        class="flex h-8 items-center rounded-lg px-2.5 text-xs transition-colors"
                        [class]="estActif(child.path, childRla.isActive) ? 'bg-surface font-semibold text-ink' : 'font-medium text-ink-muted hover:bg-surface-muted/70 hover:text-ink'"
                      >{{ child.label | translate }}</a>
                    }
                  </div>
                }

                @if (isSubmenuOpen(item.label) && collapsed()) {
                  <div class="lg-surface-strong lg-pop absolute left-[calc(100%+12px)] z-50 w-52 rounded-xl p-1.5">
                    <div class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{{ item.label | translate }}</div>
                    @for (child of item.children; track child.path) {
                      <a
                        [routerLink]="child.path"
                        (click)="onNavItemClick()"
                        class="flex h-8 items-center rounded-lg px-2 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink"
                      >{{ child.label | translate }}</a>
                    }
                  </div>
                }
              }
            }
          </div>
        }
      </nav>

      <!-- Offre (admin de structure) -->
      @if (!collapsed() && !isSuperAdmin() && activeRole() === 'ADMIN_STRUCTURE' && planEffectif(); as plan) {
        <button
          type="button"
          (click)="openUpgrade()"
          class=" relative mt-3 shrink-0 overflow-hidden rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-accent/40"
        >
          <span class="flex items-center gap-2 text-xs font-semibold text-ink">
            <app-icon name="sparkles" class="size-4 text-accent" />
            {{ 'sidebar.offre' | translate }} {{ plan.libelle }}
          </span>
          <span class="mt-1 block text-[11px] font-medium text-accent">{{ 'sidebar.changerOffre' | translate }} →</span>
        </button>
      }

      <!-- Bloc utilisateur -->
      <div class="relative mt-3 shrink-0 border-t border-line pt-3">
        @if (currentUser(); as user) {
          <button
            type="button"
            (click)="toggleProfileMenu()"
            class="flex w-full min-w-0 items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-surface-muted/70"
            [class.justify-center]="collapsed()"
            aria-haspopup="true"
            [attr.aria-expanded]="isProfileMenuOpen()"
          >
            <div class="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong uppercase">
              {{ getUserInitial(user.prenom, user.nom) }}
              <span class="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface"></span>
            </div>
            @if (!collapsed()) {
              <div class="flex min-w-0 flex-1 flex-col">
                <span class="truncate text-xs font-semibold leading-tight text-ink">{{ user.prenom }} {{ user.nom }}</span>
                <span class="mt-0.5 truncate text-[11px] leading-tight text-ink-muted">{{ user.email }}</span>
              </div>
              <app-icon name="chevrons-up-down" class="size-3.5 text-ink-faint" />
            }
          </button>

          @if (isProfileMenuOpen()) {
            <div class="lg-surface-strong lg-pop absolute bottom-[calc(100%+8px)] left-0 z-50 flex w-60 flex-col rounded-xl p-1.5">
              <div class="mb-1 border-b border-line px-2 py-1.5">
                <p class="truncate text-xs font-semibold text-ink">{{ user.prenom }} {{ user.nom }}</p>
                <p class="truncate text-[11px] text-ink-muted">{{ user.email }}</p>
              </div>
              @if (!isSuperAdmin()) {
                <button type="button" (click)="openSettings()" class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-muted">
                  <app-icon name="settings" class="size-4 text-ink-muted" />
                  <span class="flex-1 text-left">{{ 'commun.parametres' | translate }}</span>
                </button>
                <button type="button" (click)="openAssistance()" class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-ink transition-colors hover:bg-surface-muted">
                  <app-icon name="book-open" class="size-4 text-ink-muted" />
                  <span class="flex-1 text-left">{{ 'sidebar.aide' | translate }}</span>
                </button>
              }
              <button type="button" (click)="logout()" class="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-500/10">
                <app-icon name="logout" class="size-4" />
                <span>{{ 'commun.seDeconnecter' | translate }}</span>
              </button>
            </div>
          }
        }
      </div>
    </aside>

    @if (isSettingsOpen()) {
      <app-parametres-modal (close)="isSettingsOpen.set(false)" />
    }
  `,
  styles: [`
    :host {
      display: block;
      flex: 0 0 auto;
      min-height: 0;
    }

    @media (min-width: 768px) {
      :host {
        height: 100%;
      }
    }
  `],
})
export class Sidebar {

  private readonly structureContext =
    inject(StructureContextService);

  private readonly authService =
    inject(AuthService);

  private readonly router =
    inject(Router);

  private readonly elementRef =
    inject(ElementRef);

  private readonly translationService =
    inject(TranslationService);


  navItems = input.required<NavItem[]>();

  /**
   * URL à considérer comme active à la place de celle du routeur
   * (aperçus des maquettes). Sans valeur, le routeur fait foi.
   */
  urlSimulee = input<string>();

  protected estActif(path: string | undefined, actifSelonRouteur: boolean): boolean {
    const url = this.urlSimulee();
    if (!url) return actifSelonRouteur;
    return !!path && (url === path || url.startsWith(path + '/'));
  }

  private readonly palette =
    inject(CommandPaletteService);

  protected readonly raccourci =
    /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K';

  /** Entrées regroupées par section consécutive (`group`). */
  protected readonly groupes = computed(() => {
    const groupes: { titre?: string; items: NavItem[] }[] = [];
    for (const item of this.navItems()) {
      const dernier = groupes[groupes.length - 1];
      if (dernier && dernier.titre === item.group) {
        dernier.items.push(item);
      } else {
        groupes.push({ titre: item.group, items: [item] });
      }
    }
    return groupes;
  });

  /**
   * Émis après chaque clic sur un lien de navigation.
   * Le layout parent ferme le drawer mobile.
   */
  navClick = output<void>();


  collapsed = signal(false);

  /** État du tiroir mobile (hors-écran par défaut). */
  mobileOpen = signal(false);

  isStructureMenuOpen = signal(false);

  isProfileMenuOpen = signal(false);

  isSettingsOpen = signal(false);

  openSubmenus =
    signal<Record<string, boolean>>({});


  protected readonly memberships =
    this.structureContext.memberships;

  protected readonly activeMembership =
    this.structureContext.activeMembership;

  protected readonly currentUser =
    this.authService.currentUser;

  protected readonly planEffectif =
    this.structureContext.planEffectif;

  protected readonly activeRole =
    this.structureContext.activeRole;


  protected isSuperAdmin(): boolean {
    return this.currentUser()?.roleGlobal === 'SUPER_ADMIN';
  }


  /**
   * Traduit un label de navigation.
   * Utilisé notamment pour le title en sidebar réduite.
   */
  protected getNavLabel(label: string): string {
    return this.translationService.t(label);
  }


  openPalette(): void {
    this.closeMobile();
    this.palette.open();
  }


  toggleCollapsed(): void {
    this.collapsed.update(
      (value) => !value
    );

    this.isStructureMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
  }


  openMobile(): void {
    // Le tiroir mobile s'ouvre toujours déplié, jamais en mode icône-rail.
    this.collapsed.set(false);
    this.mobileOpen.set(true);
  }


  closeMobile(): void {
    this.mobileOpen.set(false);
  }


  /**
   * Gère le clic sur un lien de navigation : ferme le tiroir mobile
   * et notifie le layout parent (pour compatibilité avec un éventuel
   * comportement additionnel, ex. drawer géré côté layout).
   */
  onNavItemClick(): void {
    this.closeMobile();
    this.navClick.emit();
  }


  toggleStructureMenu(): void {
    this.isStructureMenuOpen.update(
      (open) => !open
    );

    if (this.isStructureMenuOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }


  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update(
      (open) => !open
    );

    if (this.isProfileMenuOpen()) {
      this.isStructureMenuOpen.set(false);
    }
  }


  openSettings(): void {
    this.isProfileMenuOpen.set(false);
    this.isSettingsOpen.set(true);
  }


  openUpgrade(): void {
    this.isProfileMenuOpen.set(false);
    void this.router.navigate(['/upgrade']);
  }


  toggleSubmenu(label: string): void {
    this.openSubmenus.update(
      (state) => ({
        ...state,
        [label]: !state[label],
      })
    );
  }


  isSubmenuOpen(label: string): boolean {
    return !!this.openSubmenus()[label];
  }


  openAssistance(): void {
    this.isProfileMenuOpen.set(false);
    void this.router.navigate(['/assistance']);
  }


  switchStructure(
    membership: StructureMembership
  ): void {

    if (
      membership.structure.id ===
      this.activeMembership()?.structure.id
    ) {
      this.isStructureMenuOpen.set(false);
      return;
    }

    this.structureContext.setActiveStructure(
      membership
    );

    this.isStructureMenuOpen.set(false);

    window.location.reload();
  }


  logout(): void {
    this.isProfileMenuOpen.set(false);

    this.authService.logout();

    this.router.navigate(['/connexion']);
  }


  protected getStructureInitial(
    nom: string
  ): string {
    return nom
      ? nom.trim().charAt(0).toUpperCase()
      : 'S';
  }


  protected getUserInitial(
    prenom?: string,
    nom?: string
  ): string {

    const p = prenom
      ? prenom.charAt(0).toUpperCase()
      : '';

    const n = nom
      ? nom.charAt(0).toUpperCase()
      : '';

    return `${p}${n}` || 'U';
  }


  protected getRoleTranslationKey(
    role: string
  ): string {

    const roleKeys: Record<string, string> = {
      ADMIN_STRUCTURE: 'roles.adminStructure',
      COACH: 'roles.coach',
      ENTREPRENEUR: 'roles.entrepreneur',
      MEMBRE: 'roles.membre',
    };

    return roleKeys[role] ?? role;
  }


  @HostListener(
    'document:click',
    ['$event']
  )
  onClickOutside(event: Event): void {

    if (
      !this.elementRef.nativeElement.contains(
        event.target
      )
    ) {
      this.isStructureMenuOpen.set(false);
      this.isProfileMenuOpen.set(false);
    }
  }


  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMobile();
    this.isStructureMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
  }
}