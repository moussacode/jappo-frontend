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
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête de bienvenue avec Badge de Cohorte -->
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Bonjour {{ prenom() }}</h1>
          <p class="mt-1 text-xs sm:text-sm text-ink-muted">
            Voici un aperçu de l'avancement de <strong class="text-ink">{{ projet()?.nom || 'votre projet' }}</strong>.
          </p>
        </div>

        @if (projet()?.nomCohorte) {
          <div class="flex items-center gap-2 self-start sm:self-auto rounded-xl border border-line bg-surface px-3 py-1.5 shadow-2xs">
            <app-icon name="missions" class="size-4 text-accent" />
            <span class="text-xs font-semibold text-ink">{{ projet()?.nomCohorte }}</span>
          </div>
        }
      </div>

      <!-- Grille KPIs (Score de maturité + Avancement des missions) -->
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <app-kpi-card
          label="Score de maturité"
          [value]="(projet()?.scoreMaturite ?? 0) + '%'"
          note="Évaluation globale"
          noteVariant="success"
        />

        <app-kpi-card
          label="Missions validées"
          [value]="missionsTermineesCount() + ' / ' + missionsTotalCount()"
          note="Taux de complétion"
          noteVariant="brand"
        />

        <app-kpi-card
          label="Statut du projet"
          [value]="projet()?.statut || 'En cours'"
          note="Phase d'incubation"
          noteVariant="neutral"
        />
      </div>

      <!-- Section Mes réunions -->
      <div class="grid grid-cols-1 gap-5">
        <app-card padding="none" class="overflow-hidden shadow-xs">
          
          <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
            <h2 class="text-sm font-bold text-ink">Mes réunions</h2>
            <a 
              routerLink="/entrepreneur/reunions" 
              class="text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              Voir tout
            </a>
          </div>

          <div class="divide-y divide-line">
            @for (meeting of meetings(); track meeting.id) {
              <div class="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-surface-muted/30">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <span class="text-xs sm:text-sm font-bold text-ink block truncate">{{ meeting.title }}</span>
                    <span class="mt-1 text-[11px] text-ink-muted block">
                      Avec : {{ meeting.coachName }}
                    </span>
                    <span class="mt-0.5 text-[11px] text-ink-muted block">
                      {{ formatDate(meeting.scheduledAt) }} · {{ formatTime(meeting.scheduledAt) }}
                    </span>
                    <span class="mt-0.5 text-[11px] text-ink-muted block">
                      {{ meeting.durationMinutes }} minutes
                    </span>
                  </div>

                  <div class="flex flex-col items-end gap-2 shrink-0">
                    <app-badge [status]="modeBadge(meeting.mode).status" size="sm">
                      {{ modeBadge(meeting.mode).label }}
                    </app-badge>
                    <app-badge [status]="statusBadge(meeting.status).status" size="sm">
                      {{ statusBadge(meeting.status).label }}
                    </app-badge>
                  </div>
                </div>

                @if (meeting.status === 'PLANNED' || meeting.status === 'ONGOING') {
                  <div class="mt-2">
                    @if (meeting.mode === 'ONLINE') {
                      <a 
                        routerLink="/entrepreneur/reunions/{{ meeting.id }}"
                        class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium bg-accent text-white hover:bg-accent-strong transition-colors"
                      >
                        Rejoindre la réunion
                      </a>
                    } @else {
                      <a 
                        routerLink="/entrepreneur/reunions/{{ meeting.id }}"
                        class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium bg-surface text-ink border border-line hover:bg-surface-muted transition-colors"
                      >
                        Voir les informations
                      </a>
                    }
                  </div>
                }
              </div>
            } @empty {
              <div class="px-6 py-12 text-center flex flex-col items-center justify-center">
                <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line">
                  <app-icon name="video" class="size-5" />
                </div>
                <p class="text-xs font-semibold text-ink">Aucune réunion planifiée</p>
                <p class="text-[11px] text-ink-muted mt-0.5">Vos prochaines réunions apparaîtront ici.</p>
              </div>
            }
          </div>

        </app-card>
      </div>

      <!-- Section principale : Missions du moment -->
      <div class="grid grid-cols-1 gap-5">
        <app-card padding="none" class="overflow-hidden shadow-xs">
          
          <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
            <h2 class="text-sm font-bold text-ink">Mes activites du moment</h2>
            <a 
              routerLink="/entrepreneur/missions" 
              class="text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              Voir tout
            </a>
          </div>

          <div class="divide-y divide-line">
            @for (mission of missions(); track mission.id) {
              <div class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-muted/30 gap-4">
                <div class="flex items-center gap-3.5 min-w-0">
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs sm:text-sm font-bold text-ink truncate">{{ mission.titre }}</span>
                    @if (mission.dateEcheance) {
                      <span class="mt-0.5 text-[11px] text-ink-muted">Échéance : {{ mission.dateEcheance }}</span>
                    }
                  </div>
                </div>

                <div class="shrink-0">
                  <app-badge [status]="statutBadge(mission.statut).status" size="sm">
                    {{ statutBadge(mission.statut).label }}
                  </app-badge>
                </div>
              </div>
            } @empty {
              <div class="px-6 py-12 text-center flex flex-col items-center justify-center">
                <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line">
                  <app-icon name="missions" class="size-5" />
                </div>
                <p class="text-xs font-semibold text-ink">Aucune mission assignée</p>
                <p class="text-[11px] text-ink-muted mt-0.5">Vos prochains jalons pédagogiques apparaîtront ici.</p>
              </div>
            }
          </div>

        </app-card>
      </div>

    </div>
  `,
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
          .subscribe((m) => this.missions.set(m));
      });

    // Charger les réunions de l'entrepreneur
    this.meetingService.getMyMeetings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((m) => this.meetings.set(m));
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