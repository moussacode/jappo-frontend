import { Injectable, signal } from '@angular/core';
import {
  ConnectionQuality,
  ConnectionState,
  DisconnectReason,
  LocalAudioTrack,
  LocalVideoTrack,
  Participant,
  RemoteTrack,
  Room,
  RoomEvent,
  Track,
  VideoPresets,
  createLocalAudioTrack,
  createLocalVideoTrack,
} from 'livekit-client';

export interface MeetingParticipantView {
  identity: string;
  displayName: string;
  isLocal: boolean;
  isHost: boolean;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  isScreenSharing: boolean;
  connectionQuality: ConnectionQuality;
  /** Pistes LiveKit à attacher dans la vue (`track.attach(el)`), jamais recréées entre deux rafraîchissements. */
  cameraTrack: Track | null;
  screenTrack: Track | null;
}

export interface MeetingDevices {
  audioinput: MediaDeviceInfo[];
  videoinput: MediaDeviceInfo[];
  audiooutput: MediaDeviceInfo[];
}

export interface MeetingDeviceSelection {
  audioinput?: string;
  videoinput?: string;
  audiooutput?: string;
}

export interface JoinRoomOptions {
  /** Résout le nom affiché à partir de l'identité LiveKit (= userId côté backend). */
  resolveName: (identity: string) => string | undefined;
  hostIdentity?: string;
  micEnabled: boolean;
  cameraEnabled: boolean;
}

/** Pourquoi la connexion s'est arrêtée, pour afficher le bon écran. */
export type MeetingEndReason = 'left' | 'ended-by-host' | 'removed' | 'connection-lost';

const AUDIO_CAPTURE = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };

@Injectable({ providedIn: 'root' })
export class MeetingRoomService {
  private room: Room | null = null;
  private options: JoinRoomOptions | null = null;
  /** Conteneur caché qui héberge les <audio> des participants distants. */
  private audioSink: HTMLElement | null = null;

  // ── État de la salle
  readonly participants = signal<MeetingParticipantView[]>([]);
  readonly isHost = signal(false);
  readonly isConnected = signal(false);
  readonly isReconnecting = signal(false);
  readonly endReason = signal<MeetingEndReason | null>(null);
  /** Le navigateur a bloqué la lecture audio (autoplay) : il faut un clic pour la débloquer. */
  readonly audioBlocked = signal(false);
  /** Erreur non bloquante (micro/caméra refusés, partage d'écran impossible…). */
  readonly mediaError = signal<string | null>(null);

  // ── Appareils
  readonly devices = signal<MeetingDevices>({ audioinput: [], videoinput: [], audiooutput: [] });
  readonly selectedDevices = signal<MeetingDeviceSelection>({});

  // ── Pré-visualisation (salle d'attente)
  readonly previewAudio = signal<LocalAudioTrack | null>(null);
  readonly previewVideo = signal<LocalVideoTrack | null>(null);

  // ═══════════════════════════════════════════
  // Salle d'attente : pré-visualisation et appareils
  // ═══════════════════════════════════════════

  async startPreview(): Promise<void> {
    this.mediaError.set(null);
    await Promise.all([this.setPreviewMic(true), this.setPreviewCamera(true)]);
    await this.refreshDevices();
  }

