
import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { PARCOURS } from '../../../../core/constants/parcours.constant';
import { EtapeParcours } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';



@Component({
  selector: 'app-bienvenue',
  imports: [ButtonComponent, RouterLink],
   templateUrl: './bienvenue.html',
  styleUrl: './bienvenue.css',
})
export class Bienvenue {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly parcours = PARCOURS;

  protected readonly prenom = computed(() => {
    const user = this.authService.currentUser();
    return user?.nom?.split(' ')[0] ?? '';
  });

  protected readonly indexEtapeActuelle = computed(() => {
    const user = this.authService.currentUser();
    if (!user) return 0;
    const index = this.parcours.findIndex((e) => e.cle === user.etapeActuelle);
    return index === -1 ? 0 : index;
  });

  protected goToDashboard(): void {
    this.router.navigate(['/entrepreneur/dashboard']);
  }
}