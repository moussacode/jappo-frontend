import { Component, inject, signal, OnInit, ElementRef, ViewChild, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MeetingService } from '../../../../core/services/meeting.service';
import { MeetingRoomService, MeetingParticipantView } from '../../../../core/services/meeting-room.service';
import { Meeting } from '../../../../core/models/meeting.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    Icon
  ],
  template: `
    <div class="flex flex-col h-screen w-full bg-neutral-950 font-sans overflow-hidden">
      
      <!-- ========================================== -->
      <!-- 1. VUE PRÉSENTIEL                          -->
      <!-- ========================================== -->
      @if (meeting()?.mode === 'PRESENTIEL') {
        <div class="flex-1 flex items-center justify-center p-6 bg-surface/50 backdrop-blur-sm">
          <div class="bg-white rounded-3xl p-10 max-w-2xl w-full shadow-2xl shadow-black/5 border border-line/50 relative overflow-hidden">
            
            <!-- Élément de design décoratif -->
            <div class="absolute top-0 left-0 w-full h-2 bg-accent"></div>

            <div class="mb-8">
              <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-muted text-ink-muted text-xs font-semibold tracking-wide uppercase mb-4">
                <span class="w-2 h-2 rounded-full bg-accent"></span>
                Rendez-vous physique
              </span>
              <h1 class="text-3xl font-bold text-ink leading-tight mb-3">{{ meeting()?.title }}</h1>
              <p class="text-ink-muted text-lg">{{ meeting()?.description }}</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface rounded-2xl p-6 border border-line/50">
              <div class="flex items-start gap-4">
                <div class="p-3 bg-white rounded-xl shadow-sm border border-line">
                  <!-- L'icône location -->
                  <svg class="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-ink mb-1">Lieu & Adresse</h3>
                  <p class="text-ink-muted font-medium">{{ meeting()?.location || 'Non spécifié' }}</p>
                  @if (meeting()?.address) {
                    <p class="text-sm text-ink-muted mt-1">{{ meeting()?.address }}</p>
                  }
                </div>
              </div>

              <div class="flex items-start gap-4">
                <div class="p-3 bg-white rounded-xl shadow-sm border border-line">
                  <app-icon name="calendar" class="w-6 h-6 text-accent"></app-icon>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-ink mb-1">Date & Heure</h3>
                  <p class="text-ink-muted font-medium">{{ meeting()?.scheduledAt ? formatDate(meeting()!.scheduledAt) : 'Non spécifié' }}</p>
                  <p class="text-sm text-ink-muted mt-1">Durée : {{ meeting()?.durationMinutes }} min</p>
                </div>
              </div>
            </div>

            <div class="mt-10 flex justify-end">
              <button type="button" (click)="navigateBack()"
                class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold bg-white text-ink border-2 border-line hover:border-ink hover:bg-surface-muted transition-all duration-200 active:scale-95">
                Retour au tableau de bord
              </button>
            </div>
          </div>
        </div>
      } 
      
      <!-- ========================================== -->
      <!-- 2. VUE EN LIGNE (VIDÉO)                    -->
      <!-- ========================================== -->
      @else {
        <div class="flex-1 flex flex-col relative">
          <!-- Grille vidéo -->
          <div class="flex-1 p-4 md:p-6 flex items-center justify-center">
            <div class="grid w-full max-w-7xl mx-auto gap-4" [class]="getGridClass()">
              @for (participant of participantsArray; track participant.identity) {
                <div class="relative bg-neutral-800 rounded-2xl overflow-hidden aspect-video shadow-xl ring-1 ring-white/10 group">
                  
                  @if (participant.videoTrack && !participant.isCameraOff) {
                    <video [srcObject]="participant.videoTrack" [muted]="participant.isLocal" autoplay playsinline
                      class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105">
                    </video>
                  } @else {
                    <div class="w-full h-full flex flex-col items-center justify-center bg-neutral-800 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-neutral-700 to-neutral-900">
                      <div class="w-20 h-20 rounded-full bg-neutral-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4 ring-4 ring-neutral-700">
                        {{ getInitials(participant.displayName) }}
                      </div>
                      <span class="text-neutral-400 font-medium">Caméra désactivée</span>
                    </div>
                  }

                  <!-- Gradient & Info Participant -->
                  <div class="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none"></div>
                  
                  <div class="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <span class="text-white text-sm font-semibold truncate bg-black/40 px-3 py-1.5 rounded-lg backdrop-blur-sm border border-white/10">
                        {{ participant.displayName }}
                        @if (participant.isLocal) { <span class="text-neutral-400 font-normal ml-1">(Vous)</span> }
                      </span>
                      @if (participant.isHost) {
                        <app-badge status="primary" size="sm" class="shadow-sm">Coach</app-badge>
                      }
                    </div>
                  </div>

                  <!-- Status Indicateurs (Top Right) -->
                  <div class="absolute top-4 right-4 flex gap-2">
                    @if (participant.isMuted) {
                      <div class="bg-rose-500/90 backdrop-blur-md rounded-full p-2 shadow-lg flex items-center justify-center">
                        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <!-- Barre de contrôles flottante -->
          <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            
            <!-- Micro -->
            <button type="button" (click)="toggleMicrophone()"
              [class]="isMuted() ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20 border-transparent'"
              class="flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all duration-200 active:scale-90 tooltip-trigger group">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                @if (isMuted()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                }
              </svg>
            </button>

            <!-- Caméra -->
            <button type="button" (click)="toggleCamera()"
              [class]="isCameraOff() ? 'bg-rose-500/20 text-rose-500 hover:bg-rose-500/30 border-rose-500/30' : 'bg-white/10 text-white hover:bg-white/20 border-transparent'"
              class="flex flex-col items-center justify-center w-14 h-14 rounded-xl border transition-all duration-200 active:scale-90">
              <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                @if (isCameraOff()) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                }
              </svg>
            </button>
            
            <div class="w-px h-8 bg-white/10 mx-2"></div>

            <!-- Quitter -->
            <button type="button" (click)="leaveMeeting()"
              class="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold bg-rose-600 text-white hover:bg-rose-500 transition-all duration-200 active:scale-95 shadow-lg shadow-rose-600/20">
              Quitter
            </button>

            @if (isHost) {
              <button type="button" (click)="endMeeting()"
                class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold bg-neutral-800 text-white border border-rose-500/50 hover:bg-rose-900/50 transition-all duration-200 active:scale-95">
                Terminer la session
              </button>
            }
          </div>
        </div>
      }

      <!-- ========================================== -->
      <!-- OVERLAYS (FIN / ERREUR / CHARGEMENT)       -->
      <!-- ========================================== -->

      <!-- Terminé -->
      @if (meeting()?.status === 'ENDED') {
        <div class="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl scale-100 animate-in fade-in zoom-in-95 duration-200">
            <div class="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-ink mb-3">Réunion terminée</h2>
            <p class="text-ink-muted mb-8">Le coach a mis fin à cette session d'accompagnement.</p>
            <button type="button" (click)="navigateBack()"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold bg-accent text-white hover:bg-accent/90 transition-all active:scale-95">
              Retour au tableau de bord
            </button>
          </div>
        </div>
      }

      <!-- Erreur -->
      @if (error()) {
        <div class="fixed inset-0 bg-neutral-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-3xl p-10 text-center max-w-md w-full shadow-2xl">
            <div class="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 class="text-2xl font-bold text-ink mb-3">Oups !</h2>
            <p class="text-ink-muted mb-8">{{ error() }}</p>
            <div class="flex flex-col gap-3">
              <button type="button" (click)="retryJoin()"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold bg-accent text-white hover:bg-accent/90 transition-all active:scale-95">
                Réessayer
              </button>
              <button type="button" (click)="navigateBack()"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 font-semibold bg-white text-ink border-2 border-line hover:bg-surface-muted transition-all active:scale-95">
                Annuler
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Loading -->
      @if (isConnecting()) {
        <div class="fixed inset-0 bg-neutral-950/90 backdrop-blur-sm flex items-center justify-center z-50">
          <div class="text-white text-center flex flex-col items-center">
            <!-- Spinner moderne -->
            <svg class="animate-spin h-10 w-10 text-white mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <h3 class="text-xl font-semibold mb-2">Préparation de la salle...</h3>
            <p class="text-neutral-400 text-sm">Connexion chiffrée en cours</p>
          </div>
        </div>
      }
    </div>
  `,
})
export class MeetingRoomComponent implements OnInit {
  // ... (Le code TypeScript (logique) reste exactement le même, aucune modification requise)
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private meetingService = inject(MeetingService);
  meetingRoomService = inject(MeetingRoomService);

