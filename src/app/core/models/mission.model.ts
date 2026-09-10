export type StatutMission = 'A_FAIRE' | 'EN_COURS' | 'EN_REVUE' | 'A_CORRIGER' | 'VALIDEE' | 'EN_RETARD';
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
  nomCohorte?: string; // <--- C'EST CE CHAMP QUI MANQUE
  
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
export interface CreateMissionRequest {
  titre: string;
  description?: string;
  dateEcheance?: string; // YYYY-MM-DD
  priorite?: PrioriteMission;
  cohorteId?: string;
  projetId?: string;
  assigneAId?: string;
}