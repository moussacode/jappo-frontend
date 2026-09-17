import {
  Injectable,
  inject,
  signal,
  computed,
  DestroyRef,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { VoiceService } from './voice.service';
import { TtsService } from './tts.service';

export type VocalState =
  | 'IDLE'        // Modal fermée ou en attente
  | 'LISTENING'   // Enregistrement micro en cours
  | 'PROCESSING'  // Whisper + appel IA en cours
  | 'SPEAKING'    // TTS joue la réponse
  | 'ERROR';      // Erreur (micro, réseau, TTS…)

/**
 * VoiceModeService — orchestre la boucle vocale complète :
 *
 *   IDLE → LISTENING → PROCESSING → SPEAKING → LISTENING (auto-loop)
 *                                             ↓
 *                                         IDLE (si arrêt volontaire)
 *
 * Ce service coordonne VoiceService (STT) et TtsService (TTS).
 * Il ne contient aucune logique IA ni métier JAPPO.
 *
 * Les composants s'abonnent à :
 *   - `vocalState` signal : état courant
 *   - `transcript` signal : dernier texte transcrit
 *   - `onTranscript$` Subject : émis quand un texte est prêt à être envoyé à l'IA
 *
 * Le composant appelant doit :
 *   1. S'abonner à `onTranscript$`
 *   2. Envoyer le texte à l'IA
 *   3. Appeler `speakResponse(texteIA)` avec la réponse
 *   4. Le service reprend automatiquement l'écoute après la parole (si autoLoop = true)
 */
@Injectable({ providedIn: 'root' })
export class VoiceModeService {
  private readonly voiceService = inject(VoiceService);
  private readonly ttsService   = inject(TtsService);
  private readonly destroyRef   = inject(DestroyRef);

  // ── État public ────────────────────────────────────────────────────────────

  readonly vocalState   = signal<VocalState>('IDLE');
  readonly errorMessage = signal<string | null>(null);
  readonly transcript   = signal<string>('');
  readonly isModalOpen  = signal(false);

  /** Activité audio (0–1) pour animer le waveform — simulée sur le timing */
  readonly audioLevel   = signal<number>(0);

  /** Émis quand un transcript est prêt — le composant doit l'envoyer à l'IA */
  readonly onTranscript$ = new Subject<string>();

  /** Auto-reprendre l'écoute après que l'IA a répondu */
  autoLoop = false;

  // ── État interne ───────────────────────────────────────────────────────────

  private animationFrameId: number | null = null;
  private audioLevelInterval: ReturnType<typeof setInterval> | null = null;

  // ── API publique ───────────────────────────────────────────────────────────

  /** Ouvre la modal vocale et démarre l'écoute */
  async openAndListen(): Promise<void> {
    this.isModalOpen.set(true);
    this.errorMessage.set(null);
    this.transcript.set('');
    await this.startListening();
  }

  /** Ferme la modal et arrête tout */
  closeModal(): void {
    this.stop();
    this.isModalOpen.set(false);
    this.vocalState.set('IDLE');
    this.transcript.set('');
    this.errorMessage.set(null);
    this.stopAudioAnimation();
  }

  /** Démarre ou arrête l'écoute (bouton micro dans la modal) */
  async toggleListening(): Promise<void> {
    const state = this.vocalState();
    if (state === 'LISTENING') {
      this.voiceService.stopRecording();
    } else if (state === 'IDLE' || state === 'ERROR') {
      await this.startListening();
    }
  }

  /** Interrompt la parole et repasse en écoute */
  interrupt(): void {
    if (this.vocalState() === 'SPEAKING') {
      this.ttsService.stop();
      this.vocalState.set('IDLE');
      this.stopAudioAnimation();
    }
  }

  /** Arrête tout (stop complet sans fermer) */
  stop(): void {
    this.voiceService.cancelRecording();
    this.ttsService.stop();
    this.stopAudioAnimation();
    this.vocalState.set('IDLE');
  }

  /**
   * Joue la réponse IA en TTS puis reprend l'écoute si autoLoop = true.
   * Appelé par le composant après avoir reçu la réponse de l'IA.
   */
  async speakResponse(text: string): Promise<void> {
    if (!text.trim()) {
      if (this.autoLoop && this.isModalOpen()) {
        await this.startListening();
      }
      return;
    }

    this.vocalState.set('SPEAKING');
    this.startSpeakingAnimation();

    // S'abonner à la fin de la parole pour reprendre l'écoute
    const sub = this.ttsService.onSpeakEnd$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async () => {
        sub.unsubscribe();
        this.stopAudioAnimation();
        if (this.autoLoop && this.isModalOpen()) {
          await this.startListening();
        } else {
          this.vocalState.set('IDLE');
        }
      });

    await this.ttsService.speak(text);
  }

  /** Passe l'état à PROCESSING (appelé par le composant pendant le traitement IA) */
  setProcessing(): void {
    this.vocalState.set('PROCESSING');
    this.stopAudioAnimation();
    this.startProcessingAnimation();
  }

  // ── Logique interne ────────────────────────────────────────────────────────

  private async startListening(): Promise<void> {
    if (!this.voiceService.isSupported) {
      this.vocalState.set('ERROR');
      this.errorMessage.set('Votre navigateur ne supporte pas le microphone.');
      return;
    }

    this.vocalState.set('LISTENING');
    this.transcript.set('');
    this.startListeningAnimation();

    try {
      const blob = await this.voiceService.startRecording();

      // Vérifier qu'on n'a pas annulé entre-temps
      if (this.vocalState() !== 'LISTENING') return;

      this.vocalState.set('PROCESSING');
      this.stopAudioAnimation();

      this.voiceService.transcribe(blob).subscribe({
        next: (response) => {
          if (!response.success || !response.text.trim()) {
            this.vocalState.set('ERROR');
            this.errorMessage.set('Je n\'ai pas compris. Réessayez.');
            return;
          }
          this.transcript.set(response.text.trim());
          this.onTranscript$.next(response.text.trim());
        },
        error: () => {
          this.vocalState.set('ERROR');
          this.errorMessage.set('Transcription échouée. Vérifiez que jappo-voice est démarré.');
        },
      });
    } catch (err: any) {
      if (this.vocalState() === 'LISTENING') {
        this.vocalState.set('ERROR');
        this.errorMessage.set(
          this.voiceService.micError() ?? 'Impossible d\'accéder au microphone.'
        );
      }
      this.stopAudioAnimation();
    }
  }

  // ── Animations ─────────────────────────────────────────────────────────────

  /** Animation waveform pendant l'écoute — level oscille aléatoirement */
  private startListeningAnimation(): void {
    this.stopAudioAnimation();
    this.audioLevelInterval = setInterval(() => {
      // Simuler une activité audio variable (0.3–1.0)
      this.audioLevel.set(0.3 + Math.random() * 0.7);
    }, 150);
  }

  /** Animation plus douce pendant le processing */
  private startProcessingAnimation(): void {
    this.stopAudioAnimation();
    let t = 0;
    this.audioLevelInterval = setInterval(() => {
      // Pulsation sinusoïdale lente
      t += 0.15;
      this.audioLevel.set(0.4 + Math.sin(t) * 0.3);
    }, 80);
  }

  /** Animation pendant la parole TTS */
  private startSpeakingAnimation(): void {
    this.stopAudioAnimation();
    let t = 0;
    this.audioLevelInterval = setInterval(() => {
      // Onde plus ample + fréquence variable
      t += 0.2;
      this.audioLevel.set(0.5 + Math.sin(t) * 0.4 + Math.sin(t * 2.3) * 0.1);
    }, 60);
  }

  private stopAudioAnimation(): void {
    if (this.audioLevelInterval !== null) {
      clearInterval(this.audioLevelInterval);
      this.audioLevelInterval = null;
    }
    this.audioLevel.set(0);
  }
}
