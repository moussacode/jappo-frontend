import { Injectable, inject, signal, DestroyRef } from '@angular/core';
import { Room, RoomEvent, RemoteParticipant, RemoteTrack, Track, LocalParticipant, LocalTrackPublication } from 'livekit-client';
import { Observable, Subject } from 'rxjs';

export interface MeetingParticipantView {
  identity: string;
  displayName: string;
  isLocal: boolean;
  isHost: boolean;
  videoTrack?: MediaStream | null;
  audioTrack?: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
}

@Injectable({ providedIn: 'root' })
export class MeetingRoomService {
  private room: Room | null = null;
  private destroyRef = inject(DestroyRef);

  // État principal
  participants = signal<Map<string, MeetingParticipantView>>(new Map());
  isHost = signal(false);
  meetingEnded = signal(false);
  isConnected = signal(false);
  isConnecting = signal(false);
  error = signal<string | null>(null);

  // Sujets pour les événements
  private participantConnected$ = new Subject<MeetingParticipantView>();
  private participantDisconnected$ = new Subject<string>();
  private trackSubscribed$ = new Subject<{ identity: string; kind: 'video' | 'audio' }>();
  private trackUnsubscribed$ = new Subject<{ identity: string; kind: 'video' | 'audio' }>();
  private roomDisconnected$ = new Subject<void>();

  participantConnected = this.participantConnected$.asObservable();
  participantDisconnected = this.participantDisconnected$.asObservable();
  trackSubscribed = this.trackSubscribed$.asObservable();
  trackUnsubscribed = this.trackUnsubscribed$.asObservable();
  roomDisconnected = this.roomDisconnected$.asObservable();

  async joinRoom(livekitUrl: string, token: string, isHostUser: boolean): Promise<void> {
    this.isConnecting.set(true);
    this.error.set(null);

    try {
      this.room = new Room();
      this.isHost.set(isHostUser);

      // Écouter les événements de la room
      this.setupRoomListeners();

      // Connecter à la room
      await this.room.connect(livekitUrl, token);

      this.isConnected.set(true);
      this.isConnecting.set(false);

      // Ajouter le participant local avec initialisation des tracks
      if (this.room.localParticipant) {
        this.addParticipant(this.room.localParticipant, true);

        // Activer caméra et microphone sans faire échouer la connexion
        await this.enableLocalTracks();
      }

      // Parcourir les participants distants déjà présents et leurs publications
      for (const [identity, remoteParticipant] of this.room.remoteParticipants) {
        this.addParticipant(remoteParticipant, false);

        // Parcourir leurs publications déjà publiées
        for (const [trackSid, publication] of remoteParticipant.trackPublications) {
          if (publication.track) {
            this.updateParticipantTrack(identity, publication.track);
          }
        }
      }

    } catch (err) {
      this.isConnecting.set(false);
      this.error.set('Impossible de rejoindre la réunion. Vérifiez votre connexion.');
      console.error('Failed to join room:', err);
      throw err;
    }
  }

  private async enableLocalTracks(): Promise<void> {
    if (!this.room?.localParticipant) return;

    const localParticipant = this.room.localParticipant;

    try {
      // Activer le microphone
      await localParticipant.setMicrophoneEnabled(true);
    } catch (err) {
      console.warn('Microphone access denied or failed:', err);
      this.error.set('Accès au microphone refusé. Vous pourrez l\'activer plus tard.');
    }

    try {
      // Activer la caméra
      await localParticipant.setCameraEnabled(true);
    } catch (err) {
      console.warn('Camera access denied or failed:', err);
      if (!this.error()) {
        this.error.set('Accès à la caméra refusé. Vous pourrez l\'activer plus tard.');
      }
    }

    // Mettre à jour l'état local après activation
    this.updateLocalParticipantState();
  }

  private updateLocalParticipantState(): void {
    if (!this.room?.localParticipant) return;

    const localParticipant = this.room.localParticipant;
    const currentParticipants = new Map(this.participants());
    const participantView = currentParticipants.get(localParticipant.identity);

    if (participantView) {
      // Vérifier l'état réel des publications locales en itérant sur toutes les publications
      let micEnabled = false;
      let camEnabled = false;
      let micTrack: MediaStreamTrack | null = null;
      let camTrack: MediaStreamTrack | null = null;

      localParticipant.trackPublications.forEach((publication: LocalTrackPublication) => {
        if (publication.kind === 'audio') {
          micEnabled = publication.isEnabled;
          if (publication.track) {
            micTrack = publication.track.mediaStreamTrack;
          }
        } else if (publication.kind === 'video') {
          camEnabled = publication.isEnabled;
          if (publication.track) {
            camTrack = publication.track.mediaStreamTrack;
          }
        }
      });

      participantView.isMuted = !micEnabled;
      participantView.isCameraOff = !camEnabled;
      participantView.audioTrack = micTrack ? new MediaStream([micTrack]) : null;
      participantView.videoTrack = camTrack ? new MediaStream([camTrack]) : null;

      currentParticipants.set(localParticipant.identity, participantView);
      this.participants.set(currentParticipants);
    }
  }

