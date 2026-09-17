import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';


// ── Modèles ───────────────────────────────────────────────────────────────────

export interface TranscriptionResponse {
  success: boolean;
  text: string;
  language: string;
  duration: number;
}

export type MicState =
  | 'idle'        // Aucun enregistrement
  | 'requesting'  // Demande de permission
  | 'recording'   // Enregistrement en cours
  | 'processing'  // Upload + transcription
  | 'error';      // Erreur (permission refusée, etc.)

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * VoiceService — gère l'enregistrement micro + transcription Whisper.
 *
 * Responsabilités :
 * - Demander la permission microphone
 * - Enregistrer l'audio via MediaRecorder
 * - Envoyer les bytes audio à jappo-voice (POST /api/voice/transcribe)
 * - Retourner le texte transcrit
 * - Gérer les états et les erreurs
 *
 * Ce service NE gère PAS la synthèse vocale TTS ni le mode vocal complet —
 * ces fonctionnalités sont dans VoiceModeService (Phase 6).
 */
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private readonly http = inject(HttpClient);
  private readonly voiceApiUrl = environment.voiceApiUrl;

  // ── État public ────────────────────────────────────────────────────────────

  readonly micState = signal<MicState>('idle');
  readonly micError = signal<string | null>(null);

  // ── État interne ───────────────────────────────────────────────────────────

  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: BlobPart[] = [];
  private stream: MediaStream | null = null;
  private stopResolve: ((blob: Blob) => void) | null = null;

  // ── API publique ───────────────────────────────────────────────────────────

  /**
   * Indique si le navigateur supporte getUserMedia.
   */
  get isSupported(): boolean {
    return !!(navigator.mediaDevices?.getUserMedia);
  }

  /**
   * Démarre l'enregistrement micro.
   *
   * Retourne une Promise<Blob> qui se résout quand `stopRecording()` est appelé.
   * En cas d'erreur (permission refusée, etc.), lève une exception.
   */
  async startRecording(): Promise<Blob> {
    if (!this.isSupported) {
      this.micState.set('error');
      this.micError.set('Votre navigateur ne supporte pas l\'enregistrement audio.');
      throw new Error('getUserMedia not supported');
    }

    this.micState.set('requesting');
    this.micError.set(null);

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,   // Optimal pour Whisper
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch (err: any) {
      this.micState.set('error');
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.micError.set('Permission microphone refusée. Autorisez l\'accès dans votre navigateur.');
      } else if (err.name === 'NotFoundError') {
        this.micError.set('Aucun microphone détecté sur cet appareil.');
      } else {
        this.micError.set('Impossible d\'accéder au microphone.');
      }
      throw err;
    }

    // Choisir le format audio le mieux supporté
    const mimeType = this.getBestMimeType();
    this.audioChunks = [];

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.audioChunks.push(e.data);
    };

    this.micState.set('recording');

    return new Promise<Blob>((resolve) => {
      this.stopResolve = resolve;

      this.mediaRecorder!.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.audioChunks = [];
        this.releaseStream();
        if (this.stopResolve) {
          this.stopResolve(blob);
          this.stopResolve = null;
        }
      };

      // Collecter les données toutes les 250ms
      this.mediaRecorder!.start(250);
    });
  }

  /**
   * Arrête l'enregistrement et résout la Promise de startRecording.
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.micState.set('processing');
    }
  }

  /**
   * Annule l'enregistrement sans transcrire.
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder.stop();
    }
    this.audioChunks = [];
    this.stopResolve = null;
    this.releaseStream();
    this.micState.set('idle');
    this.micError.set(null);
  }

  /**
   * Envoie un blob audio à jappo-voice et retourne la transcription.
   *
   * Utiliser après stopRecording() ou directement avec un blob existant.
   */
  transcribe(audioBlob: Blob, language = 'fr'): Observable<TranscriptionResponse> {
    const formData = new FormData();
    const extension = this.extensionForMimeType(audioBlob.type);
    formData.append('file', audioBlob, `audio.${extension}`);
    formData.append('language', language);

    return this.http.post<TranscriptionResponse>(
      `${this.voiceApiUrl}/transcribe`,
      formData
    );
  }

  /**
   * Raccourci : enregistre, puis transcrit directement.
   *
   * Utilisé par le bouton 🎤 dans le chat — retourne le texte
   * transcrit quand l'utilisateur a fini de parler.
   *
   * @returns Observable<string> — le texte transcrit
   */
  recordAndTranscribe(language = 'fr'): {
    audioPromise: Promise<void>;
    transcription$: Observable<string>;
  } {
    // L'Observable attend d'abord que l'enregistrement se termine (Promise),
    // puis envoie le blob pour transcription.
    let blobResolve!: (b: Blob) => void;
    const blobPromise = new Promise<Blob>(r => (blobResolve = r));

    const audioPromise = this.startRecording().then((blob) => {
      blobResolve(blob);
    });

    const transcription$ = from(blobPromise).pipe(
      switchMap((blob) => {
        if (blob.size === 0) {
          return throwError(() => new Error('Enregistrement vide'));
        }
        return this.transcribe(blob, language);
      }),
      switchMap((response) => {
        this.micState.set('idle');
        if (!response.success || !response.text.trim()) {
          return throwError(() => new Error('Transcription vide ou échouée'));
        }
        return [response.text.trim()];
      })
    );

    return { audioPromise, transcription$ };
  }

  /**
   * Réinitialise l'état à idle (après traitement ou erreur).
   */
  reset(): void {
    this.micState.set('idle');
    this.micError.set(null);
  }

  // ── Méthodes privées ──────────────────────────────────────────────────────

  private releaseStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Choisit le format audio le mieux supporté par le navigateur.
   * Préférence : webm/opus (Chrome/Firefox) > mp4 > ogg > wav
   */
  private getBestMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/wav',
    ];
    for (const type of candidates) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return ''; // Laisse le navigateur choisir
  }

  private extensionForMimeType(mimeType: string): string {
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('ogg'))  return 'ogg';
    if (mimeType.includes('mp4'))  return 'mp4';
    if (mimeType.includes('wav'))  return 'wav';
    return 'webm';
  }
}
