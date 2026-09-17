import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export type TtsState = 'idle' | 'loading' | 'speaking' | 'error';

/**
 * TtsService — synthèse vocale via jappo-voice POST /api/voice/synthesize.
 *
 * Responsabilités :
 * - Envoyer du texte à jappo-voice (TTS)
 * - Jouer l'audio retourné via Web Audio API / HTMLAudioElement
 * - Exposer l'état (idle / loading / speaking / error)
 * - Permettre l'interruption à tout moment (stop())
 * - Émettre un événement quand la lecture est terminée
 *
 * Ce service ne contient aucune logique métier JAPPO.
 */
@Injectable({ providedIn: 'root' })
export class TtsService {
  private readonly http       = inject(HttpClient);
  private readonly voiceApiUrl = environment.voiceApiUrl;

  // ── État public ────────────────────────────────────────────────────────────

  readonly ttsState = signal<TtsState>('idle');
  readonly ttsError = signal<string | null>(null);

  /** Émis quand la lecture audio se termine naturellement */
  readonly onSpeakEnd$ = new Subject<void>();

  // ── État interne ───────────────────────────────────────────────────────────

  private currentAudio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;

  // ── API publique ───────────────────────────────────────────────────────────

  /**
   * Indique si le navigateur peut jouer de l'audio.
   */
  get isSupported(): boolean {
    return typeof Audio !== 'undefined';
  }

  /**
   * Synthétise le texte donné et le joue immédiatement.
   * Si un audio est déjà en lecture, il est interrompu.
   */
  async speak(text: string, language = 'fr'): Promise<void> {
    if (!text.trim()) return;

    // Interrompre la lecture en cours si nécessaire
    this.stop();

    this.ttsState.set('loading');
    this.ttsError.set(null);

    try {
      const blob = await this.synthesize(text, language).toPromise() as Blob;
      await this.playBlob(blob);
    } catch (err: any) {
      this.ttsState.set('error');
      this.ttsError.set('La synthèse vocale a échoué. Vérifiez que jappo-voice est démarré.');
      console.error('[TtsService] Erreur synthèse:', err);
    }
  }

  /**
   * Arrête immédiatement la lecture audio en cours.
   */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio.onended  = null;
      this.currentAudio.onerror  = null;
      this.currentAudio = null;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.ttsState.set('idle');
  }

  /**
   * Requête HTTP vers jappo-voice — retourne un Blob audio.
   */
  synthesize(text: string, language = 'fr'): Observable<Blob> {
    return this.http.post(
      `${this.voiceApiUrl}/synthesize`,
      { text, language },
      { responseType: 'blob' }
    );
  }

  // ── Méthodes privées ───────────────────────────────────────────────────────

  private async playBlob(blob: Blob): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      this.currentObjectUrl = url;

      const audio = new Audio(url);
      this.currentAudio = audio;
      this.ttsState.set('speaking');

      audio.onended = () => {
        this.cleanupAudio();
        this.ttsState.set('idle');
        this.onSpeakEnd$.next();
        resolve();
      };

      audio.onerror = (e) => {
        this.cleanupAudio();
        this.ttsState.set('error');
        this.ttsError.set('Impossible de lire la réponse audio.');
        reject(e);
      };

      audio.play().catch((e) => {
        this.cleanupAudio();
        this.ttsState.set('error');
        this.ttsError.set('Lecture audio bloquée par le navigateur. Interagissez avec la page d\'abord.');
        reject(e);
      });
    });
  }

  private cleanupAudio(): void {
    this.currentAudio = null;
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
  }
}
