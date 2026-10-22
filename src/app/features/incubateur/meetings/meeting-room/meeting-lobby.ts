import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { MeetingRoomService } from '../../../../core/services/meeting-room.service';
import { Meeting } from '../../../../core/models/meeting.model';
import { MeetingDeviceSettings } from './meeting-device-settings';

export interface LobbyJoinChoice {
  micEnabled: boolean;
  cameraEnabled: boolean;
}

/** Salle d'attente : aperçu caméra, test du micro et choix des appareils avant d'entrer. */
@Component({
  selector: 'app-meeting-lobby',
  standalone: true,
  imports: [Icon, ButtonComponent, MeetingDeviceSettings],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mx-auto grid w-full max-w-5xl items-center gap-8 p-4 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:gap-12 lg:p-8">
      <!-- Aperçu -->
      <div class="flex flex-col gap-4">
        <div class="relative aspect-video overflow-hidden rounded-3xl bg-neutral-900 shadow-xl ring-1 ring-line">
          <video #preview autoplay playsinline muted class="size-full -scale-x-100 object-cover" [class.hidden]="!cameraOn()"></video>

          @if (!cameraOn()) {
            <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 text-neutral-300">
              <div class="flex size-20 items-center justify-center rounded-full bg-neutral-700 text-2xl font-semibold text-white">
                {{ initials() }}
              </div>
              <p class="text-sm">{{ preparing() ? 'Démarrage de la caméra…' : 'Caméra désactivée' }}</p>
            </div>
          }

          <!-- Contrôles d'aperçu -->
          <div class="absolute inset-x-0 bottom-4 flex items-center justify-center gap-3">
            <button
              type="button"
              class="flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              [class]="micOn() ? 'border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur' : 'border-transparent bg-rose-600 text-white hover:bg-rose-500'"
              [attr.aria-pressed]="!micOn()"
              [attr.aria-label]="micOn() ? 'Couper le micro' : 'Activer le micro'"
              [title]="micOn() ? 'Couper le micro' : 'Activer le micro'"
              (click)="toggleMic()"
            >
              <app-icon [name]="micOn() ? 'mic' : 'mic-off'" class="size-5" />
            </button>
            <button
              type="button"
              class="flex size-12 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              [class]="cameraOn() ? 'border-white/30 bg-black/40 text-white hover:bg-black/60 backdrop-blur' : 'border-transparent bg-rose-600 text-white hover:bg-rose-500'"
              [attr.aria-pressed]="!cameraOn()"
              [attr.aria-label]="cameraOn() ? 'Désactiver la caméra' : 'Activer la caméra'"
              [title]="cameraOn() ? 'Désactiver la caméra' : 'Activer la caméra'"
              (click)="toggleCamera()"
            >
              <app-icon [name]="cameraOn() ? 'video' : 'video-off'" class="size-5" />
            </button>
          </div>
        </div>

        <!-- Test du micro -->
        <div class="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <app-icon [name]="micOn() ? 'mic' : 'mic-off'" class="size-4 shrink-0" [class.text-ink-muted]="micOn()" [class.text-rose-500]="!micOn()" />
          <div class="flex flex-1 items-end gap-1" role="meter" aria-label="Niveau du micro" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="levelPercent()">
            @for (bar of bars; track bar) {
              <span
                class="h-2 flex-1 rounded-full transition-colors duration-75"
                [class.bg-emerald-500]="micOn() && levelPercent() > bar"
                [class.bg-line]="!micOn() || levelPercent() <= bar"
              ></span>
            }
          </div>
          <span class="shrink-0 text-xs text-ink-muted">{{ micOn() ? 'Parlez pour tester' : 'Micro coupé' }}</span>
        </div>

        @if (mediaError()) {
          <p class="flex items-start gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200" role="alert">
            <app-icon name="alert-circle" class="mt-0.5 size-4 shrink-0" />
            {{ mediaError() }}
          </p>
        }
      </div>

      <!-- Infos + rejoindre -->
      <div class="flex flex-col gap-6">
        <div>
          <span class="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted">
            <span class="size-1.5 rounded-full bg-emerald-500"></span>
            Réunion en ligne
          </span>
          <h1 class="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ meeting().title }}</h1>
          <p class="mt-2 text-sm text-ink-muted">
            Animée par {{ meeting().coachName }} · {{ schedule() }}
          </p>
        </div>

        <app-meeting-device-settings />

        <div class="flex flex-col gap-2 sm:flex-row lg:flex-col">
          <app-button variant="primary" size="lg" [fullWidth]="true" [disabled]="joining()" (click)="onJoin()">
            @if (joining()) {
              <app-icon name="loader" class="size-4 animate-spin" />
              Connexion…
            } @else {
              Rejoindre la réunion
            }
          </app-button>
          <app-button variant="secondary" size="lg" [fullWidth]="true" (click)="cancel.emit()">Retour</app-button>
        </div>
      </div>
    </div>
  `,
})
export class MeetingLobby {
  private readonly meetingRoom = inject(MeetingRoomService);

  readonly meeting = input.required<Meeting>();
  readonly userName = input('');
  readonly joining = input(false);
  readonly join = output<LobbyJoinChoice>();
  readonly cancel = output<void>();

  private readonly previewEl = viewChild.required<ElementRef<HTMLVideoElement>>('preview');

  protected readonly mediaError = this.meetingRoom.mediaError;
  protected readonly micOn = signal(true);
  protected readonly cameraOn = computed(() => this.wantCamera() && !!this.meetingRoom.previewVideo());
  protected readonly preparing = signal(true);
  protected readonly levelPercent = signal(0);
  protected readonly bars = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90];

  private readonly wantCamera = signal(true);

  protected readonly initials = computed(() =>
    this.userName()
      .split(/\s+/)
      .filter(Boolean)
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2) || '?',
  );

  protected readonly schedule = computed(() => {
    const m = this.meeting();
    const date = new Date(m.scheduledAt).toLocaleString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${date} · ${m.durationMinutes} min`;
  });

  constructor() {
    effect((onCleanup) => {
      const track = this.meetingRoom.previewVideo();
      const el = this.previewEl().nativeElement;
      if (!track) return;
      track.attach(el);
      onCleanup(() => track.detach(el));
    });

    // Vu-mètre du micro, à partir de la piste d'aperçu.
    effect((onCleanup) => {
      const track = this.meetingRoom.previewAudio();
      if (!track) {
        this.levelPercent.set(0);
        return;
      }
      const stop = this.watchLevel(track.mediaStreamTrack);
      onCleanup(stop);
    });

    afterNextRender(() => {
      void this.meetingRoom.startPreview().finally(() => {
        this.preparing.set(false);
        if (!this.meetingRoom.previewAudio()) this.micOn.set(false);
        if (!this.meetingRoom.previewVideo()) this.wantCamera.set(false);
      });
    });
  }

  protected async toggleMic(): Promise<void> {
    const next = !this.micOn();
    this.micOn.set(next);
    await this.meetingRoom.setPreviewMic(next);
    if (next && !this.meetingRoom.previewAudio()) this.micOn.set(false);
  }

  protected async toggleCamera(): Promise<void> {
    const next = !this.wantCamera();
    this.wantCamera.set(next);
    await this.meetingRoom.setPreviewCamera(next);
    if (next && !this.meetingRoom.previewVideo()) this.wantCamera.set(false);
  }

  protected onJoin(): void {
    this.join.emit({ micEnabled: this.micOn(), cameraEnabled: this.wantCamera() });
  }

  private watchLevel(track: MediaStreamTrack): () => void {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return () => undefined;

    const ctx = new AudioCtx();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(new MediaStream([track])).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    let frame = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / data.length);
      this.levelPercent.set(Math.min(100, Math.round(rms * 400)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // Appelé par le nettoyage de l'effet, y compris à la destruction du composant.
    return () => {
      cancelAnimationFrame(frame);
      void ctx.close();
    };
  }
}
