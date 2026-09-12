import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

// Services & Modèles
import {
  DashboardService,
  DashboardStatsResponse,
  AlerteProjetResponse,
  LivrableRecentResponse,
} from '../../../../core/services/dashboard.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

// Design System Partagé
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    KpiCardComponent,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-8 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page Unifié avec PageHeaderComponent -->
      <app-page-header
        title="Vue d'ensemble"
        [subtitle]="'Espace Incubateur / ' + nomStructure()"
      >
        <a routerLink="/incubateur/entrepreneurs/inviter">
          <app-button size="sm">
            <app-icon name="plus" class="size-3.5" />
            <span>Inviter des entrepreneurs</span>
          </app-button>
        </a>
      </app-page-header>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
          @for (i of [1, 2, 3, 4]; track i) {
            <app-card padding="md" class="h-28 animate-pulse bg-line/20">
              <div class="h-4 w-1/2 rounded bg-line mb-3"></div>
              <div class="h-8 w-1/3 rounded bg-line"></div>
            </app-card>
          }
        </div>
        <app-card padding="md" class="h-64 animate-pulse bg-line/20" />
      } @else {

        <!-- 1. CARTES KPIS -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <app-kpi-card 
            label="Entrepreneurs suivis" 
            [value]="stats()?.entrepreneursActifs || 0" 
            [note]="(stats()?.totalEntrepreneurs || 0) + ' membre(s) au total'"
            noteVariant="neutral"
          />
          <app-kpi-card 
            label="Cohortes actives" 
            [value]="stats()?.totalCohortes || 0" 
            note="Programmes en cours"
            noteVariant="brand"
          />
          <app-kpi-card
            label="Score de maturité moyen"
            [value]="(stats()?.scoreMaturiteMoyen || 0) + '%'"
            note="Moyenne sur tous les projets"
            noteVariant="brand"
          />
          <app-kpi-card
            label="Livrables à revoir"
            [value]="stats()?.livrablesEnAttente || 0"
            note="En attente d'évaluation"
            noteVariant="neutral"
          />
        </div>

        <!-- 2. BLOC PROJETS À SURVEILLER (ALERTES) -->
        @if (alertes().length > 0) {
          <div class="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
                <app-icon name="warning" class="size-4 text-amber-600" />
                <span>Attention requise ({{ alertes().length }} projet(s) avec une maturité < 40%)</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
              @for (a of alertes(); track a.projetId) {
                <a
                  [routerLink]="['/incubateur/entrepreneurs', a.entrepreneurId || a.projetId]"
                  class="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 hover:border-amber-500/40 transition-colors cursor-pointer shadow-2xs"
                >
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-ink truncate">{{ a.nomProjet }}</span>
                    <span class="text-[11px] text-ink-muted truncate">{{ a.nomEntrepreneur }}</span>
                  </div>
                  <app-badge status="warning" size="sm">{{ a.scoreMaturite }}%</app-badge>
                </a>
              }
            </div>
          </div>
        }

        <!-- 3. ACTIVITÉ RÉCENTE (DERNIERS LIVRABLES DÉPOSÉS) -->
        <app-card padding="none" class="w-full min-w-0">
          <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
            <div class="flex items-center gap-2">
              <app-icon name="missions" class="size-4 text-ink-muted" />
              <h2 class="text-sm font-bold text-ink">Activité récente (Derniers livrables déposés)</h2>
            </div>
          </div>

          <div class="divide-y divide-line">
            @for (l of livrablesRecents(); track l.livrableId) {
              <div class="flex items-center justify-between px-6 py-4 hover:bg-surface-muted/30 transition-colors gap-4">
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-line text-ink-muted">
                    <app-icon name="missions" class="size-4" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-ink truncate">{{ l.nomLivrable }}</span>
                    <span class="text-[11px] text-ink-muted truncate">
                      Par <strong>{{ l.nomEntrepreneur }}</strong> ({{ l.nomProjet }})
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <span class="hidden sm:inline text-[11px] text-ink-muted">
                    {{ l.dateDepot ? (l.dateDepot | date:'dd/MM/yyyy à HH:mm') : '' }}
                  </span>
                  <app-badge [status]="badgeLivrableStatus(l.statut)" size="sm">
                    {{ formaterStatutLivrable(l.statut) }}
                  </app-badge>
                </div>
              </div>
            } @empty {
              <div class="p-8">
                <app-empty-state
                  title="Aucun livrable récemment déposé"
                  description="Les livrables soumis par les entrepreneurs de vos cohortes apparaîtront ici."
                  iconName="missions"
                />
              </div>
            }
          </div>
        </app-card>

      }

    </div>
  `,
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly structureContext = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly nomStructure = signal<string>('Incubateur');

  protected readonly stats = signal<DashboardStatsResponse | undefined>(undefined);
  protected readonly alertes = signal<AlerteProjetResponse[]>([]);
  protected readonly livrablesRecents = signal<LivrableRecentResponse[]>([]);

  ngOnInit(): void {
    const activeMembership = this.structureContext.activeMembership();
    if (activeMembership) {
      this.nomStructure.set(activeMembership.structure.nom);
    }

    this.chargerDonneesDashboard();
  }

  private chargerDonneesDashboard(): void {
    this.isLoading.set(true);

    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(undefined))),
      alertes: this.dashboardService.getAlertes().pipe(catchError(() => of([]))),
      livrablesRecents: this.dashboardService.getLivrablesRecents(5).pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, alertes, livrablesRecents }) => {
          this.stats.set(stats);
          this.alertes.set(alertes);
          this.livrablesRecents.set(livrablesRecents);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement dashboard:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected badgeLivrableStatus(statut?: string): BadgeStatus {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'success';
      case 'EN_ATTENTE':
        return 'warning';
      case 'A_CORRIGER':
      case 'REJETE':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected formaterStatutLivrable(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'Validé';
      case 'EN_ATTENTE':
        return 'En attente';
      case 'A_CORRIGER':
        return 'À corriger';
      case 'REJETE':
        return 'Rejeté';
      default:
        return statut || 'Déposé';
    }
  }
}