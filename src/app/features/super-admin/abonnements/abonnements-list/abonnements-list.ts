import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { SuperAdminService } from '../../../../core/services/super-admin.service';

import {
  SuperAdminAbonnement,
} from '../../../../core/models/super-admin.models';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ButtonComponent } from '../../../../shared/components/button/button.component';


type AbonnementFilter =
  | 'TOUS'
  | 'PREMIUM'
  | 'FREEMIUM'
  | 'ACTIF'
  | 'EXPIRE';

@Component({
  selector: 'app-abonnements-list',
  standalone: true,
  imports: [
    TabFilterComponent,
    BadgeComponent,
    Icon,
    EmptyStateComponent,
    ButtonComponent
],
  templateUrl: './abonnements-list.html',
})
export class AbonnementsList implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);

  protected readonly abonnements =
    signal<SuperAdminAbonnement[]>([]);

  protected readonly loading = signal(true);

  protected readonly error =
    signal<string | null>(null);

  protected readonly activeFilter =
    signal<AbonnementFilter>('TOUS');

  protected readonly filteredAbonnements = computed(() => {
    const filter = this.activeFilter();
    const abonnements = this.abonnements();

    if (filter === 'TOUS') {
      return abonnements;
    }

    return abonnements.filter(abonnement => {
      const plan = abonnement.plan?.toUpperCase();
      const statut = abonnement.statut?.toUpperCase();

      switch (filter) {
        case 'PREMIUM':
          return plan === 'PREMIUM';

        case 'FREEMIUM':
          return plan === 'FREEMIUM';

        case 'ACTIF':
          return statut === 'ACTIF';

        case 'EXPIRE':
          return statut === 'EXPIRE';

        default:
          return true;
      }
    });
  });

  protected readonly nombreTotal = computed(
    () => this.abonnements().length
  );

  protected readonly nombrePremium = computed(() =>
    this.abonnements().filter(
      abonnement =>
        abonnement.plan?.toUpperCase() === 'PREMIUM'
    ).length
  );

  protected readonly nombreFreemium = computed(() =>
    this.abonnements().filter(
      abonnement =>
        abonnement.plan?.toUpperCase() === 'FREEMIUM'
    ).length
  );

  protected readonly nombreActifs = computed(() =>
    this.abonnements().filter(
      abonnement =>
        abonnement.statut?.toUpperCase() === 'ACTIF'
    ).length
  );

  protected readonly filtresDisponibles =
    computed<TabOption<AbonnementFilter>[]>(() => [
      {
        value: 'TOUS',
        label: 'Tous',
      },
      {
        value: 'PREMIUM',
        label: 'Premium',
        count: this.nombrePremium(),
      },
      {
        value: 'FREEMIUM',
        label: 'Freemium',
        count: this.nombreFreemium(),
      },
      {
        value: 'ACTIF',
        label: 'Actifs',
        count: this.nombreActifs(),
      },
      {
        value: 'EXPIRE',
        label: 'Expirés',
      },
    ]);

  ngOnInit(): void {
    this.chargerAbonnements();
  }

  protected chargerAbonnements(): void {
    this.loading.set(true);
    this.error.set(null);

    this.superAdminService.getAbonnements().subscribe({
      next: abonnements => {
        this.abonnements.set(abonnements);
        this.loading.set(false);
      },

      error: err => {
        console.error(
          'Erreur chargement abonnements',
          err
        );

        this.error.set(
          'Impossible de charger les abonnements.'
        );

        this.loading.set(false);
      },
    });
  }

  protected changerFiltre(
    filter: AbonnementFilter
  ): void {
    this.activeFilter.set(filter);
  }

  protected getPlanLabel(plan?: string): string {
    switch (plan?.toUpperCase()) {
      case 'PREMIUM':
        return 'Premium';

      case 'FREEMIUM':
        return 'Freemium';

      default:
        return plan ?? '—';
    }
  }

  protected getPlanBadgeStatus(
    plan?: string
  ): 'success' | 'danger' | 'neutral' | 'info' {
    switch (plan?.toUpperCase()) {
      case 'PREMIUM':
        return 'success';

      case 'FREEMIUM':
        return 'neutral';

      default:
        return 'neutral';
    }
  }

  protected getStatutLabel(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'ACTIF':
        return 'Actif';

      case 'EXPIRE':
        return 'Expiré';

      case 'EN_ATTENTE_PAIEMENT':
        return 'En attente de paiement';

      case 'ANNULE':
        return 'Annulé';

      default:
        return statut ?? '—';
    }
  }

  protected getStatutBadgeStatus(
    statut?: string
  ): 'success' | 'danger' | 'neutral' | 'info' {
    switch (statut?.toUpperCase()) {
      case 'ACTIF':
        return 'success';

      case 'EXPIRE':
      case 'ANNULE':
        return 'danger';

      case 'EN_ATTENTE_PAIEMENT':
        return 'info';

      default:
        return 'neutral';
    }
  }

  protected formaterDate(
    date?: string | null
  ): string {
    if (!date) {
      return '—';
    }

    const value = new Date(date);

    if (Number.isNaN(value.getTime())) {
      return '—';
    }

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }
}