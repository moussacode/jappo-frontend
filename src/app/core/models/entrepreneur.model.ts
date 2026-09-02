import { Utilisateur } from './utilisateur.model';

export type EtapeParcours =
  | 'ideation'
  | 'etude_marche'
  | 'business_model_canvas'
  | 'etude_faisabilite'
  | 'prototype'
  | 'pitch_deck'
  | 'business_plan'
  | 'recherche_financement';

export interface Entrepreneur extends Utilisateur {
  abonnementId: string | null;
}