import { StatutMission } from '../models/mission.model';
import { BadgeStatus } from '../../shared/components/badge/badge';

export const STATUT_MISSION_CONFIG: Record<StatutMission, { status: BadgeStatus; label: string }> = {
  A_FAIRE: { status: 'neutral', label: 'À faire' },
  EN_COURS: { status: 'primary', label: 'En cours' },
  EN_REVUE: { status: 'warning', label: 'En revue' },
  A_CORRIGER: { status: 'danger', label: 'À corriger' },
  VALIDEE: { status: 'success', label: 'Validée' },
  EN_RETARD: { status: 'danger', label: 'En retard' },
};

export const STATUT_MISSION_BADGE = STATUT_MISSION_CONFIG;