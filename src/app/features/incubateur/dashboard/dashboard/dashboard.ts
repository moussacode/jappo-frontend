import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import {
  DashboardService,
  DashboardStatsResponse,
  AlerteProjetResponse,
  LivrableRecentResponse,
} from '../../../../core/services/dashboard.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, KpiCardComponent, BadgeComponent, Icon, DatePipe],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-8 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Notion Style -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            <span>Espace Incubateur</span>
            <span>/</span>
            <span class="text-ink">{{ nomStructure() }}</span>
          </div>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Vue d'ensemble</h1>
        </div>

        <div class="flex items-center gap-3">
          <a
            routerLink="/incubateur/entrepreneurs/inviter"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-action-fill px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 cursor-pointer"
          >
            <app-icon name="plus" class="size-3.5 text-white" />
            <span>Inviter des entrepreneurs</span>
          </a>
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 animate-pulse">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-28 rounded-2xl bg-line/40"></div>
          }
        </div>
        <div class="h-64 rounded-2xl bg-line/30 animate-pulse"></div>
      } @else {

        <!-- 1. CARTES KPIS (Conserves ton composant KpiCardComponent) -->
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
          <div class="flex flex-col gap-3 rounded-2xl border border-warning-500/20 bg-warning-500/5 p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-warning-700 font-bold text-xs uppercase tracking-wider">
                <app-icon name="warning" class="size-4" />
                <span>Attention requise ({{ alertes().length }} projet(s) avec une maturité < 40%)</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
              @for (a of alertes(); track a.projetId) {
                <a
                  [routerLink]="['/incubateur/entrepreneurs', a.entrepreneurId || a.projetId]"
                  class="flex items-center justify-between rounded-xl border border-line bg-surface p-3.5 hover:border-warning-500/40 transition-colors cursor-pointer shadow-2xs"
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

        <!-- 3. TABLEAU DES DERNIERS LIVRABLES DÉPOSÉS -->
        <div class="w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-subtle)]">
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
              <p class="p-8 text-center text-xs text-ink-muted">
                Aucun livrable récemment déposé.
              </p>
            }
          </div>
        </div>

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

  // Données retournées par les endpoints optimisés du Backend
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