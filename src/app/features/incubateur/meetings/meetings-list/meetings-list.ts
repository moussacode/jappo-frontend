import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MeetingService } from '../../../../core/services/meeting.service';
import { Meeting, MeetingStatus } from '../../../../core/models/meeting.model';

import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-meetings-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    Icon
  ],
  template: `
    <div class="flex flex-col gap-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <app-page-header
        title="Réunions"
        subtitle="Gérez et rejoignez vos réunions vidéo"
      >
        <app-button
          [routerLink]="'/incubateur/reunions/nouvelle'"
          size="sm"
        >
          <app-icon name="plus" class="size-4 mr-1.5" />
          Nouvelle réunion
        </app-button>
      </app-page-header>

      @if (loading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-44 rounded-2xl border border-line/60 bg-surface-muted/30 animate-pulse p-5"></div>
          }
        </div>
      } @else if (error()) {
        <div class="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <app-icon name="warning" class="size-8 text-rose-600 mb-2" />
          <p class="text-sm font-semibold text-rose-600">{{ error() }}</p>
          <app-button variant="secondary" size="sm" class="mt-4" (click)="loadMeetings()">
            Réessayer
          </app-button>
        </div>
      } @else if (meetings().length === 0) {
        <app-card padding="none" class="shadow-xs border border-line/60">
          <div class="p-8 sm:p-12">
            <app-empty-state
              title="Aucune réunion planifiée"
              description="Vous n'avez aucune réunion en cours ou programmée pour le moment."
              iconName="calendar"
            >
              <div class="mt-6">
                <app-button
                  [routerLink]="'/incubateur/reunions/nouvelle'"
                  size="sm"
                >
                  <app-icon name="plus" class="size-4 mr-1.5" />
                  Créer une réunion
                </app-button>
              </div>
            </app-empty-state>
          </div>
        </app-card>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (meeting of meetings(); track meeting.id) {
            <app-card padding="none" class="flex flex-col overflow-hidden ">
              
              <!-- Contenu de la carte -->
              <div class="flex-1 flex flex-col gap-3 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex-1 min-w-0">
                    <h3 class="text-sm font-bold text-ink truncate">{{ meeting.title }}</h3>
                    <p class="text-xs text-ink-muted mt-1 line-clamp-2">{{ meeting.description || 'Aucune description' }}</p>
                  </div>
                  <app-badge [status]="getStatusVariant(meeting.status)" size="sm" class="shrink-0 font-bold">
                    {{ getStatusLabel(meeting.status) }}
                  </app-badge>
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted mt-1">
                  <span class="font-medium text-ink">{{ meeting.type === 'INDIVIDUAL' ? 'Individuelle' : 'Groupe' }}</span>
                  @if (meeting.cohortName) {
                    <span>•</span>
                    <span class="truncate">{{ meeting.cohortName }}</span>
                  }
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted">
                  <span class="flex items-center gap-1">
                    <app-icon name="calendar" class="size-3.5 text-accent" />
                    {{ formatDateTime(meeting.scheduledAt) }}
                  </span>
                  <span>•</span>
                  <span>{{ meeting.durationMinutes }} min</span>
                </div>

                <div class="flex items-center gap-2 text-xs text-ink-muted pt-2 border-t border-line/60">
                  <span class="font-medium text-ink">Coach :</span> 
                  <span class="truncate">{{ meeting.coachName || 'Non assigné' }}</span>
                  <span class="ml-auto shrink-0 bg-surface-muted px-2 py-0.5 rounded-full text-[11px] font-bold text-ink-muted border border-line/60">
                    {{ meeting.participants?.length || 0 }} participant(s)
                  </span>
                </div>
              </div>

              <!-- Pied de carte / Actions -->
              <div class="border-t border-line/60 bg-surface-muted/30 p-4 flex items-center justify-end gap-2">
                <app-button
                  variant="secondary"
                  size="sm"
                  [routerLink]="'/incubateur/reunions/' + meeting.id"
                >
                  Détails
                </app-button>

                @if (meeting.status === 'PLANNED' || meeting.status === 'ONGOING') {
                  <app-button
                    variant="primary"
                    size="sm"
                    [routerLink]="'/incubateur/reunions/' + meeting.id"
                  >
                    Rejoindre
                  </app-button>
                }
              </div>
            </app-card>
          }
        </div>
      }
    </div>
  `,
})
export class MeetingsListComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly meetings = signal<Meeting[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.loadMeetings();
  }

  protected loadMeetings(): void {
    this.loading.set(true);
    this.error.set(null);

    this.meetingService.getMeetings()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
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

  protected getStatusVariant(status: MeetingStatus): BadgeStatus {
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

  protected getStatusLabel(status: MeetingStatus): string {
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

  protected formatDateTime(dateString: string): string {
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