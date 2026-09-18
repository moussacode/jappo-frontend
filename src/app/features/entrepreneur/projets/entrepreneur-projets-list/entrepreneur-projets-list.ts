import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';

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
    EmptyStateComponent
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

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
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
      } @else if (projets().length === 0) {
        <!-- ÉTAT VIDE -->
        <app-empty-state
          title="Aucun projet"
          description="Vous n'avez pas encore de projet associé à votre compte."
        />
      } @else {
        <!-- GRILLE DE CARTES -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (p of projets(); track p.id) {
            <app-card padding="md" class="flex flex-col justify-between gap-4 h-40 hover:shadow-lg transition-shadow">
              <!-- En-tête carte -->
              <div class="flex items-start justify-between gap-3">
                <div class="flex-1 min-w-0">
                  <h3 class="font-semibold text-ink truncate text-lg">{{ p.nom }}</h3>
                  @if (p.secteur) {
                    <p class="text-sm text-ink-muted truncate">{{ p.secteur }}</p>
                  }
                </div>
                <app-badge [status]="statutBadge(p.statut).status" size="sm">
                  {{ statutBadge(p.statut).label }}
                </app-badge>
              </div>

              <!-- Description -->
              @if (p.description) {
                <p class="text-sm text-ink-muted line-clamp-2">{{ p.description }}</p>
              }

              <!-- Footer avec actions -->
              <div class="flex items-center justify-between border-t border-line pt-3 mt-auto">
                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  @if (p.scoreMaturite !== undefined) {
                    <span>Progression: {{ p.scoreMaturite }}%</span>
                  }
                </div>
                <div class="flex gap-2">
                  <a [routerLink]="['/entrepreneur/projets', p.id, 'modifier']"
                     class="text-xs font-medium text-accent hover:text-accent/80 transition-colors">
                    Modifier
                  </a>
                </div>
              </div>
            </app-card>
          }
        </div>
      }

      <!-- ÉTAT ERREUR -->
      @if (error()) {
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <p class="text-rose-800 font-medium">{{ error() }}</p>
          <button (click)="loadProjets()" class="mt-3 text-sm text-rose-600 hover:text-rose-800 font-medium">
            Réessayer
          </button>
        </div>
      }
    </div>
  `,
})
export class EntrepreneurProjetsListComponent implements OnInit {
  private projetService = inject(ProjetService);

  projets = signal<Projet[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadProjets();
  }

  loadProjets(): void {
    this.loading.set(true);
    this.error.set(null);

    this.projetService.getMesProjets().subscribe({
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

  statutBadge(statut: StatutProjet | string): { label: string; status: BadgeStatus } {
    const s = statut as StatutProjet;
    switch (s) {
      case 'IDEE':
        return { label: 'Idée', status: 'neutral' };
      case 'EN_INCUBATION':
        return { label: 'Incubation', status: 'primary' };
      case 'EN_ACCELERATION':
        return { label: 'Accélération', status: 'info' };
      case 'DIPLOME':
        return { label: 'Diplômé', status: 'success' };
      case 'ABANDONNE':
        return { label: 'Abandonné', status: 'danger' };
      default:
        return { label: s, status: 'neutral' };
    }
  }
}
