import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { SuperAdminService } from '../../../../core/services/super-admin.service';

import {
  SuperAdminTransaction,
} from '../../../../core/models/super-admin.models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { TabOption, TabFilterComponent } from '../../../../shared/components/tab-filter/tab-filter.component';

type TransactionFilter =
  | 'TOUTES'
  | 'SUCCES'
  | 'EN_ATTENTE'
  | 'ECHEC'
  | 'ANNULE';

/**
 * Palette d'avatars — inspirée des couleurs sobres et
 * distinctes utilisées par Notion pour les initiales.
 */
const AVATAR_PALETTE: { bg: string; text: string }[] = [
  { bg: '#EAE4F7', text: '#6B4FBB' }, // violet
  { bg: '#FDECE4', text: '#C9682B' }, // orange
  { bg: '#E3F2E9', text: '#2E7D52' }, // vert
  { bg: '#E5F0FB', text: '#2A6FB0' }, // bleu
  { bg: '#FBE8EE', text: '#B23B62' }, // rose
  { bg: '#FDF5DC', text: '#A9821B' }, // jaune
  { bg: '#E7F3F3', text: '#2C7B7B' }, // sarcelle
];

@Component({
  selector: 'app-transactions-list',
  standalone: true,
  templateUrl: './transactions-list.html',
  imports: [
    FormsModule,
    ButtonComponent,
    Icon,
    EmptyStateComponent,
    BadgeComponent,
    KpiCardComponent,
    CardComponent,
    TabFilterComponent,
  ],
})
export class TransactionsList implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);

  protected readonly transactions =
    signal<SuperAdminTransaction[]>([]);

  protected readonly loading = signal(true);

  protected readonly error =
    signal<string | null>(null);

  protected readonly activeFilter =
    signal<TransactionFilter>('TOUTES');

  protected readonly searchQuery = signal('');

  /**
   * Transactions affichées selon le filtre et la recherche
   * actifs (structure, référence ou téléphone).
   */
  protected readonly filteredTransactions = computed(() => {
    const filter = this.activeFilter();
    const query = this.searchQuery().trim().toLowerCase();
    let transactions = this.transactions();

    if (filter !== 'TOUTES') {
      transactions = transactions.filter(
        transaction =>
          transaction.statut?.toUpperCase() === filter
      );
    }

    if (!query) {
      return transactions;
    }

    return transactions.filter(transaction =>
      [
        transaction.structureNom,
        transaction.refCommand,
        transaction.telephoneClient,
      ]
        .filter(Boolean)
        .some(field =>
          field!.toLowerCase().includes(query)
        )
    );
  });

  /**
   * Total réellement encaissé.
   *
   * Seules les transactions SUCCES
   * sont comptabilisées dans le revenu.
   */
  protected readonly totalEncaisse = computed(() =>
    this.transactions()
      .filter(
        transaction =>
          transaction.statut?.toUpperCase() === 'SUCCES'
      )
      .reduce(
        (total, transaction) =>
          total + (transaction.montant || 0),
        0
      )
  );

  /**
   * Nombre de transactions réussies.
   */
  protected readonly nombreSucces = computed(() =>
    this.transactions().filter(
      transaction =>
        transaction.statut?.toUpperCase() === 'SUCCES'
    ).length
  );

  /**
   * Nombre de transactions en attente.
   */
  protected readonly nombreEnAttente = computed(() =>
    this.transactions().filter(
      transaction =>
        transaction.statut?.toUpperCase() === 'EN_ATTENTE' ||
        transaction.statut?.toUpperCase() === 'EN_ATTENTE_PAIEMENT'
    ).length
  );

  /**
   * Nombre de transactions échouées.
   */
  protected readonly nombreEchecs = computed(() =>
    this.transactions().filter(
      transaction =>
        transaction.statut?.toUpperCase() === 'ECHEC'
    ).length
  );

  /**
   * Nombre de transactions annulées.
   */
  protected readonly nombreAnnulees = computed(() =>
    this.transactions().filter(
      transaction =>
        transaction.statut?.toUpperCase() === 'ANNULE'
    ).length
  );

  ngOnInit(): void {
    this.chargerTransactions();
  }

  protected readonly filtresDisponibles =
  computed<TabOption<TransactionFilter>[]>(() => [
    {
      value: 'TOUTES',
      label: 'Toutes',
    },
    {
      value: 'SUCCES',
      label: 'Succès',
    },
    {
      value: 'EN_ATTENTE',
      label: 'En attente',
    },
    {
      value: 'ECHEC',
      label: 'Échecs',
    },
    {
      value: 'ANNULE',
      label: 'Annulées',
    },
  ]);


  protected chargerTransactions(): void {
    this.loading.set(true);
    this.error.set(null);

    this.superAdminService.getTransactions().subscribe({
      next: transactions => {
        this.transactions.set(transactions);
        this.loading.set(false);
      },

      error: err => {
        console.error(
          'Erreur chargement transactions',
          err
        );

        this.error.set(
          'Impossible de charger les transactions.'
        );

        this.loading.set(false);
      },
    });
  }

  protected changerFiltre(
    filter: TransactionFilter
  ): void {
    this.activeFilter.set(filter);
  }

  protected onSearch(query: string): void {
    this.searchQuery.set(query);
  }

  protected getStatutLabel(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'SUCCES':
        return 'Succès';

      case 'EN_ATTENTE':
        return 'En attente';

      case 'EN_ATTENTE_PAIEMENT':
        return 'En attente de paiement';

      case 'ECHEC':
        return 'Échec';

      case 'ANNULE':
        return 'Annulé';

      default:
        return statut ?? '—';
    }
  }

  protected getBadgeStatus(
    statut?: string
  ): 'success' | 'danger' | 'neutral' | 'info' {
    switch (statut?.toUpperCase()) {
      case 'SUCCES':
        return 'success';

      case 'ECHEC':
      case 'ANNULE':
        return 'danger';

      case 'EN_ATTENTE':
      case 'EN_ATTENTE_PAIEMENT':
        return 'info';

      default:
        return 'neutral';
    }
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

  /**
   * Couleur d'avatar déterministe basée sur le nom de la
   * structure, pour distinguer les lignes visuellement sans
   * dépendre d'une image.
   */
  protected getAvatarColor(name: string): { bg: string; text: string } {
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AVATAR_PALETTE.length;

    return AVATAR_PALETTE[index];
  }

  protected formaterMontant(
    montant?: number | null,
    devise = 'XOF'
  ): string {
    if (montant === null || montant === undefined) {
      return '—';
    }

    const valeur = new Intl.NumberFormat('fr-FR').format(
      montant
    );

    return `${valeur} ${devise === 'XOF' ? 'FCFA' : devise}`;
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
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }
}