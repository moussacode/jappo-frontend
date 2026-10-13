import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  SuperAdminHistoriqueAbonnement,
  SuperAdminStructureDetail,
  SuperAdminTransaction,
} from '../../../../core/models/super-admin.models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { SuperAdminService } from '../../../../core/services/super-admin.service';
import { PlanAbonnement, formaterPrix } from '../../../../core/models/abonnement.model';

type DetailTab = 'membres' | 'transactions' | 'historique';

@Component({
  selector: 'app-structure-detail',
  standalone: true,
  imports: [
    ButtonComponent,
    BadgeComponent,
    Icon,
    EmptyStateComponent,
  ],
  templateUrl: './structure-detail.html',
})
export class StructureDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly superAdminService = inject(SuperAdminService);

  protected readonly structure = signal<SuperAdminStructureDetail | null>(null);
  protected readonly transactions = signal<SuperAdminTransaction[]>([]);
  protected readonly historique = signal<SuperAdminHistoriqueAbonnement[]>([]);

  protected readonly loading = signal(true);
  protected readonly actionLoading = signal(false);

  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);

  protected readonly activeTab = signal<DetailTab>('membres');

  /** Plans actifs proposés dans « Changer de plan ». */
  protected readonly plans = signal<PlanAbonnement[]>([]);
  protected readonly planSelectionneId = signal<string>('');

 protected readonly totalEncaisse = computed(() =>
  this.transactions()
    .filter(transaction => transaction.statut === 'SUCCES')
    .reduce(
      (total, transaction) => total + (transaction.montant || 0),
      0
    )
);

  ngOnInit(): void {
    this.chargerStructure();
    this.superAdminService.getPlans().subscribe({
      next: (plans) => this.plans.set(plans.filter(plan => plan.actif)),
      error: () => this.plans.set([]),
    });
  }

  // ---------------------------------------------------------------------------
  // Chargement des données
  // ---------------------------------------------------------------------------

  private chargerStructure(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error.set('Identifiant de structure introuvable.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.superAdminService.getStructure(id).subscribe({
      next: (structure) => {
        this.structure.set(structure);
        this.loading.set(false);

        this.chargerTransactions(id);
        this.chargerHistorique(id);
      },
      error: (err) => {
        console.error('Erreur chargement structure', err);
        this.error.set('Impossible de charger les informations de la structure.');
        this.loading.set(false);
      },
    });
  }

  private chargerTransactions(id: string): void {
    this.superAdminService.getStructureTransactions(id).subscribe({
      next: (transactions) => {
        this.transactions.set(transactions);
      },
      error: (err) => {
        console.error('Erreur chargement transactions', err);
      },
    });
  }

  private chargerHistorique(id: string): void {
    this.superAdminService.getHistoriqueAbonnement(id).subscribe({
      next: (historique) => {
        this.historique.set(historique);
      },
      error: (err) => {
        console.error('Erreur chargement historique abonnement', err);
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Navigation & Actions
  // ---------------------------------------------------------------------------

  protected retour(): void {
    this.router.navigate(['/super-admin/structures']);
  }

  protected suspendre(): void {
    const structure = this.structure();
    if (!structure) return;

    if (!window.confirm(`Voulez-vous vraiment suspendre « ${structure.nom} » ?`)) {
      return;
    }

    this.executerAction(
      () => this.superAdminService.suspendreStructure(structure.id),
      'Structure suspendue avec succès.'
    );
  }

  protected changerPlan(): void {
    const structure = this.structure();
    const plan = this.plans().find(p => p.id === this.planSelectionneId());
    if (!structure || !plan) return;

    const duree = plan.dureeJours === null ? 'sans limite de durée' : `pour ${plan.dureeJours} jours`;
    if (!window.confirm(`Attribuer l'offre « ${plan.libelle} » à « ${structure.nom} », dès maintenant et ${duree} ?`)) {
      return;
    }

    this.executerAction(
      () => this.superAdminService.changerPlan(structure.id, plan.id),
      `Offre ${plan.libelle} attribuée.`
    );
  }

  private executerAction(
    action: () => ReturnType<
      SuperAdminService['suspendreStructure' | 'changerPlan']
    >,
    successMessage: string
  ): void {
    this.actionLoading.set(true);
    this.actionError.set(null);

    action().subscribe({
      next: () => {
        this.actionLoading.set(false);
        this.chargerStructure();
        console.info(successMessage);
      },
      error: (err) => {
        console.error('Erreur action structure', err);
        this.actionLoading.set(false);
        this.actionError.set(
          err?.error?.message ?? 'Impossible d’exécuter cette action.'
        );
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers de formatage & badges
  // ---------------------------------------------------------------------------

  protected getInitiales(prenom?: string, nom?: string): string {
    const p = prenom?.trim().charAt(0) ?? '';
    const n = nom?.trim().charAt(0) ?? '';
    return (p + n).toUpperCase() || 'U';
  }

  protected getPlanLabel(plan?: PlanAbonnement | null): string {
    return plan?.libelle ?? '—';
  }

  /** Le plan par défaut en neutre, les autres en vert. */
  protected getPlanBadgeStatus(plan?: PlanAbonnement | null): 'success' | 'neutral' {
    return !plan || plan.estDefaut ? 'neutral' : 'success';
  }

  protected getStatutLabel(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'ACTIVE':
      case 'ACTIF':
        return 'Actif';
      case 'SUSPENDUE':
        return 'Suspendue';
      case 'EXPIRE':
        return 'Expiré';
      case 'EN_ATTENTE_PAIEMENT':
      case 'EN_ATTENTE':
        return 'En attente';
      case 'ANNULE':
        return 'Annulé';
      case 'SUCCES':
        return 'Succès';
      case 'ECHEC':
        return 'Échec';
      default:
        return statut ?? '—';
    }
  }

  protected getBadgeStatus(
    statut?: string
  ): 'success' | 'danger' | 'neutral' | 'info' {
    switch (statut?.toUpperCase()) {
      case 'ACTIVE':
      case 'ACTIF':
      case 'SUCCES':
        return 'success';

      case 'SUSPENDUE':
      case 'EXPIRE':
      case 'ECHEC':
      case 'ANNULE':
        return 'danger';

      case 'EN_ATTENTE':
      case 'EN_ATTENTE_PAIEMENT':
        return 'neutral';

      default:
        return 'info';
    }
  }

  protected formaterDate(date?: string | null): string {
    if (!date) return '—';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '—';

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(value);
  }

  protected formaterDateHeure(date?: string | null): string {
    if (!date) return '—';
    const value = new Date(date);
    if (Number.isNaN(value.getTime())) return '—';

    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(value);
  }

  protected formaterMontant(montant?: number | null, devise = 'XOF'): string {
    if (montant === null || montant === undefined) return '—';
    return formaterPrix(montant, devise);
  }
}