export type StatutMission = 'A_FAIRE' | 'EN_COURS' | 'SOUMIS' | 'VALIDE' | 'A_REVOIR';
export type PrioriteMission = 'BASSE' | 'MOYENNE' | 'HAUTE' | 'URGENTE';

export interface Mission {
  id: string; // MissionProjet ID
  missionCohorteId?: string;
  titre: string;
  description?: string;
  dateEcheance?: string; // YYYY-MM-DD
  statut: StatutMission;
  priorite?: PrioriteMission;
  
  // Nouveaux champs de contexte
  projetId?: string;
  nomProjet?: string;
  cohorteId?: string;
  nomCohorte?: string;
  entrepreneurId?: string;
  nomEntrepreneur?: string;
  
  // Assignation & Créateur
  assigneAId?: string;
  nomAssigneA?: string;
  creeParId?: string;
  nomCreePar?: string;
  
  // Audit & Structure
  structureId?: string;
  dateCreation?: string;
  dateModification?: string;

  // Avancement
  nombreLivrablesAttendus?: number;
  nombreLivrablesDeposes?: number;
}

/** Alias contrat backend MissionResponse (suivi MissionProjet). */
export type MissionResponse = Mission;

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