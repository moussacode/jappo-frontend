import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/components/icon/icon';
import { UpgradePremiumButton } from '../../components/upgrade-premium/upgrade-premium';
import { AbonnementService } from '../../../../core/services/abonnement.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import {
  PlanAbonnement,
  avantagesPlan,
  formaterDuree,
  formaterPrix,
} from '../../../../core/models/abonnement.model';

/** Page tarifs : générée depuis les plans actifs configurés par le SUPER_ADMIN. */
@Component({
  selector: 'app-upgrade-premium-page',
  standalone: true,
  imports: [
    RouterLink,
    Icon,
    UpgradePremiumButton
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upgrade-premium.html',
  styleUrl: './upgrade-premium.css',
})
export class UpgradePremium {

  private readonly abonnementService = inject(AbonnementService);
  private readonly structureContext = inject(StructureContextService);

  protected readonly plans = signal<PlanAbonnement[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal('');

  protected readonly planActuel = this.structureContext.planEffectif;
  protected readonly estAdmin = computed(
    () => this.structureContext.activeRole() === 'ADMIN_STRUCTURE'
  );

  private readonly selectionId = signal<string | null>(null);

  /** Plan sélectionné ; par défaut le premier plan payant au-delà du plan actuel. */
  protected readonly planChoisi = computed<PlanAbonnement | null>(() => {
    const payants = this.plans().filter(p => p.prix > 0);
    const choisi = payants.find(p => p.id === this.selectionId());
    if (choisi) return choisi;
    const ordreActuel = this.planActuel()?.ordre ?? -1;
    return payants.find(p => p.ordre > ordreActuel) ?? payants[0] ?? null;
  });

  protected readonly avantages = avantagesPlan;
  protected readonly prix = formaterPrix;
  protected readonly duree = formaterDuree;

  constructor() {
    this.abonnementService.getPlansDisponibles().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.chargement.set(false);
      },
      error: () => {
        this.erreur.set('Impossible de charger les offres. Réessayez dans un instant.');
        this.chargement.set(false);
      },
    });
  }

  protected choisir(plan: PlanAbonnement): void {
    if (plan.prix > 0) {
      this.selectionId.set(plan.id);
    }
  }
}
