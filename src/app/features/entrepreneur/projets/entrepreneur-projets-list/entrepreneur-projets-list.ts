import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet, StatutProjet } from '../../../../core/models';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TabFilterComponent } from '../../../../shared/components/tab-filter/tab-filter.component';

type ProjetFilter = 'TOUS' | 'ACTIF' | 'DIPLOME' | 'ABANDONNE';

const FILTRES_PROJETS: { value: ProjetFilter; label: string }[] = [
  { value: 'TOUS', label: 'Tous' },
  { value: 'ACTIF', label: 'Actifs' },
  { value: 'DIPLOME', label: 'Diplômés' },
  { value: 'ABANDONNE', label: 'Abandonnés' },
];

@Component({
  selector: 'app-entrepreneur-projets-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    TabFilterComponent
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page -->
      <app-page-header
        title="Mes Projets"
        [subtitle]="
          loading()
            ? 'Chargement de vos projets en cours...'
            : projets().length + ' projet(s)'
        "
        breadcrumb="Entrepreneur > Mes Projets"
      />

      <!-- Filtre par statut -->
      @if (!loading() && !error() && projets().length > 0) {
        <app-tab-filter
          [options]="filtres"
          [value]="filtreStatut()"
          (valueChange)="changerFiltre($event)"
          class="w-full sm:w-fit"
        />
      }

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-40 rounded-2xl border border-line/60 bg-surface-muted/30 animate-pulse p-5"></div>
          }
        </div>
      } 
      <!-- ÉTAT ERREUR -->
      @else if (error()) {
        <div class="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <app-icon name="warning" class="size-8 text-rose-600 mb-2" />
          <p class="text-sm font-semibold text-rose-600">{{ error() }}</p>
          <app-button variant="secondary" size="sm" class="mt-4" (click)="loadProjets()">
            Réessayer
          </app-button>
        </div>
      } 
      <!-- ÉTAT VIDE -->
      @else if (projetsFiltres().length === 0) {
        <app-card padding="none" >
          <div class="p-8 sm:p-12">
            <app-empty-state
              title="Aucun projet trouvé"
              description="Aucun projet ne correspond au filtre sélectionné."
              iconName="dashboard"
            />
          </div>
        </app-card>
      } 
      <!-- GRILLE DE CARTES -->
      @else {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (p of projetsFiltres(); track p.id) {
            <app-card padding="none" class="group flex flex-col justify-between overflow-hidden transition-all hover:border-accent/40">
              
              <!-- Corps de la carte -->
              <div class="p-5 flex flex-col gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-bold text-ink truncate group-hover:text-accent transition-colors">{{ p.nom }}</h3>
                    @if (p.secteur) {
                      <p class="text-xs text-ink-muted truncate mt-0.5">{{ p.secteur }}</p>
                    }
                  </div>
                  <app-badge [status]="statutBadge(p.statut).status" size="sm" class="shrink-0 font-bold">
                    {{ statutBadge(p.statut).label }}
                  </app-badge>
                </div>

                @if (p.description) {
                  <p class="text-xs text-ink-muted line-clamp-2 mt-1">{{ p.description }}</p>
                }
              </div>

              <!-- Pied de carte (Actions) -->
              <div class="flex items-center justify-end border-t border-line/60 bg-surface-muted/30 px-5 py-3 mt-auto">
                <app-button
                  variant="secondary"
                  size="sm"
                  [routerLink]="['/entrepreneur/projets', p.id, 'modifier']"
                >
                  <app-icon name="edit" class="size-3.5 mr-1.5" />
                  Modifier
                </app-button>
              </div>

            </app-card>
          }
        </div>
      }
    </div>
  `,
})
export class EntrepreneurProjetsListComponent implements OnInit {
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filtres = FILTRES_PROJETS;
  protected readonly projets = signal<Projet[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly filtreStatut = signal<ProjetFilter>('TOUS');

  // Computed pour filtrer la liste des projets selon l'onglet actif
  protected readonly projetsFiltres = computed(() => {
    const statut = this.filtreStatut();
    const liste = this.projets();
    if (statut === 'TOUS') {
      return liste;
    }
    return liste.filter((p) => p.statut?.toUpperCase() === statut);
  });

  ngOnInit(): void {
    this.loadProjets();
  }

  protected loadProjets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.projetService.getMesProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projets) => {
          this.projets.set(projets);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des projets:', err);
          this.error.set('Impossible de charger vos projets. Veuillez réessayer.');
          this.loading.set(false);
        }
      });
  }

  protected changerFiltre(filtre: ProjetFilter): void {
    this.filtreStatut.set(filtre);
  }

  protected statutBadge(statut: StatutProjet | string): { label: string; status: BadgeStatus } {
    const s = statut?.toUpperCase();
    switch (s) {
      case 'ACTIF':
        return { label: 'Actif', status: 'success' };
      case 'DIPLOME':
        return { label: 'Diplômé', status: 'info' };
      case 'ABANDONNE':
        return { label: 'Abandonné', status: 'danger' };
      default:
        return { label: statut || 'Indéfini', status: 'neutral' };
    }
  }
}