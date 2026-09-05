
import { Component, inject, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import {  BadgeComponent } from '../../../../shared/components/badge/badge';

import { Mission, StatutMission } from '../../../../core/models';
import { STATUT_MISSION_BADGE } from '../../../../core/constants/statut-mission.constant';
import { ProjetService } from '../../../../core/services/projet.service';
import { Icon } from "../../../../shared/components/icon/icon";

type FiltreStatut = 'toutes' | StatutMission;

@Component({
  selector: 'app-missions-list',
  imports: [RouterLink, BadgeComponent, Icon],
  templateUrl: './missions-list.html',
  styleUrl: './missions-list.css',
})
export class MissionsList {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);

  private readonly allMissions = signal<Mission[]>([]);
  protected readonly filtreActif = signal<FiltreStatut>('toutes');

  protected readonly filtres: { cle: FiltreStatut; label: string }[] = [
    { cle: 'toutes', label: 'Toutes' },
    { cle: 'a_faire', label: 'À faire' },
    { cle: 'en_cours', label: 'En cours' },
    { cle: 'terminee', label: 'Terminées' },
  ];

  protected readonly missionsFiltrees = computed(() => {
    const filtre = this.filtreActif();
    const missions = this.allMissions();
    return filtre === 'toutes' ? missions : missions.filter((m) => m.statut === filtre);
  });

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => {
      if (!p) return;
      this.missionService.getByProjet(p.id).subscribe((m) => this.allMissions.set(m));
    });
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_BADGE[statut];
  }
}
