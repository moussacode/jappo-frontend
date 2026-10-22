import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MeetingService } from '../../../../core/services/meeting.service';
import { MeetingRoomService } from '../../../../core/services/meeting-room.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Meeting } from '../../../../core/models/meeting.model';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ParticipantTile } from './participant-tile';
import { MeetingLobby, LobbyJoinChoice } from './meeting-lobby';
import { MeetingDeviceSettings } from './meeting-device-settings';

type Phase = 'loading' | 'presentiel' | 'lobby' | 'in-call' | 'ended' | 'error';

interface Toast {
  id: number;
  message: string;
}

@Component({
  selector: 'app-meeting-room',
  standalone: true,
  imports: [Icon, CardComponent, ButtonComponent, ParticipantTile, MeetingLobby, MeetingDeviceSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    @switch (phase()) {
      <!-- ══════════ CHARGEMENT ══════════ -->
      @case ('loading') {
        <div class="flex min-h-screen items-center justify-center bg-surface-muted" role="status">
          <div class="flex flex-col items-center gap-3 text-ink-muted">
            <app-icon name="loader" class="size-8 animate-spin" />
            <p class="text-sm">Chargement de la réunion…</p>
          </div>
        </div>
      }

      <!-- ══════════ PRÉSENTIEL ══════════ -->
      @case ('presentiel') {
        <div class="flex min-h-screen items-center bg-surface-muted">
          <div class="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
            <app-card padding="lg">
              <span class="mb-2 inline-flex items-center gap-1.5 rounded-full border border-line/60 bg-surface-muted px-2.5 py-1 text-[11px] font-bold uppercase text-ink-muted">
                Rendez-vous physique
              </span>
              <h1 class="text-xl font-bold text-ink">{{ meeting()?.title }}</h1>
              @if (meeting()?.description) {
                <p class="mt-1 text-xs text-ink-muted">{{ meeting()?.description }}</p>
              }
              <div class="mt-4 flex flex-col gap-3 rounded-xl bg-surface-muted/30 p-4 text-xs text-ink">
                <div class="flex items-center gap-2">
                  <app-icon name="location" class="size-4 shrink-0 text-accent" />
                  <span><strong>Lieu :</strong> {{ meeting()?.location || 'Non spécifié' }} {{ meeting()?.address ? '(' + meeting()?.address + ')' : '' }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <app-icon name="calendar" class="size-4 shrink-0 text-accent" />
                  <span><strong>Date :</strong> {{ meeting()?.scheduledAt ? formatDate(meeting()!.scheduledAt) : 'Non spécifié' }} ({{ meeting()?.durationMinutes }} min)</span>
                </div>
              </div>
              <div class="mt-4 flex justify-end border-t border-line/60 pt-4">
                <app-button variant="secondary" size="sm" (click)="navigateBack()">Retour</app-button>
              </div>
            </app-card>
          </div>
        </div>
      }

      <!-- ══════════ SALLE D'ATTENTE ══════════ -->
      @case ('lobby') {
        <div class="flex min-h-screen items-center bg-surface-muted">
          <app-meeting-lobby
            class="w-full"
            [meeting]="meeting()!"
            [userName]="currentUserName()"
            [joining]="joining()"
            (join)="join($event)"
            (cancel)="navigateBack()"
          />
        </div>
      }

      <!-- ══════════ EN RÉUNION ══════════ -->
      @case ('in-call') {
        <div class="flex h-dvh flex-col overflow-hidden bg-neutral-950 text-white">
          <!-- En-tête -->
          <header class="flex h-14 shrink-0 items-center gap-3 px-4 sm:px-6">
            <div class="flex min-w-0 items-center gap-2">
              <span class="size-2 shrink-0 rounded-full bg-emerald-400" aria-hidden="true"></span>
              <h1 class="truncate text-sm font-semibold">{{ meeting()?.title }}</h1>
            </div>
            <span class="text-sm tabular-nums text-neutral-400" aria-label="Durée de la réunion">{{ elapsed() }}</span>
            <span class="ml-auto flex items-center gap-1.5 text-xs text-neutral-400">
              <app-icon name="users" class="size-4" />
              {{ participants().length }}
            </span>
          </header>

          <!-- Bandeaux d'état -->
          @if (room.isReconnecting()) {
            <div class="mx-4 mb-2 flex items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2 text-sm text-amber-200 sm:mx-6" role="status">
              <app-icon name="loader" class="size-4 animate-spin" />
              Connexion perdue, reconnexion en cours…
            </div>
          }
          @if (room.audioBlocked()) {
            <div class="mx-4 mb-2 flex flex-wrap items-center justify-center gap-3 rounded-xl bg-sky-500/15 px-4 py-2 text-sm text-sky-100 sm:mx-6" role="alert">
              <app-icon name="volume-2" class="size-4" />
              Votre navigateur a bloqué le son de la réunion.
              <button type="button" class="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-neutral-900 hover:bg-neutral-200" (click)="room.startAudio()">
                Activer le son
              </button>
            </div>
          }
          @if (room.mediaError(); as mediaError) {
            <div class="mx-4 mb-2 flex items-center justify-center gap-3 rounded-xl bg-rose-500/15 px-4 py-2 text-sm text-rose-100 sm:mx-6" role="alert">
              <app-icon name="alert-circle" class="size-4 shrink-0" />
              <span>{{ mediaError }}</span>
              <button type="button" class="ml-1 rounded-md p-1 hover:bg-white/10" aria-label="Fermer" (click)="room.mediaError.set(null)">
                <app-icon name="x" class="size-4" />
              </button>
            </div>
          }

          <div class="flex min-h-0 flex-1 gap-4 px-4 pb-2 sm:px-6">
            <!-- Scène -->
            <main class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 lg:flex-row" aria-label="Participants">
              @if (screenSharer(); as sharer) {
                <app-participant-tile [participant]="sharer" source="screen" class="min-h-0 flex-1" />
                <div class="flex shrink-0 gap-3 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden">
                  @for (p of participants(); track p.identity) {
                    <app-participant-tile [participant]="p" [compact]="true" class="aspect-video w-40 shrink-0 lg:w-full" />
                  }
                </div>
              } @else {
                <div class="grid min-h-0 flex-1 content-center gap-3 overflow-y-auto" [class]="gridClass()">
                  @for (p of participants(); track p.identity) {
                    <app-participant-tile [participant]="p" class="aspect-video w-full" />
                  }
                </div>
              }
            </main>

            <!-- Panneau participants -->
            @if (panelOpen()) {
              <aside
                class="fixed inset-x-0 bottom-0 z-30 flex max-h-[70dvh] flex-col rounded-t-3xl bg-neutral-900 p-4 shadow-2xl ring-1 ring-white/10 lg:static lg:max-h-none lg:w-80 lg:rounded-3xl"
                aria-label="Liste des participants"
              >
                <div class="mb-3 flex items-center justify-between">
                  <h2 class="text-sm font-semibold">Participants ({{ participants().length }})</h2>
                  <button type="button" class="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white" aria-label="Fermer la liste" (click)="panelOpen.set(false)">
                    <app-icon name="x" class="size-4" />
                  </button>
                </div>
                <ul class="-mx-2 flex-1 space-y-1 overflow-y-auto">
                  @for (p of participants(); track p.identity) {
                    <li class="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/5">
                      <span class="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-xs font-semibold" [class.ring-2]="p.isSpeaking && !p.isMuted" [class.ring-emerald-400]="p.isSpeaking && !p.isMuted">
                        {{ initialsOf(p.displayName) }}
                      </span>
                      <span class="min-w-0 flex-1">
                        <span class="block truncate text-sm">{{ p.displayName }}@if (p.isLocal) { <span class="text-neutral-400"> (vous)</span> }</span>
                        @if (p.isHost) { <span class="text-xs text-neutral-400">Coach</span> }
                      </span>
                      <app-icon [name]="p.isCameraOff ? 'video-off' : 'video'" class="size-4" [class.text-neutral-500]="p.isCameraOff" [attr.aria-label]="p.isCameraOff ? 'Caméra coupée' : 'Caméra active'" />
                      <app-icon [name]="p.isMuted ? 'mic-off' : 'mic'" class="size-4" [class.text-rose-400]="p.isMuted" [attr.aria-label]="p.isMuted ? 'Micro coupé' : 'Micro actif'" />
                    </li>
                  }
                </ul>
              </aside>
            }
          </div>

          <!-- Barre de contrôles -->
          <footer class="flex shrink-0 items-center justify-center gap-2 px-4 py-3 sm:gap-3 sm:py-4" aria-label="Contrôles de la réunion">
            <button type="button" [class]="controlClass(me()?.isMuted ?? true)" [disabled]="pending()"
              [attr.aria-pressed]="me()?.isMuted" [attr.aria-label]="me()?.isMuted ? 'Activer le micro' : 'Couper le micro'"
              [title]="(me()?.isMuted ? 'Activer le micro' : 'Couper le micro') + ' (' + shortcutKey + '+D)'"
              (click)="run(room.toggleMicrophone())">
              <app-icon [name]="me()?.isMuted ? 'mic-off' : 'mic'" class="size-5" />
            </button>

            <button type="button" [class]="controlClass(me()?.isCameraOff ?? true)" [disabled]="pending()"
              [attr.aria-pressed]="me()?.isCameraOff" [attr.aria-label]="me()?.isCameraOff ? 'Activer la caméra' : 'Désactiver la caméra'"
              [title]="(me()?.isCameraOff ? 'Activer la caméra' : 'Désactiver la caméra') + ' (' + shortcutKey + '+E)'"
              (click)="run(room.toggleCamera())">
              <app-icon [name]="me()?.isCameraOff ? 'video-off' : 'video'" class="size-5" />
            </button>

            @if (canShareScreen) {
              <button type="button" [class]="toggleClass(me()?.isScreenSharing ?? false)" [disabled]="pending() || (!!screenSharer() && !me()?.isScreenSharing)"
                [attr.aria-pressed]="me()?.isScreenSharing" [attr.aria-label]="me()?.isScreenSharing ? 'Arrêter le partage' : 'Partager l\\'écran'"
                [title]="me()?.isScreenSharing ? 'Arrêter le partage' : (screenSharer() ? 'Un participant partage déjà son écran' : 'Partager l\\'écran')"
                (click)="run(room.toggleScreenShare())">
                <app-icon name="monitor-up" class="size-5" />
              </button>
            }

            <button type="button" [class]="toggleClass(panelOpen())" [attr.aria-pressed]="panelOpen()"
              aria-label="Participants" title="Participants" (click)="panelOpen.update(v => !v)">
              <app-icon name="users" class="size-5" />
            </button>

            <button type="button" [class]="toggleClass(false)" aria-label="Paramètres audio et vidéo" title="Paramètres audio et vidéo" (click)="openSettings()">
              <app-icon name="settings" class="size-5" />
            </button>

            <span class="mx-1 h-8 w-px bg-white/10" aria-hidden="true"></span>

            <button type="button"
              class="flex h-12 items-center gap-2 rounded-full bg-rose-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Quitter la réunion" title="Quitter la réunion" (click)="requestLeave()">
              <app-icon name="phone-off" class="size-5" />
              <span class="hidden sm:inline">Quitter</span>
            </button>
          </footer>

          <!-- Notifications arrivée / départ -->
          <div class="pointer-events-none fixed left-1/2 top-16 z-40 flex -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
            @for (toast of toasts(); track toast.id) {
              <div class="rounded-full bg-neutral-800/95 px-4 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">{{ toast.message }}</div>
            }
          </div>
        </div>
      }

      <!-- ══════════ FIN ══════════ -->
      @case ('ended') {
        <div class="flex min-h-screen items-center justify-center bg-surface-muted p-4">
          <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-xl sm:p-10">
            <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-surface-muted">
              <app-icon name="check-circle" class="size-8 text-ink" />
            </div>
            <h2 class="mb-3 text-2xl font-bold text-ink">{{ endedTitle() }}</h2>
            <p class="mb-8 text-sm text-ink-muted">{{ endedMessage() }}</p>
            <app-button variant="primary" size="lg" [fullWidth]="true" (click)="navigateBack()">Retour aux réunions</app-button>
          </div>
        </div>
      }

      <!-- ══════════ ERREUR ══════════ -->
      @case ('error') {
        <div class="flex min-h-screen items-center justify-center bg-surface-muted p-4">
          <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-8 text-center shadow-xl sm:p-10" role="alert">
            <div class="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-rose-50 dark:bg-rose-500/10">
              <app-icon name="warning" class="size-8 text-rose-500" />
            </div>
            <h2 class="mb-3 text-2xl font-bold text-ink">Connexion impossible</h2>
            <p class="mb-8 text-sm text-ink-muted">{{ error() }}</p>
            <div class="flex flex-col gap-3">
              @if (canRetry()) {
                <app-button variant="primary" size="lg" [fullWidth]="true" (click)="retry()">Réessayer</app-button>
              }
              <app-button variant="secondary" size="lg" [fullWidth]="true" (click)="navigateBack()">Retour aux réunions</app-button>
            </div>
          </div>
        </div>
      }
    }

    <!-- ══════════ DIALOGUES ══════════ -->
    @if (settingsOpen()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" (click)="settingsOpen.set(false)">
        <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="settings-title" (click)="$event.stopPropagation()">
          <div class="mb-5 flex items-center justify-between">
            <h2 id="settings-title" class="text-lg font-semibold text-ink">Paramètres audio et vidéo</h2>
            <button type="button" class="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink" aria-label="Fermer" (click)="settingsOpen.set(false)">
              <app-icon name="x" class="size-4" />
            </button>
          </div>
          <app-meeting-device-settings />
        </div>
      </div>
    }

    @if (leaveDialogOpen()) {
      <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center" (click)="leaveDialogOpen.set(false)">
        <div class="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-desc" (click)="$event.stopPropagation()">
          <h2 id="leave-title" class="text-lg font-semibold text-ink">Quitter la réunion ?</h2>
          <p id="leave-desc" class="mt-2 text-sm text-ink-muted">
            Vous pouvez partir en laissant la réunion ouverte, ou la terminer pour tous les participants. Terminer est définitif.
          </p>
          <div class="mt-6 flex flex-col gap-2">
            <button type="button" class="w-full rounded-[var(--radius-button)] bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50" [disabled]="leaving()" (click)="endForAll()">
              Terminer pour tous
            </button>
            <app-button variant="secondary" size="lg" [fullWidth]="true" [disabled]="leaving()" (click)="leave()">Quitter seulement</app-button>
            <app-button variant="ghost" size="lg" [fullWidth]="true" (click)="leaveDialogOpen.set(false)">Annuler</app-button>
          </div>
        </div>
      </div>
    }
  `,
})
export class MeetingRoomComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly meetingService = inject(MeetingService);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly room = inject(MeetingRoomService);

  protected readonly meetingId = signal('');
  protected readonly meeting = signal<Meeting | null>(null);
  protected readonly phase = signal<Phase>('loading');
  protected readonly error = signal<string | null>(null);
  protected readonly canRetry = signal(true);
  protected readonly joining = signal(false);
  protected readonly leaving = signal(false);
  protected readonly pending = signal(false);

  protected readonly panelOpen = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly leaveDialogOpen = signal(false);
  protected readonly toasts = signal<Toast[]>([]);

  private readonly joinedAt = signal<number | null>(null);
  private readonly now = signal(Date.now());
  private toastId = 0;

  protected readonly canShareScreen = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getDisplayMedia;
  protected readonly shortcutKey = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl';

  protected readonly participants = this.room.participants;
  protected readonly me = computed(() => this.participants().find((p) => p.isLocal));
  protected readonly screenSharer = computed(() => this.participants().find((p) => p.isScreenSharing));

  protected readonly currentUserName = computed(() => {
    const u = this.authService.currentUser();
    return u ? `${u.prenom} ${u.nom}`.trim() : '';
  });

  protected readonly elapsed = computed(() => {
    const start = this.joinedAt();
    if (!start) return '00:00';
    const total = Math.max(0, Math.floor((this.now() - start) / 1000));
    const h = Math.floor(total / 3600);
    const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return h > 0 ? `${h}:${m}:${s}` : `${m}:${s}`;
  });

  protected readonly gridClass = computed(() => {
    const n = this.participants().length;
    if (n <= 1) return 'grid-cols-1 mx-auto w-full max-w-4xl';
    if (n === 2) return 'grid-cols-1 md:grid-cols-2';
    if (n <= 4) return 'grid-cols-2';
    if (n <= 9) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';
  });

  protected readonly endedTitle = computed(() =>
    this.room.endReason() === 'removed' ? 'Vous avez été retiré' : 'Réunion terminée',
  );
  protected readonly endedMessage = computed(() => {
    switch (this.room.endReason()) {
      case 'ended-by-host':
        return 'Le coach a mis fin à cette session d\'accompagnement.';
      case 'removed':
        return 'Un organisateur vous a retiré de la réunion.';
      default:
        return 'Cette session d\'accompagnement est terminée.';
    }
  });

  constructor() {
    const timer = setInterval(() => this.now.set(Date.now()), 1000);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    // Fin de réunion ou perte de connexion signalées par LiveKit.
    effect(() => {
      const reason = this.room.endReason();
      if (!reason || untracked(this.phase) !== 'in-call') return;
      if (reason === 'connection-lost') {
        this.fail('La connexion à la réunion a été perdue.');
      } else {
        void this.room.leaveMeeting();
        this.phase.set('ended');
      }
    });

    // Notifications d'arrivée et de départ.
    let previous: Map<string, string> | null = null;
    effect(() => {
      const current = new Map(this.participants().map((p) => [p.identity, p.displayName]));
      if (this.phase() !== 'in-call') {
        previous = null;
        return;
      }
      if (previous) {
        for (const [id, name] of current) if (!previous.has(id)) this.toast(`${name} a rejoint la réunion`);
        for (const [id, name] of previous) if (!current.has(id)) this.toast(`${name} a quitté la réunion`);
      }
      previous = current;
    });
  }

  ngOnInit(): void {
    this.meetingId.set(this.route.snapshot.paramMap.get('id') || '');
    this.load();
  }

  ngOnDestroy(): void {
    this.room.disconnect();
  }

  // ═══════════ Cycle de vie ═══════════

  private load(): void {
    this.phase.set('loading');
    this.meetingService.getMeetingById(this.meetingId()).subscribe({
      next: (meeting) => {
        this.meeting.set(meeting);
        if (meeting.status === 'ENDED') {
          this.phase.set('ended');
        } else if (meeting.status === 'CANCELLED') {
          this.canRetry.set(false);
          this.fail('Cette réunion a été annulée.');
        } else {
          this.phase.set(meeting.mode === 'PRESENTIEL' ? 'presentiel' : 'lobby');
        }
      },
      error: () => this.fail('Impossible de charger les informations de la réunion.'),
    });
  }

  protected async join(choice: LobbyJoinChoice): Promise<void> {
    const meeting = this.meeting();
    if (!meeting || this.joining()) return;
    this.joining.set(true);

    try {
      const response = await firstValueFrom(this.meetingService.joinMeeting(meeting.id));
      const names = new Map<string, string>(meeting.participants.map((p) => [p.userId, p.userName]));
      names.set(meeting.coachId, meeting.coachName);
      const me = this.authService.currentUser();
      if (me) names.set(me.id, this.currentUserName());

      await this.room.joinRoom(response.livekitUrl, response.token, response.isHost, {
        resolveName: (identity) => names.get(identity),
        hostIdentity: meeting.coachId,
        micEnabled: choice.micEnabled,
        cameraEnabled: choice.cameraEnabled,
      });
      this.joinedAt.set(Date.now());
      this.phase.set('in-call');
    } catch (err) {
      console.error('Failed to join meeting:', err);
      this.fail('Impossible de rejoindre la réunion. Vérifiez votre connexion puis réessayez.');
    } finally {
      this.joining.set(false);
    }
  }

  protected retry(): void {
    this.error.set(null);
    this.canRetry.set(true);
    this.load();
  }

  protected requestLeave(): void {
    if (this.room.isHost()) this.leaveDialogOpen.set(true);
    else void this.leave();
  }

  protected async leave(): Promise<void> {
    this.leaving.set(true);
    try {
      await firstValueFrom(this.meetingService.leaveMeeting(this.meetingId()));
    } catch (err) {
      console.error('Failed to leave meeting:', err);
    }
    await this.room.leaveMeeting();
    this.navigateBack();
  }

  protected async endForAll(): Promise<void> {
    this.leaving.set(true);
    try {
      await firstValueFrom(this.meetingService.endMeeting(this.meetingId()));
      await this.room.leaveMeeting();
      this.leaveDialogOpen.set(false);
      this.phase.set('ended');
    } catch (err) {
      console.error('Failed to end meeting:', err);
      this.room.mediaError.set('Impossible de terminer la réunion. Réessayez.');
      this.leaveDialogOpen.set(false);
    } finally {
      this.leaving.set(false);
    }
  }

  navigateBack(): void {
    const target = this.router.url.startsWith('/entrepreneur') ? '/entrepreneur/dashboard' : '/incubateur/reunions';
    void this.router.navigate([target]);
  }

  // ═══════════ Contrôles ═══════════

  protected async run(action: Promise<void>): Promise<void> {
    this.pending.set(true);
    try {
      await action;
    } finally {
      this.pending.set(false);
    }
  }

  protected openSettings(): void {
    void this.room.refreshDevices();
    this.settingsOpen.set(true);
  }

  /** Raccourcis standards (Google Meet) : Ctrl/⌘+D micro, Ctrl/⌘+E caméra, Échap ferme les dialogues. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.settingsOpen.set(false);
      this.leaveDialogOpen.set(false);
      return;
    }
    if (this.phase() !== 'in-call' || !(event.ctrlKey || event.metaKey) || this.pending()) return;
    const key = event.key.toLowerCase();
    if (key === 'd') {
      event.preventDefault();
      void this.run(this.room.toggleMicrophone());
    } else if (key === 'e') {
      event.preventDefault();
      void this.run(this.room.toggleCamera());
    }
  }

  // ═══════════ Affichage ═══════════

  protected controlClass(off: boolean): string {
    const base =
      'flex size-12 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60';
    return off ? `${base} bg-rose-600 text-white hover:bg-rose-500` : `${base} bg-neutral-800 text-white hover:bg-neutral-700`;
  }

  protected toggleClass(active: boolean): string {
    const base =
      'flex size-12 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40';
    return active ? `${base} bg-accent text-white hover:bg-accent-strong` : `${base} bg-neutral-800 text-white hover:bg-neutral-700`;
  }

  protected initialsOf(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private fail(message: string): void {
    void this.room.leaveMeeting();
    this.error.set(message);
    this.phase.set('error');
  }

  private toast(message: string): void {
    const id = ++this.toastId;
    this.toasts.update((t) => [...t.slice(-2), { id, message }]);
    setTimeout(() => this.toasts.update((t) => t.filter((x) => x.id !== id)), 4000);
  }
}
