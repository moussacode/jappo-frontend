export type MeetingType = 'INDIVIDUAL' | 'GROUP';
export type MeetingMode = 'ONLINE' | 'PRESENTIEL';
export type MeetingStatus = 'PLANNED' | 'ONGOING' | 'ENDED' | 'CANCELLED';
export type ParticipantRole = 'HOST' | 'ATTENDEE';

export interface Meeting {
  id: string;
  structureId: string;
  coachId: string;
  coachName: string;
  title: string;
  description?: string;
  type: MeetingType;
  mode: MeetingMode;
  cohortId?: string;
  cohortName?: string;
  location?: string;
  address?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
  participants: MeetingParticipant[];
}

export interface MeetingParticipant {
  id: string;
  userId: string;
  userName: string;
  role: ParticipantRole;
  joinedAt?: string;
  leftAt?: string;
}

export interface CreateMeetingRequest {
  title: string;
  description?: string;
  type: MeetingType;
  mode: MeetingMode;
  cohortId?: string;
  participantId?: string;
  location?: string;
  address?: string;
  scheduledAt: string;
  durationMinutes: number;
}

export interface JoinMeetingResponse {
  roomIdentifier: string;
  livekitUrl: string;
  token: string;
  isHost: boolean;
}
