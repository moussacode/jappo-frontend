import { StatutMission } from '../models';
import { BadgeStatus } from '../../shared/components/badge/badge';

export const STATUT_MISSION_BADGE: Record<StatutMission, { status: BadgeStatus; label: string }> = {
  a_faire: { status: 'neutral', label: 'À faire' },
  en_cours: { status: 'warning', label: 'En cours' },
  en_retard: { status: 'danger', label: 'En retard' },
  terminee: { status: 'success', label: 'Terminée' },
};