  private setupRoomListeners(): void {
    if (!this.room) return;

    this.room.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      this.addParticipant(participant, false);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      this.removeParticipant(participant.identity);
    });

    this.room.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      this.updateParticipantTrack(participant.identity, track);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, publication: any, participant: RemoteParticipant) => {
      this.removeParticipantTrack(participant.identity, track.kind);
    });

    this.room.on(RoomEvent.LocalTrackPublished, (publication: LocalTrackPublication, participant: LocalParticipant) => {
      this.updateLocalParticipantTrack(publication);
    });

    this.room.on(RoomEvent.LocalTrackUnpublished, (publication: LocalTrackPublication, participant: LocalParticipant) => {
      this.removeLocalParticipantTrack(publication);
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.handleRoomDisconnected();
    });
  }

  private addParticipant(participant: LocalParticipant | RemoteParticipant, isLocal: boolean): void {
    const participantView: MeetingParticipantView = {
      identity: participant.identity,
      displayName: participant.name || participant.identity,
      isLocal,
      isHost: isLocal ? this.isHost() : false, // Pour les participants distants, isHost sera déterminé plus tard si nécessaire
      isMuted: false,
      isCameraOff: true,
      videoTrack: null,
      audioTrack: null
    };

    const currentParticipants = new Map(this.participants());
    currentParticipants.set(participant.identity, participantView);
    this.participants.set(currentParticipants);

    if (!isLocal) {
      this.participantConnected$.next(participantView);
    }
  }

  private removeParticipant(identity: string): void {
    const currentParticipants = new Map(this.participants());
    currentParticipants.delete(identity);
    this.participants.set(currentParticipants);
    this.participantDisconnected$.next(identity);
  }

  private updateParticipantTrack(identity: string, track: RemoteTrack): void {
    const currentParticipants = new Map(this.participants());
    const participant = currentParticipants.get(identity);

    if (participant) {
      if (track.kind === 'video') {
        participant.videoTrack = new MediaStream([track.mediaStreamTrack]);
        participant.isCameraOff = false;
      } else if (track.kind === 'audio') {
        participant.audioTrack = new MediaStream([track.mediaStreamTrack]);
        participant.isMuted = false;
      }

      currentParticipants.set(identity, participant);
      this.participants.set(currentParticipants);

      this.trackSubscribed$.next({ identity, kind: track.kind as 'video' | 'audio' });
    }
  }

  private updateLocalParticipantTrack(publication: LocalTrackPublication): void {
    if (!this.room?.localParticipant) return;

    const localParticipant = this.room.localParticipant;
    const currentParticipants = new Map(this.participants());
    const participantView = currentParticipants.get(localParticipant.identity);

    if (participantView && publication.track) {
      if (publication.kind === 'video') {
        participantView.videoTrack = new MediaStream([publication.track.mediaStreamTrack]);
        participantView.isCameraOff = !publication.isEnabled;
      } else if (publication.kind === 'audio') {
        participantView.audioTrack = new MediaStream([publication.track.mediaStreamTrack]);
        participantView.isMuted = !publication.isEnabled;
      }

      currentParticipants.set(localParticipant.identity, participantView);
      this.participants.set(currentParticipants);
    }
  }

  private removeLocalParticipantTrack(publication: LocalTrackPublication): void {
    if (!this.room?.localParticipant) return;

    const localParticipant = this.room.localParticipant;
    const currentParticipants = new Map(this.participants());
    const participantView = currentParticipants.get(localParticipant.identity);

    if (participantView) {
      if (publication.kind === 'video') {
        participantView.videoTrack = undefined;
        participantView.isCameraOff = true;
      } else if (publication.kind === 'audio') {
        participantView.audioTrack = undefined;
        participantView.isMuted = true;
      }

      currentParticipants.set(localParticipant.identity, participantView);
      this.participants.set(currentParticipants);
    }
  }

  private removeParticipantTrack(identity: string, kind: string): void {
    const currentParticipants = new Map(this.participants());
    const participant = currentParticipants.get(identity);

    if (participant) {
      if (kind === 'video') {
        participant.videoTrack = null;
        participant.isCameraOff = true;
      } else if (kind === 'audio') {
        participant.audioTrack = null;
        participant.isMuted = true;
      }

      currentParticipants.set(identity, participant);
      this.participants.set(currentParticipants);

      this.trackUnsubscribed$.next({ identity, kind: kind as 'video' | 'audio' });
    }
  }

  private handleRoomDisconnected(): void {
    this.isConnected.set(false);
    // NE PAS mettre meetingEnded.set(true) ici
    // La déconnexion LiveKit ne signifie pas que la réunion est terminée
    // Le statut ENDED vient uniquement du backend via l'API
    this.roomDisconnected$.next();
  }

  toggleMicrophone(enabled: boolean): void {
    if (this.room?.localParticipant) {
      try {
        this.room.localParticipant.setMicrophoneEnabled(enabled);
        // Mettre à jour l'état local via la publication réelle
        this.updateLocalParticipantState();
      } catch (err) {
        console.error('Failed to toggle microphone:', err);
      }
    }
  }

  toggleCamera(enabled: boolean): void {
    if (this.room?.localParticipant) {
      try {
        this.room.localParticipant.setCameraEnabled(enabled);
        // Mettre à jour l'état local via la publication réelle
        this.updateLocalParticipantState();
      } catch (err) {
        console.error('Failed to toggle camera:', err);
      }
    }
  }

  async leaveMeeting(): Promise<void> {
    if (this.room) {
      await this.room.disconnect();
      this.room = null;
      this.isConnected.set(false);
      this.participants.set(new Map());
    }
  }

  disconnect(): void {
    this.leaveMeeting();
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.room?.localParticipant || null;
  }

  getRemoteParticipants(): RemoteParticipant[] {
    return Array.from(this.room?.remoteParticipants.values() || []);
  }
}
