import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-paiement-annule',
  standalone: true,
  templateUrl: './paiement-annule.html',
  styleUrl: './paiement-annule.css'
})
export class PaiementAnnule {

  private readonly router = inject(Router);

  retournerAccueil(): void {
    this.router.navigate(['/']);
  }
}