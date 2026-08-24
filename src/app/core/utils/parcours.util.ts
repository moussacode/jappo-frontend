import { EtapeParcours } from '../models';
import { PARCOURS } from '../constants/parcours.constant';

/** Retourne l'index (0-based) de l'étape courante dans le parcours à 8 étapes. */
export function getIndexEtape(etape: EtapeParcours | undefined): number {
  if (!etape) return 0;
  const i = PARCOURS.findIndex((e) => e.cle === etape);
  return i === -1 ? 0 : i;
}