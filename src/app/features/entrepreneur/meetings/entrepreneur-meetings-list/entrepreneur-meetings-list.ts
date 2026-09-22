import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MeetingService } from '../../../../core/services/meeting.service';
import { Meeting } from '../../../../core/models/meeting.model';

import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { TabFilterComponent } from '../../../../shared/components/tab-filter/tab-filter.component';

type MeetingFilter = 'TOUTES' | 'PLANNED' | 'ONGOING' | 'ENDED' | 'CANCELLED';

const FILTRES_MEETINGS: { value: MeetingFilter; label: string }[] = [
  { value: 'TOUTES', label: 'Toutes' },
  { value: 'PLANNED', label: 'Prévues' },
  { value: 'ONGOING', label: 'En cours' },
  { value: 'ENDED', label: 'Terminées' },
  { value: 'CANCELLED', label: 'Annulées' },
];

@Component({
  selector: 'app-entrepreneur-meetings-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    BadgeComponent,
    CardComponent,
    Icon,
    PageHeaderComponent,
    EmptyStateComponent,
    ButtonComponent,
    TabFilterComponent
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page -->
      <app-page-header
        title="Mes réunions"
        subtitle="Retrouvez vos sessions vidéo et points de coaching programmés"
        breadcrumb="Entrepreneur > Mes réunions"
      />

      <!-- Filtres par onglets -->
      @if (!isLoading() && meetings().length > 0) {
        <app-tab-filter
          [options]="filtres"
          [value]="filtreStatut()"
          (valueChange)="changerFiltre($event)"
          class="w-full sm:w-fit"
        />
      }

      <!-- Skeleton / Chargement -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (i of [1, 2, 3]; track i) {
            <div class="h-48 rounded-2xl border border-line/60 bg-surface-muted/30 p-5 animate-pulse"></div>
          }
        </div>
      } 
      <!-- État vide -->
      @else if (meetingsFiltrees().length === 0) {
        <app-card padding="none" class="">
          <div class="p-8 sm:p-12">
            <app-empty-state
              title="Aucune réunion trouvée"
              description="Aucune visioconférence ne correspond au filtre sélectionné."
              iconName="calendar"
            />
          </div>
        </app-card>
      } 
      <!-- Grille style Google Meet Cards -->
      @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          @for (meeting of meetingsFiltrees(); track meeting.id) {
            <app-card padding="none" class="flex flex-col justify-between overflow-hidden transition-all hover:border-accent/50 group">
              
              <!-- En-tête de carte façon Meet (Icône caméra + Statut) -->
              <div class="p-5 flex flex-col gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent border border-accent/20 group-hover:bg-accent group-hover:text-white transition-colors">
                    <app-icon name="video" class="size-5" />
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <app-badge [status]="modeBadge(meeting.mode).status" size="sm">
                      {{ modeBadge(meeting.mode).label }}
                    </app-badge>
                    <app-badge [status]="statusBadge(meeting.status).status" size="sm" class="font-bold">
                      {{ statusBadge(meeting.status).label }}
                    </app-badge>
                  </div>
                </div>

                <div class="min-w-0">
                  <h3 class="text-sm font-bold text-ink truncate group-hover:text-accent transition-colors">{{ meeting.title }}</h3>
                  @if (meeting.description) {
                    <p class="text-xs text-ink-muted line-clamp-2 mt-1">{{ meeting.description }}</p>
                  }
                </div>

                <!-- Bloc Date & Heure proéminent -->
                <div class="flex items-center gap-2 rounded-xl bg-surface-muted/50 border border-line/60 p-3 mt-1">
                  <app-icon name="calendar" class="size-4 text-accent shrink-0" />
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs font-bold text-ink capitalize">{{ formatDate(meeting.scheduledAt) }}</span>
                    <span class="text-[11px] text-ink-muted">{{ formatTime(meeting.scheduledAt) }} • Durée : {{ meeting.durationMinutes }} min</span>
                  </div>
                </div>
              </div>

              <!-- Pied de carte / Actions rapides -->
              <div class="border-t border-line/60 bg-surface-muted/30 px-5 py-3.5 flex items-center justify-between mt-auto">
                <span class="text-[11px] font-medium text-ink-muted">Session sécurisée</span>

                @if (meeting.status === 'PLANNED' || meeting.status === 'ONGOING') {
                  @if (meeting.mode === 'ONLINE') {
                    <app-button
                      size="sm"
                      [routerLink]="['/entrepreneur/reunions', meeting.id]"
                    >
                      <app-icon name="video" class="size-3.5 mr-1.5" />
                      Rejoindre
                    </app-button>
                  } @else {
                    <app-button
                      variant="secondary"
                      size="sm"
                      [routerLink]="['/entrepreneur/reunions', meeting.id]"
                    >
                      Détails
                    </app-button>
                  }
                } @else {
                  <app-button
                    variant="secondary"
                    size="sm"
                    [routerLink]="['/entrepreneur/reunions', meeting.id]"
                  >
                    Voir l'historique
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
export class EntrepreneurMeetingsListComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly filtres = FILTRES_MEETINGS;
  protected readonly meetings = signal<Meeting[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly filtreStatut = signal<MeetingFilter>('TOUTES');

  // Computed pour filtrer les réunions selon l'onglet actif
  protected readonly meetingsFiltrees = computed(() => {
    const statut = this.filtreStatut();
    const liste = this.meetings();
    if (statut === 'TOUTES') {
      return liste;
    }
    return liste.filter((m) => m.status?.toUpperCase() === statut);
  });

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

  protected changerFiltre(filtre: MeetingFilter): void {
    this.filtreStatut.set(filtre);
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
        return { status: 'neutral', label: 'Terminée' };
      case 'CANCELLED':
        return { status: 'danger', label: 'Annulée' };
      default:
        return { status: 'neutral', label: status || 'Inconnu' };
    }
  }

  protected formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short'
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