import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { DocumentGenere, Mission, Projet, StatutMission } from '../../../../core/models';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, KpiCardComponent, BadgeComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);

  protected readonly user = this.authService.currentUser;
  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly documents = signal<DocumentGenere[]>([]);

  protected readonly prenom = computed(() => this.user()?.nom?.split(' ')[0] ?? '');

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => {
      this.projet.set(p);
      if (!p) return;
      this.missionService.getByProjet(p.id).subscribe((m) => this.missions.set(m));
    });
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
  switch (statut) {
    case 'TERMINEE':
    case 'VALIDE':
      return { status: 'success', label: 'Terminée' };
    case 'EN_COURS':
      return { status: 'info', label: 'En cours' };
    case 'A_FAIRE':
      return { status: 'neutral', label: 'À faire' };
    case 'EN_ATTENTE_VALIDATION':
      return { status: 'warning', label: 'À valider' };
    default:
      return { status: 'neutral', label: statut || 'Non démarrée' };
  }
}
}