  meetingId = signal<string>('');
  meeting = signal<Meeting | null>(null);
  isConnecting = signal(false);
  error = signal<string | null>(null);

  isMuted = signal(false);
  isCameraOff = signal(false);

  ngOnInit(): void {
    this.meetingId.set(this.route.snapshot.paramMap.get('id') || '');
    this.joinMeeting();
  }

  ngOnDestroy(): void {
    this.meetingRoomService.disconnect();
  }

  private joinMeeting(): void {
    this.isConnecting.set(true);
    this.error.set(null);

    this.meetingService.getMeetingById(this.meetingId()).subscribe({
      next: (meeting) => {
        this.meeting.set(meeting);

        if (meeting.status === 'ENDED' || meeting.status === 'CANCELLED') {
          this.isConnecting.set(false);
          this.error.set(meeting.status === 'ENDED' 
            ? 'Cette réunion est terminée.' 
            : 'Cette réunion a été annulée.');
          return;
        }

        if (meeting.mode === 'PRESENTIEL') {
          this.isConnecting.set(false);
          return;
        }

        this.meetingService.joinMeeting(this.meetingId()).subscribe({
          next: (response) => {
            this.meetingRoomService.joinRoom(response.livekitUrl, response.token, response.isHost).then(() => {
              this.isConnecting.set(false);
            }).catch((err) => {
              this.isConnecting.set(false);
              this.error.set('Impossible de rejoindre la réunion');
              console.error('Failed to join room:', err);
            });
          },
          error: (err) => {
            this.isConnecting.set(false);
            this.error.set('Impossible de rejoindre la réunion');
            console.error('Failed to join meeting:', err);
          }
        });
      },
      error: (err) => {
        this.isConnecting.set(false);
        this.error.set('Impossible de charger les informations de la réunion');
        console.error('Failed to get meeting:', err);
      }
    });
  }

