import { Component, inject, input, signal } from '@angular/core';

import { StructureContextService } from '../../../../core/services/structure-context.service';
import { PaiementService } from '../../../../core/services/paiement.service';
import { PlanAbonnement } from '../../../../core/models/abonnement.model';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

/** Lance le paiement PayDunya du plan choisi (le prix est fixé par le serveur). */
@Component({
  selector: 'app-upgrade-premium',
  standalone: true,
  templateUrl: './upgrade-premium.html',
  styleUrl: './upgrade-premium.css',
  imports: [ButtonComponent]
})
export class UpgradePremiumButton {

  private readonly paiementService = inject(PaiementService);
  private readonly structureContext = inject(StructureContextService);

  readonly plan = input<PlanAbonnement | null>(null);
  readonly disabled = input(false);

  readonly chargement = signal(false);
  readonly erreur = signal('');

  payer(): void {

    const plan = this.plan();

    if (this.chargement() || !plan) {
      return;
    }

    const structureId =
      this.structureContext.activeStructureId();

    if (!structureId) {
      this.erreur.set(
        'Aucune structure active sélectionnée.'
      );
      return;
    }

    this.erreur.set('');
    this.chargement.set(true);

    this.paiementService
      .initierPaiement(structureId, plan.id)
      .subscribe({

        next: (response) => {
          window.location.href = response.redirectUrl;
        },

        error: (error) => {

          console.error(
            'Erreur initiation paiement :',
            error
          );

          this.chargement.set(false);

          this.erreur.set(
            error?.error?.message ??
            'Impossible d’initier le paiement.'
          );
        }

      });
  }
}
