import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  signal,
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

import {
  NotificationBellComponent,
} from '../notification-bell/notification-bell.component';

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
}


@Component({
  selector: 'app-sidebar',
  standalone: true,

  imports: [
    RouterLink,
    RouterLinkActive,
    Icon,
    ParametresModal,
    NotificationBellComponent,
    TranslatePipe,
  ],

  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <aside
      class="relative  flex h-full shrink-0 flex-col bg-surface p-3 sm:p-4 transition-all duration-300 ease-in-out select-none overflow-visible"
      [class.w-[260px]]="!collapsed()"
      [class.w-[80px]]="collapsed()"
    >

      <!-- Bouton Toggle Sidebar -->
      <button
        type="button"
        (click)="toggleCollapsed()"
        class="absolute -right-4 top-6 z-50 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-sm transition-all hover:bg-surface-muted hover:text-ink cursor-pointer"
        [attr.aria-label]="
          collapsed()
            ? ('sidebar.ouvrir' | translate)
            : ('sidebar.reduire' | translate)
        "
      >
        <app-icon
          name="sidebar-left"
          class="size-3.5 transition-transform duration-200"
          [class.rotate-180]="collapsed()"
        />
      </button>


      <!-- Sélecteur de Structure Multi-Tenant -->
      <div class="relative mb-4 sm:mb-6 shrink-0">

        @if (activeMembership(); as active) {

          <button
            type="button"
            (click)="toggleStructureMenu()"
            class="flex w-full items-center gap-2.5 rounded-xl border border-line bg-surface p-2 text-left transition-all hover:bg-surface-muted hover:border-line-strong focus:outline-none focus:ring-2 focus:ring-accent/20 cursor-pointer"
            [class.justify-center]="collapsed()"
            [title]="collapsed() ? active.structure.nom : ''"
            aria-haspopup="true"
            [attr.aria-expanded]="isStructureMenuOpen()"
          >

            <div
              class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-xs font-bold text-accent-strong uppercase shadow-xs"
            >
              {{ getStructureInitial(active.structure.nom) }}
            </div>

            @if (!collapsed()) {

              <div class="flex flex-1 flex-col min-w-0">

                <span
                  class="truncate text-xs font-semibold text-ink leading-tight"
                >
                  {{ active.structure.nom }}
                </span>

                <span
                  class="truncate text-[10px] text-ink-muted leading-tight mt-0.5"
                >
                  {{ getRoleTranslationKey(active.role) | translate }}
                </span>

              </div>

              <app-icon
                name="chevrons-up-down"
                class="size-3.5 shrink-0 text-ink-muted transition-transform duration-200"
                [class.rotate-180]="isStructureMenuOpen()"
              />
            }

          </button>


          @if (isStructureMenuOpen()) {

            <div
              class="absolute z-50 flex flex-col rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150"
              [class.left-0]="!collapsed()"
              [class.right-0]="!collapsed()"
              [class.top-[calc(100%+6px)]]="!collapsed()"
              [class.left-[calc(100%+12px)]]="collapsed()"
              [class.top-0]="collapsed()"
              [class.w-60]="collapsed()"
            >

              <div
                class="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted"
              >
                {{
                  'sidebar.espacesDeTravail'
                    | translate:{ count: memberships().length }
                }}
              </div>

              <div
                class="flex flex-col gap-0.5 max-h-56 overflow-y-auto custom-scrollbar"
              >

                @for (m of memberships(); track m.structure.id) {

                  <button
                    type="button"
                    (click)="switchStructure(m)"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-xs transition-colors cursor-pointer"
                    [class]="
                      m.structure.id === active.structure.id
                        ? 'bg-surface-muted text-ink font-semibold'
                        : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink'
                    "
                  >

                    <div
                      class="flex size-6 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent-strong uppercase"
                    >
                      {{ getStructureInitial(m.structure.nom) }}
                    </div>

                    <div class="flex flex-1 flex-col min-w-0">

                      <span class="truncate text-xs leading-tight">
                        {{ m.structure.nom }}
                      </span>

                      <span
                        class="truncate text-[10px] text-ink-muted leading-tight"
                      >
                        {{ getRoleTranslationKey(m.role) | translate }}
                      </span>

                    </div>

                    @if (m.structure.id === active.structure.id) {

                      <app-icon
                        name="check"
                        class="size-3.5 shrink-0 text-accent-strong"
                      />

                    }

                  </button>

                }

              </div>

            </div>

          }

        }

      </div>


      <!-- Navigation -->
      <div
        class="custom-scrollbar flex flex-1 flex-col overflow-y-auto pr-0.5"
      >

        <span
          class="block mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted transition-all"
          [class.px-3]="!collapsed()"
          [class.text-center]="collapsed()"
        >
          {{ 'sidebar.menu' | translate }}
        </span>


        <nav class="flex flex-col gap-1">

          @for (item of navItems(); track item.label) {

            <div class="relative">

              <!-- Navigation simple -->
              @if (!item.children || item.children.length === 0) {

                <a
                  [routerLink]="item.path"
                  routerLinkActive
                  #rla="routerLinkActive"
                  (click)="navClick.emit()"
                  class="flex  h-10 items-center rounded-xl px-3 text-xs font-medium transition-colors"
                  [class]="
                    rla.isActive
                      ? 'bg-surface-muted text-ink glass-button font-semibold shadow-xs'
                      : 'text-ink-muted hover:bg-surface-muted/60  hover:text-ink'
                  "
                  [class.justify-center]="collapsed()"
                  [class.px-0]="collapsed()"
                  [title]="
                    collapsed()
                      ? getNavLabel(item.label)
                      : ''
                  "
                >

                  <app-icon
                    [name]="item.icon"
                    class="size-4 shrink-0"
                  />

                  @if (!collapsed()) {

                    <span class="ml-3 truncate">
                      {{ item.label | translate }}
                    </span>

                  }

                </a>

              }


              <!-- Navigation avec sous-menu -->
              @else {

                <button
                  type="button"
                  (click)="toggleSubmenu(item.label)"
                  class="flex h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-medium text-ink-muted hover:bg-surface-muted/60 hover:text-ink transition-colors cursor-pointer"
                  [class.bg-surface-muted]="
                    isSubmenuOpen(item.label) && !collapsed()
                  "
                  [class.!text-ink]="
                    isSubmenuOpen(item.label) && !collapsed()
                  "
                  [class.justify-center]="collapsed()"
                  [class.px-0]="collapsed()"
                  [title]="
                    collapsed()
                      ? getNavLabel(item.label)
                      : ''
                  "
                >

                  <div class="flex items-center min-w-0">

                    <app-icon
                      [name]="item.icon"
                      class="size-4 shrink-0"
                    />

                    @if (!collapsed()) {

                      <span class="ml-3 truncate">
                        {{ item.label | translate }}
                      </span>

                    }

                  </div>


                  @if (!collapsed()) {

                    <app-icon
                      name="chevrons-up-down"
                      class="size-3.5 shrink-0 text-ink-muted transition-transform duration-200"
                      [class.rotate-180]="
                        isSubmenuOpen(item.label)
                      "
                    />

                  }

                </button>


                <!-- Sous-menu ouvert -->
                @if (
                  isSubmenuOpen(item.label) &&
                  !collapsed()
                ) {

                  <div
                    class="relative ml-5 my-1 flex flex-col gap-0.5 pl-3 border-l border-line"
                  >

                    @for (
                      child of item.children;
                      track child.path
                    ) {

                      <a
                        [routerLink]="child.path"
                        routerLinkActive
                        #childRla="routerLinkActive"
                        class="flex h-8 items-center rounded-lg px-2.5 text-xs font-medium transition-colors"
                        [class]="
                          childRla.isActive
                            ? 'bg-surface-muted text-ink font-semibold'
                            : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink'
                        "
                      >
                        {{ child.label | translate }}
                      </a>

                    }

                  </div>

                }


                <!-- Sous-menu en mode réduit -->
                @if (
                  isSubmenuOpen(item.label) &&
                  collapsed()
                ) {

                  <div
                    class="absolute left-[calc(100%+12px)] top-0 z-50 w-48 rounded-xl border border-line bg-surface p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150"
                  >

                    <div
                      class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-muted"
                    >
                      {{ item.label | translate }}
                    </div>


                    <div class="mt-1 flex flex-col gap-0.5">

                      @for (
                        child of item.children;
                        track child.path
                      ) {

                        <a
                          [routerLink]="child.path"
                          routerLinkActive
                          #popoverRla="routerLinkActive"
                          class="flex h-8 items-center rounded-lg px-2 text-xs font-medium transition-colors"
                          [class]="
                            popoverRla.isActive
                              ? 'bg-surface-muted text-ink font-semibold'
                              : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink'
                          "
                        >
                          {{ child.label | translate }}
                        </a>

                      }

                    </div>

                  </div>

                }

              }

            </div>

          }

        </nav>

      </div>


      <!-- Bloc Utilisateur -->
      <div
        class="relative mt-2 sm:mt-3 shrink-0 border-t border-line pt-2 sm:pt-3"
      >

        @if (currentUser(); as user) {

          <div
            class="flex items-center gap-2"
            [class.justify-center]="collapsed()"
          >

            <!-- Bouton Profil -->
            <button
              type="button"
              (click)="toggleProfileMenu()"
              class="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface p-2 transition-all hover:bg-surface-muted cursor-pointer"
              [class.flex-none]="collapsed()"
              [class.justify-center]="collapsed()"
            >

              <div
                class="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong uppercase"
              >

                {{ getUserInitial(user.prenom, user.nom) }}

                <span
                  class="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-surface"
                ></span>

              </div>


              @if (!collapsed()) {

                <div
                  class="flex flex-1 flex-col min-w-0 text-left"
                >

                  <span
                    class="truncate text-xs font-semibold text-ink leading-tight"
                  >
                    {{ user.prenom }} {{ user.nom }}
                  </span>

                  <span
                    class="truncate text-[10px] text-ink-muted leading-tight mt-0.5"
                  >
                    {{ user.email }}
                  </span>

                </div>


                <app-icon
                  name="chevrons-up-down"
                  class="size-3.5 text-ink-muted"
                />

              }

            </button>


            <!-- Notifications -->
            @if (!collapsed()) {

              <app-notification-bell />

            }

          </div>


          @if (collapsed()) {

            <div class="mt-2 flex justify-center">
              <app-notification-bell />
            </div>

          }


          <!-- Menu Dropdown Profil -->
          @if (isProfileMenuOpen()) {

            <div
              class="glass-modal  absolute bottom-[calc(100%+8px)] left-0 z-50 flex w-60 flex-col rounded-xl border border-line bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150"
            >

              <div
                class="px-2 py-1.5 border-b border-line mb-1"
              >
                <p
                  class="text-xs font-medium text-ink truncate"
                >
                  {{ user.email }}
                </p>
              </div>


              <!-- Paramètres & Aide -->
              @if (!isSuperAdmin()) {

                <button
                  type="button"
                  (click)="openSettings()"
                  class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                >

                  <app-icon
                    name="settings"
                    class="size-4 text-ink-muted"
                  />

                  <span>
                    {{ 'commun.parametres' | translate }}
                  </span>

                </button>


                <button
                  type="button"
                  (click)="openAssistance()"
                  class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <span>
                    {{ 'sidebar.aide' | translate }}
                  </span>
                </button>

              }


              <!-- Premium -->
              @if (!isSuperAdmin()) {

                @if (isPremium()) {

                  <div
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-accent"
                  >

                    <app-icon
                      name="sparkles"
                      class="size-4"
                    />

                    <span class="flex-1">
                      {{ 'sidebar.planPremium' | translate }}
                    </span>

                    <span class="text-[10px] font-semibold">
                      ✓
                    </span>

                  </div>

                } @else {

                  <button
                    type="button"
                    (click)="openUpgrade()"
                    class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-ink hover:bg-surface-muted transition-colors cursor-pointer mt-1"
                  >

                    <app-icon
                      name="sparkles"
                      class="size-4 text-ink-muted"
                    />

                    <span>
                      {{ 'sidebar.passerPremium' | translate }}
                    </span>

                  </button>

                }

              }


              <!-- Déconnexion -->
              <button
                type="button"
                (click)="logout()"
                class="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs font-medium text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer mt-1"
              >

                <app-icon
                  name="logout"
                  class="size-4"
                />

                <span>
                  {{ 'commun.seDeconnecter' | translate }}
                </span>

              </button>

            </div>

          }

        }

      </div>


      <!-- Modal Paramètres -->
      @if (isSettingsOpen()) {

        <app-parametres-modal
          (close)="isSettingsOpen.set(false)"
        />

      }

    </aside>
  `,
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
   * Émis après chaque clic sur un lien de navigation.
   * Le layout parent ferme le drawer mobile.
   */
  navClick = output<void>();


  collapsed = signal(false);

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

  protected readonly isPremium =
    this.structureContext.isPremium;


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


  toggleCollapsed(): void {
    this.collapsed.update(
      (value) => !value
    );

    this.isStructureMenuOpen.set(false);
    this.isProfileMenuOpen.set(false);
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

    this.router.navigate(['/login']);
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
}