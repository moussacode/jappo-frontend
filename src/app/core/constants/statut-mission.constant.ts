import { StatutMission } from '../models/mission.model';
import { BadgeStatus } from '../../shared/components/badge/badge';

export const STATUT_MISSION_CONFIG: Record<StatutMission, { status: BadgeStatus; label: string }> = {
  A_FAIRE: { status: 'neutral', label: 'À faire' },
  EN_COURS: { status: 'primary', label: 'En cours' },
  SOUMIS: { status: 'warning', label: 'Soumis' },
  VALIDE: { status: 'success', label: 'Validée' },
  A_REVOIR: { status: 'danger', label: 'À revoir' },
};

export const STATUT_MISSION_BADGE = STATUT_MISSION_CONFIG;