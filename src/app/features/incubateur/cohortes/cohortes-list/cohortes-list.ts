import { Component, inject, signal, computed, effect, DestroyRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte, Projet, StatutCohorte } from '../../../../core/models';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ViewSwitcherComponent } from '../../../../shared/components/view-switcher/view-switcher.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";

interface CohorteAffichee {
  cohorte: Cohorte;
  nbProjets: number;
  scoreMoyen: number;
}

export type VueMode = 'grid' | 'table';
export type FiltreStatutCohorte = 'TOUS' | 'EN_COURS' | 'A_VENIR' | 'TERMINEE';

@Component({
  selector: 'app-cohortes-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icon,
    BadgeComponent,
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
      
      <!-- En-tête Page -->
      <app-page-header
        title="Cohortes"
        [subtitle]="
          isLoading()
            ? 'Chargement des cohortes en cours...'
            : cohortesFiltrees().length + ' cohorte(s) affichée(s) sur ' + cohortes().length
        "
      >
        <!-- Switcher Grille / Tableau unifié -->
        <app-view-switcher
          [mode]="vueMode()"
          tableIcon="missions"
          (modeChange)="vueMode.set($event)"
        />

        <!-- Bouton Création -->
        <a routerLink="/incubateur/cohortes/nouvelle">
          <app-button size="sm">
            <app-icon name="plus" class="size-4" />
            <span class="hidden sm:inline">Nouvelle cohorte</span>
          </app-button>
        </a>
      </app-page-header>

      <!-- Barre de contrôles : Filtres Statuts + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        <!-- Onglets par Statut -->
        <app-tab-filter
          [options]="optionsFiltreStatut()"
          [value]="filtreStatut()"
          (valueChange)="filtreStatut.set($event)"
        />

        <!-- Recherche réactive -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par nom, description..."
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- Chargement Skeleton -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <app-card padding="md" class="animate-pulse">
              <div class="flex items-center justify-between">
                <div class="h-5 w-1/2 rounded-md bg-line"></div>
                <div class="h-5 w-16 rounded-full bg-line"></div>
              </div>
              <div class="my-4 h-10 w-full rounded-md bg-line/60"></div>
              <div class="flex items-center justify-between border-t border-line pt-3">
                <div class="h-4 w-20 rounded-md bg-line"></div>
                <div class="h-4 w-12 rounded-md bg-line"></div>
              </div>
            </app-card>
          }
        </div>
      } @else {
        
        <!-- VUE 1 : GRILLE DE CARTES AVEC ENTITY-CARD -->
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of cohortesFiltrees(); track item.cohorte.id) {
              <app-entity-card
                [title]="item.cohorte.nom"
                [subtitle]="formatDate(item.cohorte.dateDebut) + ' — ' + formatDate(item.cohorte.dateFin)"
                [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                [badgeLabel]="statutBadge(item.cohorte.statut).label"
                [badgeStatus]="statutBadge(item.cohorte.statut).status"
              >
                <!-- Corps de la carte : Description & Badge Projets -->
                <div card-body class="flex flex-col gap-2">
                  <div class="flex items-center justify-between">
                    <span class="text-xs text-ink-muted">Startups / Projets :</span>
                    <span class="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent-strong">
                      {{ item.nbProjets }} {{ item.nbProjets > 1 ? 'projets' : 'projet' }}
                    </span>
                  </div>

                  <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {{ item.cohorte.description || 'Aucune description disponible pour cette cohorte.' }}
                  </p>
                </div>

                <!-- Pied de carte : Score moyen de maturité -->
                <div card-footer class="w-full flex items-center justify-between">
                  <span class="font-medium text-ink-muted">Maturité moyenne</span>
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                      <div 
                        class="h-full rounded-full bg-accent transition-all duration-300" 
                        [style.width.%]="item.scoreMoyen"
                      ></div>
                    </div>
                    <span class="text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                  </div>
                </div>
              </app-entity-card>
            } @empty {
              <div class="col-span-full">
                <app-empty-state
                  title="Aucune cohorte trouvée"
                  description="Ajustez vos filtres ou créez votre première cohorte pour regrouper vos entrepreneurs."
                  iconName="cohortes"
                >
                  <a routerLink="/incubateur/cohortes/nouvelle">
                    <app-button size="xs">
                      <app-icon name="plus" class="size-3.5" />
                      <span>Créer une cohorte</span>
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
                    <th class="w-4/12 px-5 py-3.5">Cohorte</th>
                    <th class="w-3/12 px-5 py-3.5">Période</th>
                    <th class="w-2/12 px-5 py-3.5">Projets</th>
                    <th class="w-2/12 px-5 py-3.5">Maturité moy.</th>
                    <th class="w-2/12 px-5 py-3.5">Statut</th>
                    <th class="w-1/12 px-5 py-3.5 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (item of cohortesFiltrees(); track item.cohorte.id) {
                    <tr class="group transition-colors hover:bg-surface-muted/40">
                      <!-- Nom & Description -->
                      <td class="px-5 py-3.5">
                        <div class="flex flex-col min-w-0">
                          <a 
                            [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                            class="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent"
                          >
                            {{ item.cohorte.nom }}
                          </a>
                          <span class="truncate text-[11px] text-ink-muted">
                            {{ item.cohorte.description || 'Aucune description' }}
                          </span>
                        </div>
                      </td>

                      <!-- Dates -->
                      <td class="px-5 py-3.5 text-ink-muted font-medium whitespace-nowrap">
                        {{ formatDate(item.cohorte.dateDebut) }} — {{ formatDate(item.cohorte.dateFin) }}
                      </td>

                      <!-- Nb Projets -->
                      <td class="px-5 py-3.5 font-semibold text-ink">
                        {{ item.nbProjets }} {{ item.nbProjets > 1 ? 'projets' : 'projet' }}
                      </td>

                      <!-- Score Moyen -->
                      <td class="px-5 py-3.5">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                            <div 
                              class="h-full rounded-full bg-accent transition-all duration-300" 
                              [style.width.%]="item.scoreMoyen"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                        </div>
                      </td>

                      <!-- Statut Badge -->
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <app-badge [status]="statutBadge(item.cohorte.statut).status">
                          {{ statutBadge(item.cohorte.statut).label }}
                        </app-badge>
                      </td>

                      <!-- Action -->
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <a
                          [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                          class="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
                        >
                          Voir
                          <app-icon name="chevron-right" class="size-3.5" />
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6" class="p-8">
                        <app-empty-state
                          title="Aucune cohorte trouvée"
                          description="Ajustez vos filtres ou créez votre première cohorte pour regrouper vos entrepreneurs."
                          iconName="cohortes"
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
export class CohortesList implements OnInit {
  private readonly structureContext = inject(StructureContextService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vueMode = signal<VueMode>('grid');
  protected readonly filtreStatut = signal<FiltreStatutCohorte>('TOUS');
  protected readonly isLoading = signal<boolean>(true);
  
  protected readonly cohortes = signal<Cohorte[]>([]);
  private readonly projetsParCohorte = signal<Record<string, Projet[]>>({});

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  // Transforme les cohortes avec le nombre de projets & le score de maturité
  protected readonly cohortesAffichees = computed<CohorteAffichee[]>(() =>
    this.cohortes().map((cohorte) => {
      const projets = this.projetsParCohorte()[cohorte.id] ?? [];
      const scoreMoyen =
        projets.length === 0
          ? 0
          : Math.round(
              projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length
            );
      return { cohorte, nbProjets: projets.length, scoreMoyen };
    })
  );

  // Compteurs pour les onglets
  protected readonly compteEnCours = computed(() =>
    this.cohortes().filter((c) => c.statut === 'EN_COURS' || (c.statut as string) === 'ACTIVE').length
  );

  protected readonly compteAVenir = computed(() =>
    this.cohortes().filter((c) => c.statut === 'PLANIFIEE' || (c.statut as string) === 'A_VENIR').length
  );

  protected readonly compteTerminees = computed(() =>
    this.cohortes().filter((c) => c.statut === 'TERMINEE' || (c.statut as string) === 'ARCHIVEE').length
  );

  // Configuration réactive du composant app-tab-filter
  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatutCohorte>[]>(() => [
    { value: 'TOUS', label: 'Toutes', count: this.cohortes().length },
    { value: 'EN_COURS', label: 'En cours', count: this.compteEnCours() },
    { value: 'A_VENIR', label: 'À venir', count: this.compteAVenir() },
    { value: 'TERMINEE', label: 'Terminées', count: this.compteTerminees() },
  ]);

  // Filtrage combiné (statut + recherche par terme)
  protected readonly cohortesFiltrees = computed<CohorteAffichee[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let liste = this.cohortesAffichees();

    // 1. Filtrage par Statut
    if (filtre === 'EN_COURS') {
      liste = liste.filter((item) => item.cohorte.statut === 'EN_COURS' || (item.cohorte.statut as string) === 'ACTIVE');
    } else if (filtre === 'A_VENIR') {
      liste = liste.filter((item) => item.cohorte.statut === 'PLANIFIEE' || (item.cohorte.statut as string) === 'A_VENIR');
    } else if (filtre === 'TERMINEE') {
      liste = liste.filter((item) => item.cohorte.statut === 'TERMINEE' || (item.cohorte.statut as string) === 'ARCHIVEE');
    }

    // 2. Filtrage par recherche texte
    if (term) {
      liste = liste.filter(
        (item) =>
          item.cohorte.nom?.toLowerCase().includes(term) ||
          item.cohorte.description?.toLowerCase().includes(term) ||
          item.cohorte.secteur?.toLowerCase().includes(term)
      );
    }

    return liste;
  });

  constructor() {
    effect(() => {
      const activeStructureId = this.structureContext.activeStructureId();
      if (activeStructureId) {
        this.loadData();
      }
    });
  }

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));
  }

  private loadData(): void {
    this.isLoading.set(true);

    this.cohorteService.getCohortes().subscribe({
      next: (cohortes) => {
        this.cohortes.set(cohortes);

        if (!cohortes || cohortes.length === 0) {
          this.isLoading.set(false);
          return;
        }

        const requests = cohortes.map((c) =>
          this.projetService.getByCohorte(c.id).pipe(
            catchError(() => of([]))
          )
        );

        forkJoin(requests).subscribe({
          next: (results) => {
            const map: Record<string, Projet[]> = {};
            cohortes.forEach((cohorte, index) => {
              map[cohorte.id] = results[index] ?? [];
            });
            this.projetsParCohorte.set(map);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
      },
      error: (err) => {
        console.error('Erreur récupération cohortes :', err);
        this.isLoading.set(false);
      },
    });
  }

  protected statutBadge(statut: StatutCohorte | string | undefined): { status: BadgeStatus; label: string } {
    switch (statut) {
      case 'EN_COURS':
      case 'ACTIVE':
        return { status: 'success', label: 'En cours' };
      case 'PLANIFIEE':
      case 'A_VENIR':
        return { status: 'info', label: 'À venir' };
      case 'TERMINEE':
      case 'ARCHIVEE':
        return { status: 'neutral', label: 'Terminée' };
      default:
        return { status: 'neutral', label: statut || 'Active' };
    }
  }

  protected formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Date non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}