  toggleMicrophone(): void {
    this.isMuted.update(muted => !muted);
    this.meetingRoomService.toggleMicrophone(!this.isMuted());
  }

  toggleCamera(): void {
    this.isCameraOff.update(off => !off);
    this.meetingRoomService.toggleCamera(!this.isCameraOff());
  }

  leaveMeeting(): void {
    this.meetingService.leaveMeeting(this.meetingId()).subscribe({
      next: () => {
        this.meetingRoomService.leaveMeeting().then(() => {
          this.navigateBack();
        });
      },
      error: (err) => {
        console.error('Failed to leave meeting:', err);
        this.navigateBack();
      }
    });
  }

  endMeeting(): void {
    if (confirm('Terminer la réunion ?\n\nTous les participants seront déconnectés.\nCette action est définitive.')) {
      this.meetingService.endMeeting(this.meetingId()).subscribe({
        next: () => {
          this.meetingRoomService.leaveMeeting().then(() => {
            this.navigateBack();
          });
        },
        error: (err) => {
          console.error('Failed to end meeting:', err);
          this.error.set('Impossible de terminer la réunion');
        }
      });
    }
  }

  retryJoin(): void {
    this.error.set(null);
    this.joinMeeting();
  }

  navigateBack(): void {
    const currentPath = this.router.url;
    if (currentPath.startsWith('/entrepreneur')) {
      this.router.navigate(['/entrepreneur/dashboard']);
    } else {
      this.router.navigate(['/incubateur/reunions']);
    }
  }

  get participantsArray(): MeetingParticipantView[] {
    return Array.from(this.meetingRoomService.participants().values());
  }

  get isHost(): boolean {
    return this.meetingRoomService.isHost();
  }

  getGridClass(): string {
    const count = this.participantsArray.length;
    if (count === 1) return 'grid-cols-1 md:w-3/4 lg:w-2/3'; // Centrer et réduire la taille si 1 seule personne
    if (count <= 4) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-4';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}