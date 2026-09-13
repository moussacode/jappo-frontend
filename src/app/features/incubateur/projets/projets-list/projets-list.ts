import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet, StatutProjet } from '../../../../core/models';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ViewSwitcherComponent } from '../../../../shared/components/view-switcher/view-switcher.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";

export type VueMode = 'grid' | 'table';
export type FiltreStatutProjet = 'TOUS' | 'EN_INCUBATION' | 'DIAGNOSTIC' | 'IDEE' | 'DIPLOME';

@Component({
  selector: 'app-projets-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    ViewSwitcherComponent,
    TabFilterComponent,
    EntityCardComponent
],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page Unifié -->
    <!-- En-tête Page Unifié -->
<app-page-header
  title="Projets"
  [subtitle]="
    loading()
      ? 'Chargement des projets en cours...'
      : projetsFiltrees().length + ' projet(s) affiché(s) sur ' + allProjets().length
  "
  breadcrumb="Incubateur > Suivi des projets"
>
  <!-- Switcher Grille / Tableau -->
  <app-view-switcher
    [mode]="vueMode()"
    tableIcon="missions"
    (modeChange)="vueMode.set($event)"
  />

  <!-- Bouton de création -->
  <a routerLink="/incubateur/projets/nouveau">
    <app-button size="sm">
      <app-icon name="plus" class="size-4 mr-1.5" />
      <span class="hidden sm:inline">Nouveau projet</span>
    </app-button>
  </a>
</app-page-header>

      <!-- Barre de contrôles : Onglets + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <!-- Onglets par Statut -->
        <app-tab-filter
          [options]="optionsFiltreStatut()"
          [value]="filtreStatutActif()"
          (valueChange)="filtreStatutActif.set($event)"
        />

        <!-- Recherche réactive -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par nom, secteur, cohorte..."
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <app-card padding="md" class="animate-pulse flex flex-col justify-between gap-4 h-40">
              <div class="flex items-center justify-between">
                <div class="h-5 w-1/2 rounded bg-line"></div>
                <div class="h-5 w-16 rounded-full bg-line"></div>
              </div>
              <div class="h-4 w-3/4 rounded bg-line/60"></div>
              <div class="flex items-center justify-between border-t border-line pt-3">
                <div class="h-4 w-20 rounded bg-line"></div>
                <div class="h-4 w-12 rounded bg-line"></div>
              </div>
            </app-card>
          }
        </div>
      } @else {

        <!-- VUE 1 : GRILLE DE CARTES -->
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (p of projetsFiltrees(); track p.id) {
              <app-entity-card
  [title]="p.nom"
  [subtitle]="p.secteur"
  [routerLink]="['/incubateur/projets', p.id]"
  [badgeLabel]="statutBadge(p.statut).label"
  [badgeStatus]="statutBadge(p.statut).status"
>
  <!-- Corps spécifique au projet -->
  <div card-body class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <span class="text-ink-muted">Porteur :</span>
      <span class="font-semibold text-ink truncate">{{ p.nomEntrepreneur || '—' }}</span>
    </div>
    <div class="flex items-center justify-between gap-2">
      <span class="text-ink-muted">Cohorte :</span>
      <span class="font-medium text-ink truncate">{{ p.nomCohorte || 'Hors cohorte' }}</span>
    </div>
  </div>

  <!-- Pied de carte spécifique (Score de maturité) -->
  <div card-footer class="w-full flex items-center justify-between">
    <span class="font-medium text-ink-muted">Score de maturité</span>
    <div class="flex items-center gap-2">
      <div class="h-1.5 w-14 overflow-hidden rounded-full bg-line">
        <div class="h-full rounded-full bg-accent" [style.width.%]="p.scoreMaturite || 0"></div>
      </div>
      <span class="font-bold text-ink">{{ p.scoreMaturite || 0 }}%</span>
    </div>
  </div>
</app-entity-card>
            } @empty {
              <div class="col-span-full">
                <app-empty-state
                  title="Aucun projet trouvé"
                  description="Ajustez vos filtres de recherche ou créez un nouveau projet d'entreprise."
                  iconName="dashboard"
                >
                  <a routerLink="/incubateur/projets/nouveau">
                    <app-button size="xs">
                      <app-icon name="plus" class="size-3.5" />
                      <span>Nouveau projet</span>
                    </app-button>
                  </a>
                </app-empty-state>
              </div>
            }
          </div>
        }

        <!-- VUE 2 : TABLEAU / LISTE -->
        @if (vueMode() === 'table') {
          <app-card padding="none" class="w-full min-w-0">
            <div class="w-full overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[650px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-line bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                    <th class="w-4/12 px-5 py-3.5">Projet</th>
                    <th class="w-3/12 px-5 py-3.5">Porteur</th>
                    <th class="w-2/12 px-5 py-3.5">Cohorte</th>
                    <th class="w-2/12 px-5 py-3.5">Statut</th>
                    <th class="w-1/12 px-5 py-3.5 text-right">Maturité</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (p of projetsFiltrees(); track p.id) {
                    <tr class="group transition-colors hover:bg-surface-muted/40">
                      <!-- Nom & Secteur -->
                      <td class="px-5 py-3.5">
                        <div class="flex flex-col min-w-0">
                          <a 
                            [routerLink]="['/incubateur/projets', p.id]"
                            class="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent"
                          >
                            {{ p.nom }}
                          </a>
                          <span class="truncate text-[11px] text-ink-muted">
                            {{ p.secteur || 'Secteur non spécifié' }}
                          </span>
                        </div>
                      </td>

                      <!-- Porteur -->
                      <td class="px-5 py-3.5 font-medium text-ink truncate">
                        {{ p.nomEntrepreneur || '—' }}
                      </td>

                      <!-- Cohorte -->
                      <td class="px-5 py-3.5 text-ink-muted font-medium truncate">
                        {{ p.nomCohorte || 'Hors cohorte' }}
                      </td>

                      <!-- Statut Badge -->
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <app-badge [status]="statutBadge(p.statut).status" size="sm">
                          {{ statutBadge(p.statut).label }}
                        </app-badge>
                      </td>

                      <!-- Maturité -->
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-2">
                          <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                            <div 
                              class="h-full rounded-full bg-accent transition-all duration-300" 
                              [style.width.%]="p.scoreMaturite || 0"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-ink">{{ p.scoreMaturite || 0 }}%</span>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="p-8">
                        <app-empty-state
                          title="Aucun projet trouvé"
                          description="Ajustez vos filtres de recherche ou créez un nouveau projet d'entreprise."
                          iconName="dashboard"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </app-card>
        }

      }

    </div>
  `,
})
export class ProjetsList implements OnInit {
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vueMode = signal<VueMode>('table');
  protected readonly loading = signal<boolean>(true);
  protected readonly allProjets = signal<Projet[]>([]);
  protected readonly filtreStatutActif = signal<FiltreStatutProjet>('TOUS');

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerms = signal('');

  // Compteurs réactifs pour les onglets de filtres
  protected readonly compteIncubation = computed(() =>
    this.allProjets().filter((p) => p.statut === 'EN_INCUBATION' || p.statut === 'ACCOMPAGNE').length
  );

  protected readonly compteDiagnostic = computed(() =>
    this.allProjets().filter((p) => p.statut === 'DIAGNOSTIC').length
  );

  protected readonly compteIdeation = computed(() =>
    this.allProjets().filter((p) => p.statut === 'IDEE').length
  );

  protected readonly compteDiplomes = computed(() =>
    this.allProjets().filter((p) => p.statut === 'DIPLOME').length
  );

  // Configuration dynamique de TabFilterComponent
  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatutProjet>[]>(() => [
    { value: 'TOUS', label: 'Tous', count: this.allProjets().length },
    { value: 'EN_INCUBATION', label: 'En incubation', count: this.compteIncubation() },
    { value: 'DIAGNOSTIC', label: 'Diagnostic', count: this.compteDiagnostic() },
    { value: 'IDEE', label: 'Idéation', count: this.compteIdeation() },
    { value: 'DIPLOME', label: 'Diplômés', count: this.compteDiplomes() },
  ]);

  // Filtrage combiné (statut + texte)
  protected readonly projetsFiltrees = computed(() => {
    let result = this.allProjets();
    const query = this.searchTerms().toLowerCase().trim();
    const statut = this.filtreStatutActif();

    if (statut === 'EN_INCUBATION') {
      result = result.filter((p) => p.statut === 'EN_INCUBATION' || p.statut === 'ACCOMPAGNE');
    } else if (statut === 'DIAGNOSTIC') {
      result = result.filter((p) => p.statut === 'DIAGNOSTIC');
    } else if (statut === 'IDEE') {
      result = result.filter((p) => p.statut === 'IDEE');
    } else if (statut === 'DIPLOME') {
      result = result.filter((p) => p.statut === 'DIPLOME');
    }

    if (query) {
      result = result.filter(
        (p) =>
          p.nom?.toLowerCase().includes(query) ||
          p.secteur?.toLowerCase().includes(query) ||
          p.nomEntrepreneur?.toLowerCase().includes(query) ||
          p.nomCohorte?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerms.set(val));

    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allProjets.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement projets :', err);
          this.loading.set(false);
        },
      });
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
    switch (statut) {
      case 'EN_INCUBATION':
      case 'ACCOMPAGNE':
        return { status: 'success', label: 'En incubation' };
      case 'DIAGNOSTIC':
        return { status: 'info', label: 'Diagnostic' };
      case 'IDEE':
        return { status: 'neutral', label: 'Idéation' };
      case 'DIPLOME':
        return { status: 'info', label: 'Diplômé' };
      default:
        return { status: 'neutral', label: statut || 'Indéfini' };
    }
  }
}