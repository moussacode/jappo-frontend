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
  LivrableRecentResponse,
} from '../../../../core/services/dashboard.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte } from '../../../../core/models';

// Design System Partagé
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { InviterEntrepreneurModalComponent } from '../../entrepreneurs/inviter-entrepreneur/inviter-entrepreneur';

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
    InviterEntrepreneurModalComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 sm:gap-8 p-3 sm:p-4 md:p-6 lg:p-8">
      
      <!-- En-tête Page Unifié avec PageHeaderComponent -->
      <app-page-header
        title="Vue d'ensemble"
        [subtitle]="'Espace Incubateur / ' + nomStructure()"
      >
        <app-button
          size="sm"
          [fullWidthMobile]="true"
          (click)="showInviteModal.set(true)"
        >
          <app-icon name="plus" class="size-3.5" />
          <span>Inviter des entrepreneurs</span>
        </app-button>
      </app-page-header>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
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
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <!-- <app-kpi-card 
            label="Entrepreneurs suivis" 
            [value]="stats()?.entrepreneursActifs || 0" 
            [note]="(stats()?.totalEntrepreneurs || 0) + ' membre(s) au total'"
            noteVariant="neutral"
          /> -->
          <app-kpi-card 
            label="Cohortes actives" 
            [value]="cohortesActives().length  || 0" 
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

        <!-- 2. BLOC COHORTES ACTIVES (CLICABLES) -->
        @if (cohortesActives().length > 0) {
          <div class="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-ink font-bold text-xs uppercase tracking-wider">
                <app-icon name="cohortes" class="size-4 text-accent" />
                <span>Cohortes Actives ({{ cohortesActives().length }})</span>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-1">
              @for (c of cohortesActives(); track c.id) {
                <a
                  [routerLink]="['/incubateur/cohortes']"
                  [queryParams]="{ cohorteId: c.id }"
                  class="group flex items-center justify-between rounded-xl border border-line bg-surface-muted/30 p-3.5 transition-all hover:border-accent hover:bg-accent/5 cursor-pointer shadow-2xs"
                >
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-ink truncate transition-colors group-hover:text-accent">{{ c.nom }}</span>
                    <span class="text-[11px] text-ink-muted truncate">{{ c.description || 'Aucune description' }}</span>
                  </div>
                  <div class="flex items-center gap-2 shrink-0">
                   
                    <app-icon name="chevron-right" class="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </a>
              }
            </div>
          </div>
        }

        <!-- 3. ACTIVITÉ RÉCENTE (DERNIERS LIVRABLES DÉPOSÉS) -->
        <app-card padding="none" class="w-full min-w-0">
          <div class="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-4 bg-surface-muted/30">
            <div class="flex items-center gap-2 min-w-0">
              <app-icon name="missions" class="size-4 text-ink-muted shrink-0" />
              <h2 class="text-sm font-bold text-ink truncate">Activité récente (Derniers livrables déposés)</h2>
            </div>
          </div>

          <div class="divide-y divide-line">
            @for (l of livrablesRecents(); track l.livrableId) {
              <a
                [routerLink]="l.missionId ? ['/incubateur/missions', l.missionId] : null"
                class="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 py-3 sm:px-6 sm:py-4 hover:bg-surface-muted/40 transition-colors gap-3 sm:gap-4 group cursor-pointer"
              >
                <div class="flex items-center gap-3 min-w-0">
                  <div class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-line text-ink-muted group-hover:border-accent/40 group-hover:text-accent transition-colors">
                    <app-icon name="missions" class="size-4" />
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-ink truncate group-hover:text-accent transition-colors">{{ l.nomLivrable }}</span>
                    <span class="text-[11px] text-ink-muted truncate">
                      Par <strong>{{ l.nomEntrepreneur }}</strong> ({{ l.nomProjet }})
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2 sm:gap-3 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                  <span class="text-[11px] text-ink-muted">
                    {{ l.dateDepot ? (l.dateDepot | date:'dd/MM/yyyy à HH:mm') : '' }}
                  </span>
                  <div class="flex items-center gap-2">
                    <app-badge [status]="badgeLivrableStatus(l.statut)" size="sm">
                      {{ formaterStatutLivrable(l.statut) }}
                    </app-badge>
                    <app-icon name="chevron-right" class="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </div>
                </div>
              </a>
            } @empty {
              <div class="p-6 sm:p-8">
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

      @if (showInviteModal()) {
        <app-inviter-entrepreneur-modal
          (close)="showInviteModal.set(false)"
          (invited)="chargerDonneesDashboard()"
        />
      }

    </div>
  `,
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureContext = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly nomStructure = signal<string>('Incubateur');
  protected readonly showInviteModal = signal<boolean>(false);

  protected readonly stats = signal<DashboardStatsResponse | undefined>(undefined);
  protected readonly cohortesActives = signal<Cohorte[]>([]);
  protected readonly livrablesRecents = signal<LivrableRecentResponse[]>([]);

  ngOnInit(): void {
    const activeMembership = this.structureContext.activeMembership();
    if (activeMembership) {
      this.nomStructure.set(activeMembership.structure.nom);
    }

    this.chargerDonneesDashboard();
  }

  protected chargerDonneesDashboard(): void {
    this.isLoading.set(true);

    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(undefined))),
      cohortes: this.cohorteService.getActiveCohortes().pipe(catchError(() => of([]))),
      livrablesRecents: this.dashboardService.getLivrablesRecents(5).pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, cohortes, livrablesRecents }) => {
          this.stats.set(stats);
          this.cohortesActives.set(cohortes);
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