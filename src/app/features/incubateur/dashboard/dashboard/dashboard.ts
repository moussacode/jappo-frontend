import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

// Services & Modèles
import {
  DashboardService,
  DashboardStatsResponse,
  LivrableRecentResponse,
  AlerteProjetResponse,
} from '../../../../core/services/dashboard.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { AuthService } from '../../../../core/services/auth.service';
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
    TranslatePipe,
  ],
  templateUrl:"./dashboard.html"
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureContext = inject(StructureContextService);
  private readonly authService = inject(AuthService);
protected readonly currentUser = this.authService.currentUser;
private readonly translationService = inject(TranslationService);
protected readonly salutation = computed(() => {
  const user = this.currentUser();
  const prenom = user?.prenom;
  const heure = new Date().getHours();

  const key =
    heure < 12
      ? 'incubateur.dashboard.salutation.matin'
      : heure < 18
        ? 'incubateur.dashboard.salutation.apresMidi'
        : 'incubateur.dashboard.salutation.soir';

  const greeting = this.translationService.t(key);

  return prenom
    ? `${greeting}, ${prenom}`
    : greeting;
});
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly nomStructure = signal<string>('Incubateur');
  protected readonly showInviteModal = signal<boolean>(false);

  protected readonly stats = signal<DashboardStatsResponse | undefined>(undefined);
  protected readonly cohortesActives = signal<Cohorte[]>([]);
  protected readonly livrablesRecents = signal<LivrableRecentResponse[]>([]);
  protected readonly alertesProjets = signal<AlerteProjetResponse[]>([]);

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
      alertes: this.dashboardService.getAlertes().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, cohortes, livrablesRecents, alertes }) => {
          this.stats.set(stats);
          this.cohortesActives.set(cohortes);
          this.livrablesRecents.set(livrablesRecents);
          this.alertesProjets.set(alertes);
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
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.valide'
      );

    case 'EN_ATTENTE':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.enAttente'
      );

    case 'A_CORRIGER':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.aCorriger'
      );

    case 'REJETE':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.rejete'
      );

    default:
      return statut ||
        this.translationService.t(
          'incubateur.dashboard.livrableStatut.depose'
        );
  }
}

  protected projetsParPhaseWidth(nombre: number): number {
    const phases = this.stats()?.projetsParPhase ?? [];
    const max = Math.max(...phases.map(p => p.nombre), 1);
    return Math.round((nombre / max) * 100);
  }
}