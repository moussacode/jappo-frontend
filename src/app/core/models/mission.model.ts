export type StatutMission = 'A_FAIRE' | 'EN_COURS' | 'SOUMIS' | 'VALIDE' | 'A_REVOIR';
export type PrioriteMission = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';

/**
 * DTO backend réel : MissionResponse / MissionProjet.
 * Ce contrat est explicite pour éviter toute hypothèse sur une relation mission/étape non exposée par l’API.
 */
export interface MissionProjet {
  id: string;
  missionCohorteId?: string | null;
  missionEtapeId?: string | null;
  titre: string;
  description?: string | null;
  dateEcheance?: string | null;
  statut: StatutMission;
  priorite?: PrioriteMission;

  projetId?: string | null;
  nomProjet?: string | null;
  cohorteId?: string | null;
  nomCohorte?: string | null;
  entrepreneurId?: string | null;
  nomEntrepreneur?: string | null;

  assigneAId?: string | null;
  nomAssigneA?: string | null;
  creeParId?: string | null;
  nomCreePar?: string | null;

  structureId?: string | null;
  dateCreation?: string | null;
  dateModification?: string | null;

  nombreLivrablesAttendus?: number;
  nombreLivrablesDeposes?: number;
}

export function getMissionSourceLabel(
  mission: Pick<MissionProjet, 'missionEtapeId' | 'missionCohorteId'>,
): 'Mission d’étape' | 'Mission de cohorte' | 'Mission' {
  if (mission.missionEtapeId) return 'Mission d’étape';
  if (mission.missionCohorteId) return 'Mission de cohorte';
  return 'Mission';
}

/** Alias legacy conservé pour les écrans existants de l’application. */
export type Mission = MissionProjet;
export type MissionResponse = MissionProjet;

/**
 * DTO pour une mission de cohorte agrégée avec ses statistiques de suivi.
 * Représente UNE mission de cohorte avec les statistiques de tous les suivis individuels.
 */
export interface MissionCohorteResponse {
  id: string; // MissionCohorte ID
  titre: string;
  description?: string;
  dateEcheance?: string; // YYYY-MM-DD
  priorite?: PrioriteMission;

  // Contexte cohorte
  cohorteId?: string;
  nomCohorte?: string;

  // Structure & Audit
  structureId?: string;
  dateCreation?: string;

  // Statistiques agrégées
  nombreProjetsConcernes: number;
  nombreValides: number;
  nombreEnRevue: number;
  nombreEnRetard: number;
  nombreAFaire: number;

  // Verrouillage structural
  verrouillee: boolean;
  dateVerrouillage?: string;

  // Ressources pédagogiques attachées
  ressourceIds?: string[];

  // Liste des suivis individuels (optionnel pour le détail)
  suivisIndividuels?: Mission[];
}

export interface CreateMissionRequest {
  titre: string;
  description?: string;
  dateEcheance?: string; // YYYY-MM-DD
  priorite?: PrioriteMission;
  cohorteId?: string;
  projetId?: string;
  assigneAId?: string;
  modeleId?: string;
 
  enregistrerCommeModele?: boolean;
}