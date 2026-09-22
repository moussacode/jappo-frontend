import { StatutLivrable } from '../models/livrable.model';
import { BadgeStatus } from '../../shared/components/badge/badge';

export const STATUT_LIVRABLE_CONFIG: Record<StatutLivrable, { status: BadgeStatus; label: string }> = {
  EN_ATTENTE: { status: 'warning', label: 'En attente de révision' },
  VALIDE: { status: 'success', label: 'Validé' },
  A_CORRIGER: { status: 'warning', label: 'Correction demandée' },
  REJETE: { status: 'danger', label: 'Rejeté' },
};