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
import { PlanAbonnement } from '../../../../core/models/abonnement.model';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ButtonComponent } from '../../../../shared/components/button/button.component';


/** 'TOUS', un statut, ou « plan:<code> » pour filtrer sur le plan effectif. */
type AbonnementFilter = string;

interface RepartitionPlan {
  code: string;
  libelle: string;
  estDefaut: boolean;
  nombre: number;
}

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

    if (filter.startsWith('plan:')) {
      const code = filter.slice('plan:'.length);
      return abonnements.filter(abonnement => abonnement.planEffectif?.code === code);
    }

    return abonnements.filter(abonnement => abonnement.statut?.toUpperCase() === filter);
  });

  protected readonly nombreTotal = computed(
    () => this.abonnements().length
  );

  /** Nombre d'abonnements par plan effectif, dans l'ordre des plans. */
  protected readonly repartition = computed<RepartitionPlan[]>(() => {
    const parCode = new Map<string, RepartitionPlan & { ordre: number }>();
    for (const abonnement of this.abonnements()) {
      const plan = abonnement.planEffectif;
      if (!plan) continue;
      const entree = parCode.get(plan.code)
        ?? { code: plan.code, libelle: plan.libelle, estDefaut: plan.estDefaut, ordre: plan.ordre, nombre: 0 };
      entree.nombre++;
      parCode.set(plan.code, entree);
    }
    return [...parCode.values()].sort((a, b) => a.ordre - b.ordre);
  });

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
      ...this.repartition().map(plan => ({
        value: `plan:${plan.code}`,
        label: plan.libelle,
        count: plan.nombre,
      })),
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

  protected getPlanLabel(plan?: PlanAbonnement | null): string {
    return plan?.libelle ?? '—';
  }

  /** Le plan par défaut (gratuit) en neutre, les autres en vert. */
  protected getPlanBadgeStatus(
    plan?: PlanAbonnement | null
  ): 'success' | 'danger' | 'neutral' | 'info' {
    return !plan || plan.estDefaut ? 'neutral' : 'success';
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