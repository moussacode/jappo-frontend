
import { Component, inject, computed, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PARCOURS } from '../../../../core/constants/parcours.constant';
import { EtapeParcours, Projet } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { getIndexEtape } from '../../../../core/utils/parcours.util';
import { ProjetService } from '../../../../core/services/projet.service';



@Component({
  selector: 'app-bienvenue',
  imports: [ButtonComponent, RouterLink],
   templateUrl: './bienvenue.html',
  styleUrl: './bienvenue.css',
})
export class Bienvenue {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly router = inject(Router);

  protected readonly parcours = PARCOURS;
  protected readonly projet = signal<Projet | undefined>(undefined);

  protected readonly prenom = computed(() => {
    const user = this.authService.currentUser();
    return user?.nom?.split(' ')[0] ?? '';
  });

  protected readonly indexEtapeActuelle = computed(() => getIndexEtape(this.projet()?.etapeActuelle));

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => this.projet.set(p));
    }
  }

  protected goToDashboard(): void {
    this.router.navigate(['/entrepreneur/dashboard']);
  }
}