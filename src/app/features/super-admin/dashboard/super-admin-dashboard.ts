import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SuperAdminService } from '../../../core/services/super-admin.service';
import { SuperAdminDashboardData } from '../../../core/models/super-admin.models';


import { Icon } from '../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, Icon, ButtonComponent],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 sm:gap-8 p-3 sm:p-4 md:p-6 lg:p-8 font-sans">

      <!-- Header de la Page -->
      <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Administration Générale
          </p>
          <h1 class="text-xl font-bold text-ink sm:text-2xl">
            Vue d’ensemble
          </h1>
          <p class="text-xs text-ink-muted mt-1">
            Supervision globale, suivi des structures et de la plateforme JAPPO
          </p>
        </div>

        <app-button 
          size="sm" 
          variant="secondary"
          [fullWidthMobile]="true" 
          (click)="loadDashboard()" 
          [disabled]="loading()">
          <svg
            class="h-4 w-4 text-ink-muted"
            [class.animate-spin]="loading()"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h5M20 20v-5h-5M5.5 9A7 7 0 0117 6.5L20 9M18.5 15A7 7 0 017 17.5L4 15"
            />
          </svg>
          <span>Actualiser</span>
        </app-button>
      </div>

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 animate-pulse">
          @for (item of [1, 2, 3, 4]; track item) {
            <div class="h-28 animate-pulse rounded-2xl border border-line bg-surface-muted/30 p-4">
              <div class="h-4 w-1/2 rounded bg-line mb-3"></div>
              <div class="h-8 w-1/3 rounded bg-line"></div>
            </div>
          }
        </div>
        <div class="h-64 animate-pulse rounded-2xl border border-line bg-surface-muted/30"></div>
      }

      <!-- ERROR STATE -->
      @if (error()) {
        <div class="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 shadow-xs">
          <div class="flex items-start gap-3">
            <div class="rounded-xl bg-red-500/10 p-2 text-red-600">
              <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p class="text-sm font-bold text-red-900">
                Impossible de charger le tableau de bord
              </p>
              <p class="mt-1 text-xs text-red-700">
                Vérifiez la connexion au serveur puis réessayez.
              </p>
              <button
                type="button"
                (click)="loadDashboard()"
                class="mt-3 text-xs font-semibold text-red-700 underline hover:text-red-900 cursor-pointer"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      }

      @if (!loading() && !error() && dashboard(); as data) {

        <!-- 1. CARTES KPIS PRINCIPAUX -->
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          <!-- Structures -->
          <div class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Structures</p>
                <p class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{{ data.totalStructures }}</p>
              </div>
              <div class="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-muted text-ink">
                <app-icon name="users" class="size-5" />
              </div>
            </div>
            <div class="mt-4 border-t border-line/60 pt-3">
              <span class="text-xs text-ink-muted font-medium">
                +{{ data.nouvellesStructuresCetteSemaine }} nouvelle{{ data.nouvellesStructuresCetteSemaine > 1 ? 's' : '' }} cette semaine
              </span>
            </div>
          </div>

          <!-- Structures Premium -->
          <div class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Structures Premium</p>
                <p class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{{ data.structuresPremium }}</p>
              </div>
              <div class="flex size-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                <app-icon name="sparkles" class="size-5" />
              </div>
            </div>
            <div class="mt-4 border-t border-line/60 pt-3">
              <span class="text-xs font-bold text-accent">Abonnements actifs</span>
            </div>
          </div>

          <!-- Structures Freemium -->
          <div class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Structures Freemium</p>
                <p class="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{{ data.structuresFreemium }}</p>
              </div>
              <div class="flex size-10 items-center justify-center rounded-xl border border-line bg-surface-muted text-ink">
                <app-icon name="file" class="size-5" />
              </div>
            </div>
            <div class="mt-4 border-t border-line/60 pt-3">
              <span class="text-xs text-ink-muted font-medium">Formule de base</span>
            </div>
          </div>

          <!-- Revenus encaissés -->
          <div class="flex flex-col justify-between rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Revenus encaissés</p>
                <p class="mt-2 text-xl sm:text-2xl font-extrabold tracking-tight text-ink">
                  {{ data.revenuTotal }}
                  <span class="text-xs font-medium text-ink-muted">FCFA</span>
                </p>
              </div>
             
            </div>
            <div class="mt-4 border-t border-line/60 pt-3">
              <span class="text-xs text-ink-muted font-medium">Transactions validées</span>
            </div>
          </div>

        </section>

        <!-- 2. CARTES D'ACTIVITÉ SECONDAIRE -->
        <section class="grid grid-cols-1 gap-4 lg:grid-cols-3">

          <!-- Revenus du mois -->
          <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Revenus ce mois</p>
            <div class="mt-3 flex items-baseline gap-2">
              <span class="text-2xl font-extrabold text-ink">
                {{ data.revenuMois  }}
              </span>
              <span class="text-xs font-semibold text-ink-muted">FCFA</span>
            </div>
            <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-muted border border-line/60">
              <div class="h-full w-full rounded-full bg-accent"></div>
            </div>
          </div>

          <!-- Dynamique d'inscription -->
          <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Dynamique d'inscription</p>
            <div class="mt-3 flex items-end justify-between">
              <span class="text-2xl font-extrabold text-ink">{{ data.nouvellesStructuresCeMois }}</span>
              <span class="text-xs text-ink-muted font-medium">Ce mois-ci</span>
            </div>
            <p class="mt-4 text-xs text-ink-muted">
              <strong class="text-ink">{{ data.nouvellesStructuresCetteSemaine }}</strong> enregistrées cette semaine
            </p>
          </div>

          <!-- Expirations proches -->
          <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">Expirations proches</p>
                <p class="mt-3 text-2xl font-extrabold text-ink">{{ data.abonnementsExpiration7Jours }}</p>
              </div>
              <div
                class="flex size-9 items-center justify-center rounded-xl border"
                [class]="data.abonnementsExpiration7Jours > 0 ? 'border-amber-500/30 bg-amber-500/10 text-amber-600' : 'border-line bg-surface-muted text-ink'"
              >
                <app-icon name="warning" class="size-4" />
              </div>
            </div>
            <p class="mt-4 text-xs text-ink-muted">Abonnements expirant dans les 7 prochains jours</p>
          </div>

        </section>

        <!-- 3. GRAPHIQUES -->
<section class="grid grid-cols-1 gap-6 xl:grid-cols-2">

  <!-- REVENUS -->
  <div class="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">

    <div class="border-b border-line px-5 py-4 sm:px-6 sm:py-5">
      <h2 class="text-sm font-bold text-ink">
        Évolution des revenus
      </h2>

      <p class="mt-0.5 text-xs text-ink-muted">
        Revenus des 6 derniers mois
      </p>
    </div>

    <div class="p-5 sm:p-6">

      @if (data.revenusMensuels.length > 0) {

        <div class="flex h-64 gap-3">

          <!-- AXE Y -->
          <div class="flex w-16 flex-col justify-between py-1 text-right text-[10px] text-ink-muted">
            <span>
              {{ getMaxRevenue() | number:'1.0-0' }}
            </span>

            <span>
              {{ (getMaxRevenue() * 0.75) | number:'1.0-0' }}
            </span>

            <span>
              {{ (getMaxRevenue() * 0.5) | number:'1.0-0' }}
            </span>

            <span>
              {{ (getMaxRevenue() * 0.25) | number:'1.0-0'}}
            </span>

            <span>0</span>
          </div>

          <!-- GRAPH -->
          <div class="relative flex flex-1 flex-col">

            <!-- lignes horizontales -->
            <div class="pointer-events-none absolute inset-0 flex flex-col justify-between">
              @for (line of [1, 2, 3, 4, 5]; track line) {
                <div class="border-t border-line/60"></div>
              }
            </div>

            <!-- SVG -->
            <svg
              class="relative h-full w-full overflow-visible"
              viewBox="0 0 600 240"
              preserveAspectRatio="none"
            >

              <!-- zone sous la courbe -->
              <path
                [attr.d]="buildRevenueAreaPath(data.revenusMensuels)"
                class="fill-accent/10"
              />

              <!-- courbe -->
              <path
                [attr.d]="buildRevenuePath(data.revenusMensuels)"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="text-accent"
              />

              <!-- points -->
              @for (
                item of data.revenusMensuels;
                track item.mois;
                let i = $index
              ) {
                <circle
                  [attr.cx]="getChartX(i, data.revenusMensuels.length)"
                  [attr.cy]="getRevenueY(item.montant)"
                  r="4"
                  class="fill-surface stroke-accent"
                  stroke-width="3"
                />
              }

            </svg>

            <!-- labels -->
            <div class="mt-3 flex justify-between">
              @for (
                item of data.revenusMensuels;
                track item.mois
              ) {
                <span class="text-[10px] font-medium text-ink-muted">
                  {{ getMonthLabel(item.mois) }}
                </span>
              }
            </div>

          </div>
        </div>

      } @else {

        <div class="flex h-64 items-center justify-center text-xs text-ink-muted">
          Aucune donnée de revenus disponible.
        </div>

      }

    </div>
  </div>


  <!-- NOUVELLES STRUCTURES -->
  <div class="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">

    <div class="border-b border-line px-5 py-4 sm:px-6 sm:py-5">
      <h2 class="text-sm font-bold text-ink">
        Nouvelles structures
      </h2>

      <p class="mt-0.5 text-xs text-ink-muted">
        Évolution des inscriptions sur les 6 derniers mois
      </p>
    </div>

    <div class="p-5 sm:p-6">

      @if (data.nouvellesStructuresMensuelles.length > 0) {

        <div class="flex h-64 items-end gap-3 sm:gap-5">

          @for (
            item of data.nouvellesStructuresMensuelles;
            track item.mois
          ) {

            <div class="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">

              <span class="text-xs font-bold text-ink">
                {{ item.nombre }}
              </span>

              <div class="flex h-48 w-full items-end">

                <div
                  class="mx-auto w-full max-w-12 rounded-t-lg bg-accent transition-all duration-500"
                  [style.height.%]="
                    getMaxStructures() > 0
                      ? (item.nombre / getMaxStructures()) * 100
                      : 0
                  "
                  [attr.title]="
                    getMonthLabel(item.mois) + ': ' + item.nombre
                  "
                ></div>

              </div>

              <span class="text-[10px] font-medium text-ink-muted">
                {{ getMonthLabel(item.mois) }}
              </span>

            </div>

          }

        </div>

      } @else {

        <div class="flex h-64 items-center justify-center text-xs text-ink-muted">
          Aucune donnée disponible.
        </div>

      }

    </div>
  </div>

</section>


<!-- TRANSACTIONS -->
<section class="mt-6">

  <div class="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">

    <div class="border-b border-line px-5 py-4 sm:px-6 sm:py-5">

      <h2 class="text-sm font-bold text-ink">
        Répartition des transactions
      </h2>

      <p class="mt-0.5 text-xs text-ink-muted">
        Ensemble des transactions enregistrées
      </p>

    </div>

    <div class="grid grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-4">

      @for (
        transaction of [
          { key: 'SUCCES', label: 'Réussies' },
          { key: 'EN_ATTENTE', label: 'En attente' },
          { key: 'ECHEC', label: 'Échouées' },
          { key: 'ANNULE', label: 'Annulées' }
        ];
        track transaction.key
      ) {

        <div class="rounded-xl border border-line bg-surface-muted/30 p-4">

          <div class="flex items-center justify-between">

            <div>
              <p class="text-xs font-semibold text-ink-muted">
                {{ transaction.label }}
              </p>

              <p class="mt-1 text-2xl font-extrabold text-ink">
                {{ data.transactionsParStatut[transaction.key] ?? 0 }}
              </p>
            </div>

            <span class="text-xs font-bold text-accent">
              {{ getTransactionPercentage(transaction.key) }}%
            </span>

          </div>

          <div class="mt-4 h-1.5 overflow-hidden rounded-full bg-line">

            <div
              class="h-full rounded-full bg-accent transition-all duration-500"
              [style.width.%]="getTransactionPercentage(transaction.key)"
            ></div>

          </div>

        </div>

      }

    </div>

  </div>

</section>

        <!-- 3. SECTIONS DE SUPERVISION (Paiements & Répartition) -->
        <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">

          <!-- Supervision des paiements -->
          <div class="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
            <div class="border-b border-line px-5 py-4 sm:px-6 sm:py-5 flex items-center justify-between bg-surface-muted/30">
              <div>
                <h2 class="text-sm font-bold text-ink">Supervision des paiements</h2>
                <p class="mt-0.5 text-xs text-ink-muted">État récent des flux financiers</p>
              </div>
              <span
                class="rounded-full border px-3 py-1 text-xs font-semibold"
                [class]="data.transactionsEchecRecentes > 0 ? 'border-amber-500/30 bg-amber-500/10 text-amber-700' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'"
              >
                {{ data.transactionsEchecRecentes > 0 ? 'Attention requise' : 'Système stable' }}
              </span>
            </div>

            <div class="divide-y divide-line">
              <div class="flex items-center justify-between p-4 sm:p-5">
                <div>
                  <p class="text-xs font-bold text-ink">Transactions échouées</p>
                  <p class="mt-0.5 text-[11px] text-ink-muted">Sur les 7 derniers jours</p>
                </div>
                <span class="text-sm font-bold" [class]="data.transactionsEchecRecentes > 0 ? 'text-amber-600' : 'text-ink'">
                  {{ data.transactionsEchecRecentes }}
                </span>
              </div>

              <div class="flex items-center justify-between p-4 sm:p-5">
                <div>
                  <p class="text-xs font-bold text-ink">Revenus globaux cumulés</p>
                  <p class="mt-0.5 text-[11px] text-ink-muted">Depuis le lancement</p>
                </div>
                <span class="text-sm font-bold text-ink">
                  {{ data.revenuTotal  }} FCFA
                </span>
              </div>
            </div>
          </div>

          <!-- Répartition des structures -->
          <div class="rounded-2xl border border-line bg-surface shadow-xs overflow-hidden">
            <div class="border-b border-line px-5 py-4 sm:px-6 sm:py-5 bg-surface-muted/30">
              <h2 class="text-sm font-bold text-ink">Répartition des structures</h2>
              <p class="mt-0.5 text-xs text-ink-muted">Structure des abonnements actuels</p>
            </div>

            <div class="p-5 sm:p-6">
              <div class="grid grid-cols-2 gap-4">
                <div class="rounded-xl border border-line bg-surface-muted/30 p-4">
                  <p class="text-xs font-semibold text-ink-muted">Premium</p>
                  <p class="mt-1 text-xl font-extrabold text-ink">{{ data.structuresPremium }}</p>
                </div>

                <div class="rounded-xl border border-line bg-surface-muted/30 p-4">
                  <p class="text-xs font-semibold text-ink-muted">Freemium</p>
                  <p class="mt-1 text-xl font-extrabold text-ink">{{ data.structuresFreemium }}</p>
                </div>
              </div>

              <div class="mt-6 pt-4 border-t border-line/60 flex items-center justify-between text-xs text-ink-muted">
                <span>Total enregistré</span>
                <span class="font-bold text-ink">{{ data.totalStructures }} structures</span>
              </div>
            </div>
          </div>

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

  ngOnInit(): void {
    this.loadDashboard();
  }

  protected getChartX(
    index: number,
    total: number
  ): number {
    if (total <= 1) {
      return 300;
    }

    return (index / (total - 1)) * 600;
  }

  protected getMaxRevenue(): number {
    const data = this.dashboard();

    if (!data?.revenusMensuels?.length) {
      return 0;
    }

    return Math.max(
      ...data.revenusMensuels.map(item => item.montant),
      1
    );
  }

  protected getRevenueY(montant: number): number {
    const max = this.getMaxRevenue();

    if (max === 0) {
      return 220;
    }

    return 220 - (montant / max) * 200;
  }

  protected buildRevenuePath(
    data: { mois: string; montant: number }[]
  ): string {
    if (!data.length) {
      return '';
    }

    return data
      .map((item, index) => {
        const x = this.getChartX(index, data.length);
        const y = this.getRevenueY(item.montant);

        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }

  protected buildRevenueAreaPath(
    data: { mois: string; montant: number }[]
  ): string {
    if (!data.length) {
      return '';
    }

    const line = this.buildRevenuePath(data);

    const lastX = this.getChartX(
      data.length - 1,
      data.length
    );

    const firstX = this.getChartX(
      0,
      data.length
    );

    return `${line} L ${lastX} 220 L ${firstX} 220 Z`;
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

  protected getMaxStructures(): number {
    const data = this.dashboard();

    if (!data?.nouvellesStructuresMensuelles?.length) {
      return 0;
    }

    return Math.max(
      ...data.nouvellesStructuresMensuelles.map(
        item => item.nombre
      ),
      1
    );
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

  protected getTransactionPercentage(
    statut: string
  ): number {
    const transactions =
      this.dashboard()?.transactionsParStatut;

    if (!transactions) {
      return 0;
    }

    const total = this.getTransactionTotal();

    if (total === 0) {
      return 0;
    }

    return Math.round(
      ((transactions[statut] ?? 0) / total) * 100
    );
  }

  protected loadDashboard(): void {
    this.loading.set(true);
    this.error.set(false);

    this.superAdminService.getDashboard().subscribe({
      next: (data) => {
        this.dashboard.set(data);
        console.log(data);
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