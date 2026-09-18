import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MeetingService } from '../../../../core/services/meeting.service';
import { Meeting, MeetingStatus, MeetingType } from '../../../../core/models/meeting.model';
import { Observable } from 'rxjs';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-meetings-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent
],
  template: `
    <div class="flex flex-col gap-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <app-page-header
        title="Réunions"
        subtitle="Gérez et rejoignez vos réunions vidéo"
      >
        <app-button
        size="sm"
            >
          Nouvelle réunion
        </app-button>
      </app-page-header>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div class="text-sm text-ink-muted">Chargement des réunions...</div>
        </div>
      } @else if (error()) {
        <div class="flex items-center justify-center py-12">
          <div class="text-sm text-rose-600">{{ error() }}</div>
        </div>
      } @else if (meetings().length === 0) {
        <div class="flex flex-col items-center justify-center py-12">
          <div class="text-sm text-ink-muted">Aucune réunion planifiée</div>
          <button
            type="button"
            [routerLink]="'/incubateur/reunions/nouvelle'"
            class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-medium bg-accent text-white hover:bg-accent-strong transition-colors mt-4"
          >
            Créer une réunion
          </button>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (meeting of meetings(); track meeting.id) {
            <app-card class="flex flex-col">
              <div class="flex-1 flex flex-col gap-3 p-4">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-semibold text-ink truncate">{{ meeting.title }}</h3>
                    <p class="text-xs text-ink-muted mt-1">{{ meeting.description }}</p>
                  </div>
                  <app-badge [status]="getStatusVariant(meeting.status)">
                    {{ getStatusLabel(meeting.status) }}
                  </app-badge>
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <span>{{ meeting.type === 'INDIVIDUAL' ? 'Individuelle' : 'Groupe' }}</span>
                  @if (meeting.cohortName) {
                    <span>•</span>
                    <span>{{ meeting.cohortName }}</span>
                  }
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <span>{{ formatDateTime(meeting.scheduledAt) }}</span>
                  <span>•</span>
                  <span>{{ meeting.durationMinutes }} min</span>
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <span>Coach: {{ meeting.coachName }}</span>
                  <span>•</span>
                  <span>{{ meeting.participants.length }} participant(s)</span>
                </div>
              </div>

              <div class="border-t border-line p-4 flex gap-2">
                @if (meeting.status === 'PLANNED' || meeting.status === 'ONGOING') {
                  <app-button
                    variant="primary"
                    size="sm"
                    class="flex-1"
                    [routerLink]="'/incubateur/reunions/' + meeting.id"
                  >
                    Rejoindre
                  </app-button>
                }
                <app-button
                  variant="secondary"
                  size="sm"
                  [routerLink]="'/incubateur/reunions/' + meeting.id"
                >
                  Détails
                </app-button>
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `,
})
export class MeetingsListComponent implements OnInit {
  private meetingService = inject(MeetingService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);

  meetings = signal<Meeting[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMeetings();
  }

  private loadMeetings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.meetingService.getMeetings().subscribe({
      next: (meetings) => {
        this.meetings.set(meetings as Meeting[]);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Impossible de charger les réunions');
        this.loading.set(false);
        console.error('Failed to load meetings:', err);
      }
    });
  }

  getStatusVariant(status: MeetingStatus): 'primary' | 'success' | 'danger' | 'info' | 'neutral' {
    switch (status) {
      case 'PLANNED':
        return 'info';
      case 'ONGOING':
        return 'success';
      case 'ENDED':
        return 'neutral';
      case 'CANCELLED':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  getStatusLabel(status: MeetingStatus): string {
    switch (status) {
      case 'PLANNED':
        return 'Planifiée';
      case 'ONGOING':
        return 'En cours';
      case 'ENDED':
        return 'Terminée';
      case 'CANCELLED':
        return 'Annulée';
      default:
        return status;
    }
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
