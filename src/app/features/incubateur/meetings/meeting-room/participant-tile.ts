import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, viewChild } from '@angular/core';
import { ConnectionQuality } from 'livekit-client';
import { Icon } from '../../../../shared/components/icon/icon';
import { MeetingParticipantView } from '../../../../core/services/meeting-room.service';

/** Tuile vidéo d'un participant (caméra ou partage d'écran). */
@Component({
  selector: 'app-participant-tile',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'relative block overflow-hidden rounded-2xl bg-neutral-800 ring-1 ring-white/10 transition-shadow duration-200',
    '[class.ring-2]': 'highlightSpeaker()',
    '[class.ring-emerald-400]': 'highlightSpeaker()',
    '[attr.aria-label]': 'ariaLabel()',
    role: 'group',
  },
  template: `
    <video
      #video
      autoplay
      playsinline
      muted
      class="size-full bg-neutral-900"
      [class.hidden]="!track()"
      [class.object-cover]="source() === 'camera'"
      [class.object-contain]="source() === 'screen'"
      [class.-scale-x-100]="participant().isLocal && source() === 'camera'"
    ></video>

    @if (!track()) {
      <div class="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_#404040,_#171717)]">
        <div
          class="flex items-center justify-center rounded-full bg-neutral-600 font-semibold text-white ring-4 ring-neutral-700/80 transition-shadow"
          [class.size-12]="compact()"
          [class.text-base]="compact()"
          [class.size-20]="!compact()"
          [class.text-2xl]="!compact()"
          [class.ring-emerald-400/70]="participant().isSpeaking"
        >
          {{ initials() }}
        </div>
      </div>
    }

    <!-- Qualité de connexion dégradée -->
    @if (poorConnection()) {
      <div class="absolute top-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/60 px-2 py-1 text-[11px] font-medium text-amber-300 backdrop-blur-sm" title="Connexion instable">
        <span class="flex items-end gap-0.5" aria-hidden="true">
          <span class="h-1.5 w-1 rounded-sm bg-current"></span>
          <span class="h-2.5 w-1 rounded-sm bg-white/30"></span>
          <span class="h-3.5 w-1 rounded-sm bg-white/30"></span>
        </span>
        @if (!compact()) { <span>Connexion instable</span> }
      </div>
    }

    <!-- Nom + état du micro -->
    <div class="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent"></div>
    <div class="absolute bottom-2 left-2 right-2 flex items-center gap-2">
      <span class="flex min-w-0 items-center gap-1.5 rounded-lg bg-black/50 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm">
        @if (participant().isMuted && source() === 'camera') {
          <app-icon name="mic-off" class="size-3.5 shrink-0 text-rose-400" aria-label="Micro coupé" />
        }
        @if (source() === 'screen') {
          <app-icon name="monitor-up" class="size-3.5 shrink-0" />
        }
        <span class="truncate">{{ label() }}</span>
      </span>
      @if (participant().isHost && source() === 'camera' && !compact()) {
        <span class="shrink-0 rounded-md bg-accent px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Coach</span>
      }
    </div>
  `,
})
export class ParticipantTile {
  readonly participant = input.required<MeetingParticipantView>();
  readonly source = input<'camera' | 'screen'>('camera');
  /** Vignette réduite (bande latérale pendant un partage d'écran). */
  readonly compact = input(false);

  private readonly videoEl = viewChild.required<ElementRef<HTMLVideoElement>>('video');

  protected readonly track = computed(() => {
    const p = this.participant();
    if (this.source() === 'screen') return p.screenTrack;
    return p.isCameraOff ? null : p.cameraTrack;
  });

  protected readonly highlightSpeaker = computed(
    () => this.source() === 'camera' && this.participant().isSpeaking && !this.participant().isMuted,
  );

  protected readonly poorConnection = computed(() => {
    const q = this.participant().connectionQuality;
    return q === ConnectionQuality.Poor || q === ConnectionQuality.Lost;
  });

  protected readonly label = computed(() => {
    const p = this.participant();
    const name = p.isLocal ? `${p.displayName} (vous)` : p.displayName;
    return this.source() === 'screen' ? `Écran de ${p.isLocal ? 'vous' : p.displayName}` : name;
  });

  protected readonly initials = computed(() =>
    this.participant()
      .displayName.split(/\s+/)
      .filter(Boolean)
      .map((n) => n.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2),
  );

  protected readonly ariaLabel = computed(() => {
    const p = this.participant();
    const states = [p.isMuted ? 'micro coupé' : 'micro actif', p.isCameraOff ? 'caméra coupée' : 'caméra active'];
    return this.source() === 'screen' ? this.label() : `${this.label()}, ${states.join(', ')}`;
  });

  constructor() {
    // La piste LiveKit est la même instance d'un rafraîchissement à l'autre : on ne rattache que si elle change.
    effect((onCleanup) => {
      const track = this.track();
      const el = this.videoEl().nativeElement;
      if (!track) return;
      track.attach(el);
      onCleanup(() => track.detach(el));
    });
  }
}
