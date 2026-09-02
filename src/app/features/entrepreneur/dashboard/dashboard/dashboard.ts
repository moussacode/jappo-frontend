
import { Component, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { DocumentService } from '../../../../core/services/document.service';
import { ProjetService } from '../../../../core/services/projet.service'
import { DocumentGenere, Mission, Projet, StatutMission } from '../../../../core/models';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PARCOURS } from '../../../../core/constants/parcours.constant';
import { getIndexEtape } from '../../../../core/utils/parcours.util';
import { STATUT_MISSION_BADGE } from '../../../../core/constants/statut-mission.constant';
import { Icon } from "../../../../shared/components/icon/icon";


@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCardComponent, BadgeComponent, ButtonComponent, Icon],
   templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly documentService = inject(DocumentService);

  protected readonly user = this.authService.currentUser;
  protected readonly parcours = PARCOURS;
  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly documents = signal<DocumentGenere[]>([]);

  protected readonly prenom = computed(() => this.user()?.nom?.split(' ')[0] ?? '');

  protected readonly indexEtapeActuelle = computed(() => getIndexEtape(this.projet()?.etapeActuelle));

  protected readonly etapeActuelleLabel = computed(() => this.parcours[this.indexEtapeActuelle()]?.label ?? '');
  protected readonly etapeIndexLabel = computed(() => `${this.indexEtapeActuelle() + 1}/${this.parcours.length} étapes`);

  protected readonly parcoursApercu = computed(() => {
    const i = this.indexEtapeActuelle();
    const start = Math.max(0, i - 1);
    return this.parcours.slice(start, start + 3);
  });
  protected readonly indexApercuActuel = computed(() => this.indexEtapeActuelle() - Math.max(0, this.indexEtapeActuelle() - 1));

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => {
      this.projet.set(p);
      if (!p) return;
      this.missionService.getByProjet(p.id).subscribe((m) => this.missions.set(m));
      this.documentService.getByProjet(p.id).subscribe((d) => this.documents.set(d));
    });
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_BADGE[statut];
  }
}
