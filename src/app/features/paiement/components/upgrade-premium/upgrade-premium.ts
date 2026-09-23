import { Component, inject, signal } from '@angular/core';

import { StructureContextService } from '../../../../core/services/structure-context.service';
import { PaiementService } from '../../../../core/services/paiement.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

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

  readonly chargement = signal(false);
  readonly erreur = signal('');

  passerPremium(): void {

    if (this.chargement()) {
      return;
    }

    const activeMembership =
      this.structureContext.activeMembership();

    const structureId =
      activeMembership?.structure?.id ??
      localStorage.getItem('jappo_active_structure_id');

    if (!structureId) {
      this.erreur.set(
        'Aucune structure active sélectionnée.'
      );
      return;
    }

    this.erreur.set('');
    this.chargement.set(true);

    this.paiementService
      .initierUpgradePremium(structureId)
      .subscribe({

        next: (response) => {

          console.log(
            'Redirection PayDunya :',
            response.redirectUrl
          );

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