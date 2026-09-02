
import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { PARCOURS } from '../../../../core/constants/parcours.constant';

import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { getIndexEtape } from '../../../../core/utils/parcours.util';
import { Icon } from "../../../../shared/components/icon/icon";
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet } from '../../../../core/models';

@Component({
  selector: 'app-parcours',
  imports: [RouterLink, ButtonComponent, Icon],
   templateUrl: './parcours.html',
  styleUrl: './parcours.css',
})
export class Parcours {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);

  protected readonly parcours = PARCOURS;
  protected readonly projet = signal<Projet | undefined>(undefined);

  protected readonly indexEtapeActuelle = computed(() => getIndexEtape(this.projet()?.etapeActuelle));
  protected readonly pourcentage = computed(() => Math.round((this.indexEtapeActuelle() / this.parcours.length) * 100));

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => this.projet.set(p));
    }
  }
}