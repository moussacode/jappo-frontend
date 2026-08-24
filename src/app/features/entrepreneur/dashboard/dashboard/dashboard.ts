
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { DocumentService } from '../../../../core/services/document.service';

import { StatutMission } from '../../../../core/models';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PARCOURS } from '../../../../core/constants/parcours.constant';
import { getIndexEtape } from '../../../../core/utils/parcours.util';
import { STATUT_MISSION_BADGE } from '../../../../core/constants/statut-mission.constant';


@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCardComponent, BadgeComponent, ButtonComponent],
   templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly missionService = inject(MissionService);
  private readonly documentService = inject(DocumentService);

  protected readonly user = this.authService.currentUser;
  protected readonly parcours = PARCOURS;

  protected readonly prenom = computed(() => this.user()?.nom?.split(' ')[0] ?? '');

  protected readonly indexEtapeActuelle = computed(() => getIndexEtape(this.user()?.etapeActuelle));

  protected readonly etapeActuelleLabel = computed(() => this.parcours[this.indexEtapeActuelle()]?.label ?? '');
  protected readonly etapeIndexLabel = computed(() => `${this.indexEtapeActuelle() + 1}/${this.parcours.length} étapes`);

  // Aperçu : étape précédente + actuelle + suivante seulement (le détail complet vit sur /entrepreneur/parcours)
  protected readonly parcoursApercu = computed(() => {
    const i = this.indexEtapeActuelle();
    const start = Math.max(0, i - 1);
    return this.parcours.slice(start, start + 3);
  });
  protected readonly indexApercuActuel = computed(() => this.indexEtapeActuelle() - Math.max(0, this.indexEtapeActuelle() - 1));

  private readonly userId = this.authService.currentUser()?.id ?? '';

  protected readonly missions = toSignal(this.missionService.getByEntrepreneur(this.userId), { initialValue: [] });
  protected readonly documents = toSignal(this.documentService.getByEntrepreneur(this.userId), { initialValue: [] });

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_BADGE[statut];
  }
}
