import { Component, inject, computed, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MeetingService } from '../../../../core/services/meeting.service';
import { Mission, Projet } from '../../../../core/models';
import { Meeting } from '../../../../core/models/meeting.model';

// Design System Partagé
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, KpiCardComponent, BadgeComponent, CardComponent, Icon],
  templateUrl: './dashboard.html',
})
export class Dashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly meetingService = inject(MeetingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = this.authService.currentUser;
  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly meetings = signal<Meeting[]>([]);
  protected readonly nextMission = signal<Mission | null>(null);

  protected readonly prenom = computed(() => {
    const u = this.user();
    if (!u) return '';
    return u.prenom || u.nom?.split(' ')[0] || 'Entrepreneur';
  });

  // Utiliser les statistiques calculées côté backend
  protected readonly missionsTermineesCount = computed(() => {
    return this.projet()?.nombreMissionsValidees ?? 0;
  });

  protected readonly missionsTotalCount = computed(() => {
    return this.projet()?.nombreMissionsTotal ?? 0;
  });

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => {
        this.projet.set(p);
        if (!p?.id) return;

        this.missionService
          .getByProjet(p.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe((m) => {
            this.missions.set(m);
            this.findNextMission(m);
          });
      });

    // Charger les réunions de l'entrepreneur
    this.meetingService.getMyMeetings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => this.meetings.set(m));
  }

  private findNextMission(missions: Mission[]): void {
    // Trouver la première mission à faire sans livrable déposé
    const pending = missions.find(m =>
      m.statut === 'A_FAIRE' && (m.nombreLivrablesDeposes || 0) === 0
    );
    this.nextMission.set(pending || null);
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
    switch (statut?.toUpperCase()) {
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

  protected modeBadge(mode: string | undefined): { status: BadgeStatus; label: string } {
    switch (mode) {
      case 'ONLINE':
        return { status: 'info', label: 'En ligne' };
      case 'PRESENTIEL':
        return { status: 'neutral', label: 'Présentiel' };
      default:
        return { status: 'neutral', label: mode || 'Inconnu' };
    }
  }

  protected statusBadge(status: string | undefined): { status: BadgeStatus; label: string } {
    switch (status) {
      case 'PLANNED':
        return { status: 'neutral', label: 'Prévue' };
      case 'ONGOING':
        return { status: 'success', label: 'En cours' };
      case 'ENDED':
        return { status: 'danger', label: 'Terminée' };
      case 'CANCELLED':
        return { status: 'danger', label: 'Annulée' };
      default:
        return { status: 'neutral', label: status || 'Inconnu' };
    }
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  }

  protected formatTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
}