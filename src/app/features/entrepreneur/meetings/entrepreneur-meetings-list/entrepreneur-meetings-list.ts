import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MeetingService } from '../../../../core/services/meeting.service';
import { Meeting } from '../../../../core/models/meeting.model';

import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-entrepreneur-meetings-list',
  standalone: true,
  imports: [CommonModule, RouterLink, BadgeComponent, CardComponent, Icon],
  template: `
    <div class="p-6">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-ink">Mes réunions</h1>
        <p class="text-sm text-ink-muted mt-1">Retrouvez toutes vos réunions à venir</p>
      </div>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12">
          <div class="animate-spin text-2xl">⟳</div>
        </div>
      } @else if (meetings().length === 0) {
        <div class="text-center py-12">
          <div class="text-4xl mb-4">📅</div>
          <h3 class="text-lg font-semibold text-ink mb-2">Aucune réunion</h3>
          <p class="text-sm text-ink-muted">Vous n'avez aucune réunion à venir.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (meeting of meetings(); track meeting.id) {
            <app-card class="p-4">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <h3 class="font-semibold text-ink mb-1">{{ meeting.title }}</h3>
                  <p class="text-sm text-ink-muted mb-3">{{ meeting.description }}</p>

                  <div class="flex flex-wrap gap-2 text-sm text-ink-muted">
                    <span class="flex items-center gap-1">
                      <app-icon name="calendar" size="sm"></app-icon>
                      {{ formatDate(meeting.scheduledAt) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <app-icon name="clock" size="sm"></app-icon>
                      {{ formatTime(meeting.scheduledAt) }}
                    </span>
                    <span class="flex items-center gap-1">
                      <app-icon name="clock" size="sm"></app-icon>
                      {{ meeting.durationMinutes }} min
                    </span>
                  </div>

                  <div class="flex items-center gap-2 mt-3">
                    <app-badge [status]="modeBadge(meeting.mode).status" [size]="'sm'">
                      {{ modeBadge(meeting.mode).label }}
                    </app-badge>
                    <app-badge [status]="statusBadge(meeting.status).status" [size]="'sm'">
                      {{ statusBadge(meeting.status).label }}
                    </app-badge>
                  </div>
                </div>

                @if (meeting.status === 'PLANNED' || meeting.status === 'ONGOING') {
                  <div class="ml-4">
                    @if (meeting.mode === 'ONLINE') {
                      <a
                        routerLink="/entrepreneur/reunions/{{ meeting.id }}"
                        class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium bg-accent text-white hover:bg-accent-strong transition-colors"
                      >
                        Rejoindre
                      </a>
                    } @else {
                      <a
                        routerLink="/entrepreneur/reunions/{{ meeting.id }}"
                        class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-medium bg-surface text-ink border border-line hover:bg-surface-muted transition-colors"
                      >
                        Voir
                      </a>
                    }
                  </div>
                }
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `,
})
export class EntrepreneurMeetingsListComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly meetings = signal<Meeting[]>([]);
  protected readonly isLoading = signal(true);

  ngOnInit(): void {
    this.meetingService
      .getMyMeetings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (meetings) => {
          this.meetings.set(meetings.sort((a, b) => 
            new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          ));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Failed to load meetings:', err);
          this.isLoading.set(false);
        }
      });
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
