import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { SuperAdminService } from '../../../core/services/super-admin.service';
import { SuperAdminDashboardData } from '../../../core/models/super-admin.models';

import { Icon } from '../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card';
import { CardComponent } from '../../../shared/components/card/card.component';
import { VIZ, VizPoint, VizSegment } from '../../../shared/components/viz/viz';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [RouterLink, Icon, ButtonComponent, KpiCardComponent, CardComponent, ...VIZ],
  template: `
    <div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-[13px] text-ink-muted">Administration générale</p>
          <h1 class="mt-0.5 text-xl font-semibold tracking-tight text-ink sm:text-[22px]">Vue d’ensemble</h1>
          <p class="mt-0.5 text-[13px] text-ink-muted">Santé commerciale et adoption de la plateforme JAPPO.</p>
        </div>
        <app-button size="sm" variant="secondary" [fullWidthMobile]="true" (click)="loadDashboard()" [disabled]="loading()">
          <app-icon name="rotate-ccw" class="size-4" [class.animate-spin]="loading()" />
          Actualiser
        </app-button>
      </header>

      @if (loading()) {
        <div class="flex flex-col gap-6" aria-busy="true" aria-label="Chargement">
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
            @for (i of [1, 2, 3, 4]; track i) { <div class="lg-surface h-32 animate-pulse rounded-2xl motion-reduce:animate-none"></div> }
          </div>
          <div class="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div class="lg-surface h-80 animate-pulse rounded-2xl xl:col-span-2 motion-reduce:animate-none"></div>
            <div class="lg-surface h-80 animate-pulse rounded-2xl motion-reduce:animate-none"></div>
          </div>
        </div>
      }

      @if (error()) {
        <div role="alert" class="flex flex-col gap-4 rounded-2xl border border-danger-500/30 bg-danger-100 p-5 sm:flex-row sm:items-center">
          <span class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-danger-500/10 text-danger-500"><app-icon name="alert-circle" class="size-5" /></span>
          <div class="flex-1">
            <p class="text-sm font-semibold text-ink">Impossible de charger le tableau de bord</p>
            <p class="text-xs text-ink-muted">Vérifiez votre connexion ou réessayez dans un instant.</p>
          </div>
          <app-button size="sm" (click)="loadDashboard()">Réessayer</app-button>
        </div>
      }

      @if (!loading() && !error() && dashboard(); as data) {

        <section aria-label="Indicateurs clés" class="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <a routerLink="/super-admin/structures" class="rounded-[var(--radius-card-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <app-kpi-card icon="layers" label="Structures" [value]="data.totalStructures" [note]="'+' + data.nouvellesStructuresCeMois + ' ce mois · +' + data.nouvellesStructuresCetteSemaine + ' cette semaine'" noteVariant="success" />
          </a>
          <a routerLink="/super-admin/transactions" class="rounded-[var(--radius-card-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <app-kpi-card icon="bar-chart" label="Revenu du mois" [value]="fcfa(data.revenuMois)" [note]="'Cumul : ' + fcfa(data.revenuTotal)" />
          </a>
          <a routerLink="/super-admin/transactions" class="rounded-[var(--radius-card-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <app-kpi-card icon="x-circle" label="Paiements échoués" [value]="data.transactionsEchecRecentes" note="Récents, à relancer" [noteVariant]="data.transactionsEchecRecentes ? 'brand' : 'neutral'" />
          </a>
          <a routerLink="/super-admin/abonnements" class="rounded-[var(--radius-card-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <app-kpi-card icon="clock" label="Expirent sous 7 j" [value]="data.abonnementsExpiration7Jours" note="Abonnements à renouveler" />
          </a>
        </section>

        <section class="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
          <app-card class="xl:col-span-2">
            <div class="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 class="text-sm font-semibold text-ink">Revenus mensuels</h2>
                <p class="mt-0.5 text-xs text-ink-muted">Encaissements réussis, en FCFA</p>
              </div>
              <p class="text-right"><span class="block text-lg font-bold text-ink tabular-nums">{{ fcfa(data.revenuTotal) }}</span><span class="text-[11px] text-ink-faint">cumulé</span></p>
            </div>
            @if (revenus().length) {
              <app-area-chart [points]="revenus()" titre="Revenus mensuels en FCFA" [format]="fcfaFn" />
            } @else {
              <p class="py-16 text-center text-sm text-ink-muted">Pas encore de revenus enregistrés.</p>
            }
          </app-card>

          <app-card>
            <h2 class="text-sm font-semibold text-ink">Répartition des offres</h2>
            <p class="mt-0.5 mb-5 text-xs text-ink-muted">Structures par plan effectif</p>
            <app-segment-bar [segments]="plans()" />
          </app-card>
        </section>

        <section class="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 xl:grid-cols-3">
          <app-card>
            <h2 class="text-sm font-semibold text-ink">Nouvelles structures</h2>
            <p class="mt-0.5 mb-5 text-xs text-ink-muted">Inscriptions par mois</p>
            <app-column-chart [points]="inscriptions()" titre="Nouvelles structures par mois" />
          </app-card>

          <app-card>
            <h2 class="text-sm font-semibold text-ink">Transactions par statut</h2>
            <p class="mt-0.5 mb-5 text-xs text-ink-muted">{{ getTransactionTotal() }} transaction(s) au total</p>
            <app-segment-bar [segments]="transactions()" />
          </app-card>

          <app-card class="md:col-span-2 xl:col-span-1">
            <h2 class="text-sm font-semibold text-ink">Accès rapides</h2>
            <div class="mt-4 flex flex-col gap-2">
              @for (r of raccourcis; track r.lien) {
                <a [routerLink]="r.lien" class="lg-interactive group flex items-center gap-3 rounded-xl border border-line bg-surface/60 p-3">
                  <span class="flex size-9 items-center justify-center rounded-lg border border-line text-ink-muted"><app-icon [name]="r.icon" class="size-4" /></span>
                  <span class="flex-1"><span class="block text-sm font-semibold text-ink">{{ r.label }}</span><span class="block text-xs text-ink-muted">{{ r.description }}</span></span>
                  <app-icon name="chevron-right" class="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5" />
                </a>
              }
            </div>
          </app-card>
        </section>
      }
    </div>
  `,
})
export class SuperAdminDashboard implements OnInit {

