
import { Component, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { PARCOURS } from '../../../../core/constants/parcours.constant';

import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { getIndexEtape } from '../../../../core/utils/parcours.util';

@Component({
  selector: 'app-parcours',
  imports: [RouterLink, ButtonComponent],
   templateUrl: './parcours.html',
  styleUrl: './parcours.css',
})
export class Parcours {
  private readonly authService = inject(AuthService);
  protected readonly parcours = PARCOURS;

  protected readonly indexEtapeActuelle = computed(() => getIndexEtape(this.authService.currentUser()?.etapeActuelle));

  protected readonly pourcentage = computed(() => Math.round((this.indexEtapeActuelle() / this.parcours.length) * 100));
}