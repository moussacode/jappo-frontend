import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { VoiceModeService } from '../../../core/services/voice-mode.service';
import { TtsService } from '../../../core/services/tts.service';

/**
 * VoiceModalComponent — modal mode vocal complet.
 *
 * États visuels :
 *   IDLE        → cercle gris, "Appuyez sur le micro"
 *   LISTENING   → cercle animé rouge/accent, "Je vous écoute..."
 *   PROCESSING  → pulsation douce, "Je réfléchis..."
 *   SPEAKING    → onde ample, "JAPPO répond..."
 *   ERROR       → cercle rouge, message d'erreur
 *
 * Inputs :
 *   visible — affiche/cache la modal
 *
 * Outputs :
 *   sendMessage  — texte transcrit prêt à être envoyé au pipeline IA
 *   closed       — l'utilisateur a fermé la modal
 *
 * La modal ne connait pas l'IA : elle délègue au parent via sendMessage,
 * et attend que le parent rappelle `speakResponse(text)` via le service.
 */
@Component({
  selector: 'app-voice-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './voice-modal.html',
})
export class VoiceModalComponent implements OnDestroy {

  protected readonly voiceModeService = inject(VoiceModeService);
  private  readonly ttsService        = inject(TtsService);

  // ── I/O ────────────────────────────────────────────────────────────────────

  @Input() set visible(v: boolean) {
    if (v && !this._visible) {
      this._visible = true;
      this.voiceModeService.openAndListen();
    } else if (!v && this._visible) {
      this._visible = false;
      this.voiceModeService.closeModal();
    }
  }

  @Output() sendMessage = new EventEmitter<string>();
  @Output() closed      = new EventEmitter<void>();

  // ── État local ─────────────────────────────────────────────────────────────

  private _visible = false;

  protected readonly autoLoop = signal(false);

  /** Alias courts pour le template */
  protected readonly vocalState    = this.voiceModeService.vocalState;
  protected readonly errorMessage  = this.voiceModeService.errorMessage;
  protected readonly transcript    = this.voiceModeService.transcript;
  protected readonly audioLevel    = this.voiceModeService.audioLevel;
  protected readonly ttsState      = this.ttsService.ttsState;

  /** Labels selon l'état */
  protected readonly stateLabel = computed<string>(() => {
    switch (this.vocalState()) {
      case 'LISTENING':   return 'Je vous écoute...';
      case 'PROCESSING':  return 'Je réfléchis...';
      case 'SPEAKING':    return 'JAPPO répond...';
      case 'ERROR':       return this.errorMessage() ?? 'Une erreur est survenue.';
      default:            return 'Appuyez sur le micro pour parler';
    }
  });

  /** Rayon du halo SVG calculé depuis audioLevel (36–60) */
  protected readonly haloRadius = computed<number>(() =>
    36 + this.audioLevel() * 24
  );

  /** Opacité du halo (0.15–0.55) */
  protected readonly haloOpacity = computed<number>(() =>
    0.15 + this.audioLevel() * 0.4
  );

  private transcriptSub: Subscription;

  constructor() {
    // S'abonner aux transcriptions pour les relayer au composant parent
    this.transcriptSub = this.voiceModeService.onTranscript$.subscribe(
      (text) => {
        this.voiceModeService.setProcessing();
        this.sendMessage.emit(text);
      }
    );

    // Sync autoLoop vers le service
    // (quand l'utilisateur coche le toggle, mis à jour via toggleAutoLoop())
  }

  ngOnDestroy(): void {
    this.transcriptSub.unsubscribe();
    this.voiceModeService.closeModal();
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  protected async onMicClick(): Promise<void> {
    const state = this.vocalState();
    if (state === 'LISTENING') {
      // Arrêter l'enregistrement et lancer la transcription
      this.voiceModeService.toggleListening();
    } else if (state === 'IDLE' || state === 'ERROR') {
      await this.voiceModeService.toggleListening();
    }
  }

  protected onInterrupt(): void {
    this.voiceModeService.interrupt();
  }

  protected onClose(): void {
    this.voiceModeService.closeModal();
    this.closed.emit();
  }

  protected onToggleAutoLoop(): void {
    const next = !this.autoLoop();
    this.autoLoop.set(next);
    this.voiceModeService.autoLoop = next;
  }

  // ── Helpers template ───────────────────────────────────────────────────────

  protected isListening()   { return this.vocalState() === 'LISTENING'; }
  protected isProcessing()  { return this.vocalState() === 'PROCESSING'; }
  protected isSpeaking()    { return this.vocalState() === 'SPEAKING'; }
  protected isError()       { return this.vocalState() === 'ERROR'; }
  protected isIdle()        { return this.vocalState() === 'IDLE'; }

  /** Couleur CSS du cercle principal selon l'état */
  protected get circleColor(): string {
    switch (this.vocalState()) {
      case 'LISTENING':  return '#ef4444';   // rouge
      case 'PROCESSING': return '#8b5cf6';   // violet
      case 'SPEAKING':   return '#3b82f6';   // bleu
      case 'ERROR':      return '#f97316';   // orange
      default:           return '#6b7280';   // gris
    }
  }

  /** Couleur du halo */
  protected get haloColor(): string {
    return this.circleColor;
  }
}
