
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-changer-forfait',
  imports: [RouterLink, ButtonComponent],
  templateUrl: './changer-forfait.html',
  styleUrl: './changer-forfait.css',
  
})
export class ChangerForfait {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly confirmation = signal(false);
  protected readonly confirme = signal(false);

  protected confirmer(): void {
    // TODO backend réel : appel au service de paiement (Mobile Money) puis mise à jour de l'abonnement
    this.confirmation.set(true);
    setTimeout(() => {
      this.confirmation.set(false);
      this.confirme.set(true);
    }, 600);
  }
}