  private readonly superAdminService = inject(SuperAdminService);

  protected readonly dashboard =
    signal<SuperAdminDashboardData | null>(null);

  protected readonly loading = signal(true);

  protected readonly error = signal(false);

  private readonly formatFcfa = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });

  protected readonly fcfaFn = (v: number) => this.fcfa(v);

  protected fcfa(montant: number): string {
    return `${this.formatFcfa.format(montant ?? 0)} FCFA`;
  }

  protected readonly revenus = computed<VizPoint[]>(() =>
    (this.dashboard()?.revenusMensuels ?? []).map((r) => ({ label: this.getMonthLabel(r.mois), value: r.montant })),
  );

  protected readonly inscriptions = computed<VizPoint[]>(() =>
    (this.dashboard()?.nouvellesStructuresMensuelles ?? []).map((r) => ({ label: this.getMonthLabel(r.mois), value: r.nombre })),
  );

  protected readonly plans = computed<VizSegment[]>(() =>
    (this.dashboard()?.repartitionPlans ?? []).map((p, i) => ({
      label: p.libelle,
      value: p.nombreStructures,
      color: `var(--viz-${(i % 5) + 1})`,
    })),
  );

  protected readonly transactions = computed<VizSegment[]>(() => {
    const parStatut = this.dashboard()?.transactionsParStatut ?? {};
    return [
      { label: 'Réussies', value: parStatut['SUCCES'] ?? 0, color: 'var(--color-success-500)' },
      { label: 'En attente', value: parStatut['EN_ATTENTE'] ?? 0, color: 'var(--color-warning-500)' },
      { label: 'Échouées', value: parStatut['ECHEC'] ?? 0, color: 'var(--color-danger-500)' },
    ];
  });

  protected readonly raccourcis = [
    { label: 'Structures', description: 'Gérer les incubateurs', icon: 'layers', lien: '/super-admin/structures' },
    { label: 'Transactions', description: 'Suivre les paiements', icon: 'missions', lien: '/super-admin/transactions' },
    { label: 'Plans', description: 'Configurer les offres', icon: 'sparkles', lien: '/super-admin/plans' },
  ] as const;

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected getMonthLabel(mois: string): string {
    const [annee, moisNumero] = mois.split('-');

    const date = new Date(
      Number(annee),
      Number(moisNumero) - 1,
      1
    );

    return new Intl.DateTimeFormat('fr-FR', {
      month: 'short',
    }).format(date);
  }

  protected getTransactionTotal(): number {
    const transactions =
      this.dashboard()?.transactionsParStatut;

    if (!transactions) {
      return 0;
    }

    return Object.values(transactions).reduce(
      (total, value) => total + value,
      0
    );
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.error.set(false);

    this.superAdminService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        this.loading.set(false);
      },

      error: (error) => {
        console.error(
          'Erreur dashboard Super Admin:',
          error
        );

        this.error.set(true);
        this.loading.set(false);
      },
    });
  }
}