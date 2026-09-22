import { PrioriteMission } from './mission.model';

export interface MissionModele {
  id: string;
  titre: string;
  description?: string;
  prioriteParDefaut: PrioriteMission;
  structureId: string;
  dateCreation?: string;
}

export interface CreateMissionModeleRequest {
  titre: string;
  description?: string;
  prioriteParDefaut?: PrioriteMission;
}