  async setPreviewMic(enabled: boolean): Promise<void> {
    this.previewAudio()?.stop();
    this.previewAudio.set(null);
    if (!enabled) return;
    try {
      const track = await createLocalAudioTrack({ ...AUDIO_CAPTURE, deviceId: this.selectedDevices().audioinput });
      this.previewAudio.set(track);
      this.rememberDevice('audioinput', track.mediaStreamTrack);
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'micro'));
    }
  }

  async setPreviewCamera(enabled: boolean): Promise<void> {
    this.previewVideo()?.stop();
    this.previewVideo.set(null);
    if (!enabled) return;
    try {
      const track = await createLocalVideoTrack({
        deviceId: this.selectedDevices().videoinput,
        resolution: VideoPresets.h720.resolution,
      });
      this.previewVideo.set(track);
      this.rememberDevice('videoinput', track.mediaStreamTrack);
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'caméra'));
    }
  }

  stopPreview(): void {
    this.previewAudio()?.stop();
    this.previewVideo()?.stop();
    this.previewAudio.set(null);
    this.previewVideo.set(null);
  }

  async refreshDevices(): Promise<void> {
    const [audioinput, videoinput, audiooutput] = await Promise.all([
      Room.getLocalDevices('audioinput', false),
      Room.getLocalDevices('videoinput', false),
      Room.getLocalDevices('audiooutput', false),
    ]);
    this.devices.set({ audioinput, videoinput, audiooutput });
  }

  /** Change d'appareil, que l'on soit en salle d'attente ou en réunion. */
  async selectDevice(kind: MediaDeviceKind, deviceId: string): Promise<void> {
    this.selectedDevices.update((d) => ({ ...d, [kind]: deviceId }));

    if (this.room) {
      await this.room.switchActiveDevice(kind, deviceId);
      return;
    }
    if (kind === 'audioinput' && this.previewAudio()) await this.setPreviewMic(true);
    if (kind === 'videoinput' && this.previewVideo()) await this.setPreviewCamera(true);
  }

  // ═══════════════════════════════════════════
  // Réunion
  // ═══════════════════════════════════════════

  async joinRoom(livekitUrl: string, token: string, isHostUser: boolean, options: JoinRoomOptions): Promise<void> {
    // On garde la pré-visualisation : ses pistes vont être publiées.
    await this.teardownRoom();

    this.options = options;
    this.isHost.set(isHostUser);
    this.endReason.set(null);
    this.mediaError.set(null);

    const selected = this.selectedDevices();
    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { ...AUDIO_CAPTURE, deviceId: selected.audioinput },
      videoCaptureDefaults: { deviceId: selected.videoinput, resolution: VideoPresets.h720.resolution },
      audioOutput: selected.audiooutput ? { deviceId: selected.audiooutput } : undefined,
    });
    this.room = room;
    this.setupRoomListeners(room);

    // Le clic sur « Rejoindre » est un geste utilisateur : on en profite pour débloquer l'audio.
    room.startAudio().catch(() => undefined);

    try {
      await room.connect(livekitUrl, token);
    } catch (err) {
      this.room = null;
      room.removeAllListeners();
      throw err;
    }

    this.isConnected.set(true);
    this.audioBlocked.set(!room.canPlaybackAudio);

    // Publie les pistes de la salle d'attente pour éviter de rouvrir la caméra et le micro.
    await this.publishPreviewTracks(options);
    this.refresh();
  }

  async toggleMicrophone(): Promise<void> {
    const local = this.room?.localParticipant;
    if (!local) return;
    try {
      await local.setMicrophoneEnabled(!local.isMicrophoneEnabled);
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'micro'));
    }
    this.refresh();
  }

  async toggleCamera(): Promise<void> {
    const local = this.room?.localParticipant;
    if (!local) return;
    try {
      await local.setCameraEnabled(!local.isCameraEnabled);
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'caméra'));
    }
    this.refresh();
  }

  async toggleScreenShare(): Promise<void> {
    const local = this.room?.localParticipant;
    if (!local) return;
    try {
      await local.setScreenShareEnabled(!local.isScreenShareEnabled, { audio: true });
    } catch (err) {
      // L'utilisateur a fermé la fenêtre de sélection : ce n'est pas une erreur.
      if ((err as DOMException)?.name !== 'NotAllowedError') {
        this.mediaError.set('Impossible de partager votre écran.');
      }
    }
    this.refresh();
  }

  async startAudio(): Promise<void> {
    await this.room?.startAudio();
    this.audioBlocked.set(!(this.room?.canPlaybackAudio ?? true));
  }

  async leaveMeeting(): Promise<void> {
    await this.teardownRoom();
    this.stopPreview();
  }

  disconnect(): void {
    void this.leaveMeeting();
  }

  // ═══════════════════════════════════════════
  // Internes
  // ═══════════════════════════════════════════

  private async teardownRoom(): Promise<void> {
    const room = this.room;
    this.room = null;
    if (room) {
      room.removeAllListeners();
      await room.disconnect();
    }
    this.audioSink?.remove();
    this.audioSink = null;
    this.participants.set([]);
    this.isConnected.set(false);
    this.isReconnecting.set(false);
    this.audioBlocked.set(false);
  }

  private async publishPreviewTracks(options: JoinRoomOptions): Promise<void> {
    const local = this.room!.localParticipant;
    const audio = this.previewAudio();
    const video = this.previewVideo();
    this.previewAudio.set(null);
    this.previewVideo.set(null);

    try {
      if (options.micEnabled && audio) await local.publishTrack(audio);
      else {
        audio?.stop();
        if (options.micEnabled) await local.setMicrophoneEnabled(true);
      }
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'micro'));
    }

    try {
      if (options.cameraEnabled && video) await local.publishTrack(video);
      else {
        video?.stop();
        if (options.cameraEnabled) await local.setCameraEnabled(true);
      }
    } catch (err) {
      this.mediaError.set(this.describeMediaError(err, 'caméra'));
    }
  }

  private setupRoomListeners(room: Room): void {
    const refresh = () => this.refresh();

    room
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.ParticipantNameChanged, refresh)
      .on(RoomEvent.TrackPublished, refresh)
      .on(RoomEvent.TrackUnpublished, refresh)
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ActiveSpeakersChanged, refresh)
      .on(RoomEvent.ConnectionQualityChanged, refresh)
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        // Cause de l'absence de son : les pistes audio distantes doivent être jouées dans un <audio>.
        if (track.kind === Track.Kind.Audio) this.ensureAudioSink().appendChild(track.attach());
        this.refresh();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((el) => el.remove());
        this.refresh();
      })
      .on(RoomEvent.AudioPlaybackStatusChanged, () => this.audioBlocked.set(!room.canPlaybackAudio))
      .on(RoomEvent.MediaDevicesChanged, () => void this.refreshDevices())
      .on(RoomEvent.ActiveDeviceChanged, (kind: MediaDeviceKind, deviceId: string) =>
        this.selectedDevices.update((d) => ({ ...d, [kind]: deviceId })),
      )
      .on(RoomEvent.Reconnecting, () => this.isReconnecting.set(true))
      .on(RoomEvent.SignalReconnecting, () => this.isReconnecting.set(true))
      .on(RoomEvent.Reconnected, () => this.isReconnecting.set(false))
      .on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
        this.isConnected.set(false);
        this.isReconnecting.set(false);
        // Le backend supprime la room LiveKit quand le coach termine la réunion.
        if (reason === DisconnectReason.ROOM_DELETED) this.endReason.set('ended-by-host');
        else if (reason === DisconnectReason.PARTICIPANT_REMOVED) this.endReason.set('removed');
        else if (reason !== DisconnectReason.CLIENT_INITIATED) this.endReason.set('connection-lost');
      });
  }

  /** Reconstruit la liste des participants depuis l'état réel de la room LiveKit. */
  private refresh(): void {
    const room = this.room;
    if (!room || room.state === ConnectionState.Disconnected) return;

    const views = [room.localParticipant, ...room.remoteParticipants.values()].map((p) =>
      this.toView(p, p === room.localParticipant),
    );
    this.participants.set(views);
  }

  private toView(p: Participant, isLocal: boolean): MeetingParticipantView {
    const camera = p.getTrackPublication(Track.Source.Camera);
    const screen = p.getTrackPublication(Track.Source.ScreenShare);
    const isHost = isLocal ? this.isHost() : p.identity === this.options?.hostIdentity;

    return {
      identity: p.identity,
      displayName: this.options?.resolveName(p.identity) || (p.name !== p.identity ? p.name : '') || 'Participant',
      isLocal,
      isHost,
      isMuted: !p.isMicrophoneEnabled,
      isCameraOff: !camera?.track || camera.isMuted,
      isSpeaking: p.isSpeaking,
      isScreenSharing: !!screen?.track && !screen.isMuted,
      connectionQuality: p.connectionQuality,
      cameraTrack: camera?.track ?? null,
      screenTrack: screen?.track && !screen.isMuted ? screen.track : null,
    };
  }

  private ensureAudioSink(): HTMLElement {
    if (!this.audioSink) {
      this.audioSink = document.createElement('div');
      this.audioSink.hidden = true;
      this.audioSink.setAttribute('data-meeting-audio', '');
      document.body.appendChild(this.audioSink);
    }
    return this.audioSink;
  }

  private rememberDevice(kind: MediaDeviceKind, track: MediaStreamTrack): void {
    const deviceId = track.getSettings().deviceId;
    if (deviceId) this.selectedDevices.update((d) => ({ ...d, [kind]: deviceId }));
  }

  private describeMediaError(err: unknown, device: 'micro' | 'caméra'): string {
    const name = (err as DOMException)?.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return `Accès ${device === 'micro' ? 'au micro' : 'à la caméra'} refusé. Autorisez-le dans les paramètres du navigateur.`;
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return `Aucun${device === 'caméra' ? 'e' : ''} ${device} détecté${device === 'caméra' ? 'e' : ''}.`;
    }
    if (name === 'NotReadableError') {
      return `${device === 'micro' ? 'Le micro' : 'La caméra'} est déjà utilisé${device === 'caméra' ? 'e' : ''} par une autre application.`;
    }
    return `Impossible d'activer ${device === 'micro' ? 'le micro' : 'la caméra'}.`;
  }
}
