import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { PaiementService } from '../../../../core/services/paiement.service';


@Component({
  selector: 'app-paiement-succes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './paiement-succes.html',
  styleUrl: './paiement-succes.css'
})
export class PaiementSucces {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paiementService = inject(PaiementService);

  readonly token = signal<string | null>(null);

  readonly chargement = signal(true);
  readonly succes = signal(false);
  readonly message = signal('');

  readonly plan = signal('');
  readonly montant = signal(0);
  readonly dateConfirmation = signal<string | null>(null);

  constructor() {

    const token = this.route.snapshot.queryParamMap.get('token');

    console.log('Token PayDunya reçu :', token);

    this.token.set(token);

    if (!token) {
      this.chargement.set(false);
      this.message.set('Aucun token de paiement reçu.');
      return;
    }

    this.confirmerPaiement(token);
  }

  private confirmerPaiement(token: string): void {

    console.log('🚀 Vérification du paiement...');

    this.paiementService.confirmerPaiement(token)
      .subscribe({

        next: (response) => {

          console.log('✅ Confirmation paiement :', response);

          this.chargement.set(false);
          this.succes.set(response.statut === 'SUCCES');
          this.message.set(response.message);

          this.plan.set(response.plan);
          this.montant.set(response.montant);
          this.dateConfirmation.set(response.dateConfirmation);
        },

        error: (error) => {

          console.error('❌ Erreur confirmation paiement :', error);

          this.chargement.set(false);
          this.succes.set(false);

          this.message.set(
            error?.error?.message ??
            'Impossible de confirmer le paiement.'
          );
        }
      });
  }

  retournerAccueil(): void {
    this.router.navigate(['/']);
  }
}