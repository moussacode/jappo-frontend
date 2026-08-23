import { EtapeParcours } from '../models';

export interface EtapeInfo {
  cle: EtapeParcours;
  label: string;
}

export const PARCOURS: EtapeInfo[] = [
  { cle: 'ideation', label: 'Idéation' },
  { cle: 'etude_marche', label: 'Étude de marché' },
  { cle: 'business_model_canvas', label: 'Business Model Canvas' },
  { cle: 'etude_faisabilite', label: 'Étude de faisabilité' },
  { cle: 'prototype', label: 'Prototype / MVP' },
  { cle: 'pitch_deck', label: 'Pitch Deck' },
  { cle: 'business_plan', label: 'Business Plan' },
  { cle: 'recherche_financement', label: 'Recherche de financement' },
];