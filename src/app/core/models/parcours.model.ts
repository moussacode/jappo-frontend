export interface Programme {
  id: string;
  nom: string;
  description?: string;
  archive: boolean;
  structureId: string;
  dateCreation: string;
  dateModification?: string;
  parcoursIds: string[];
}

export interface Etape {
  id: string;
  nom: string;
  description?: string;
  ordre: number;
  obligatoire: boolean;
  archive: boolean;
  phaseId: string;
  structureId: string;
  dateCreation: string;
  dateModification?: string;
  missionIds: string[];
  // Données de progression pour l'affichage frontend
  statut?: 'VALIDEE' | 'ACTIVE' | 'VERROUILLEE';
  accessible?: boolean;
}

export interface MissionEtape {
  id: string;
  titre: string;
  description?: string | null;
  ordre: number;
  obligatoire: boolean;
  structureId: string;
  etapeId: string;
  phaseId?: string | null;
  modeleId?: string | null;
  dateCreation?: string | null;
  livrablesAttenduesCount?: number;
}

export type LivrableAttenduType = 'FICHIER' | 'LIEN' | 'TEXTE' | 'TEMPLATE';

export interface TemplateField {
  id: string;
  label: string;
}

export interface LivrableAttendu {
  id: string;
  titre: string;
  description?: string | null;
  ordre: number;
  obligatoire: boolean;
  type: LivrableAttenduType;
  templateType?: string | null;
  templateFields?: TemplateField[];
  missionEtapeId: string;
  etapeId: string;
  structureId: string;
  dateCreation?: string | null;
}

export interface CreateLivrableAttenduRequest {
  titre: string;
  description?: string | null;
  ordre?: number;
  obligatoire?: boolean;
  type?: LivrableAttenduType;
  templateType?: string | null;
  templateFields?: TemplateField[];
}

export interface UpdateLivrableAttenduRequest {
  titre?: string;
  description?: string | null;
  ordre?: number;
  obligatoire?: boolean;
  type?: LivrableAttenduType;
  templateType?: string | null;
  templateFields?: TemplateField[];
}

export interface Progression {
  id: string;
  projetId: string;
  parcoursId: string;
  phaseId: string;
  etapeId?: string;
  statut: 'EN_COURS' | 'EN_PAUSE' | 'TERMINE' | 'ABANDONNE';
  pourcentageAvancement: number;
  dateDebut: string;
  dateDerniereMaj?: string;
  dateFin?: string;
}

export type StatutFeuilleRoute =
  | 'TERMINEE' | 'VALIDEE' | 'EN_COURS' | 'ACTIVE' | 'ACCESSIBLE' | 'A_ACTIVER'
  | 'NON_DEMARREE' | 'VERROUILLEE' | 'INCOMPLETE' | 'ARCHIVEE' | 'NON_ASSIGNEE'
  | 'A_FAIRE' | 'SOUMIS' | 'VALIDE' | 'A_REVOIR' | 'EN_ATTENTE' | 'A_CORRIGER' | 'REJETE';

export interface LivrableDeposeRoute {
  id: string;
  nom: string;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'A_CORRIGER' | 'REJETE';
  numeroVersion: number;
  dateDepot?: string | null;
}

export interface MissionFeuilleRoute {
  id: string;
  origine: 'ETAPE' | 'COHORTE';
  titre: string;
  description?: string | null;
  obligatoire: boolean;
  statut: StatutFeuilleRoute;
  livrablesAttendus: LivrableAttendu[];
  livrablesDeposes: LivrableDeposeRoute[];
}

export interface EtapeFeuilleRoute {
  id: string;
  nom: string;
  description?: string | null;
  ordre: number;
  obligatoire: boolean;
  statut: StatutFeuilleRoute;
  motif?: string | null;
  pourcentageAvancement: number;
  missions: MissionFeuilleRoute[];
}

export interface PhaseFeuilleRoute {
  id: string;
  nom: string;
  ordre: number;
  statut: StatutFeuilleRoute;
  motif?: string | null;
  pourcentageAvancement: number;
  etapes: EtapeFeuilleRoute[];
}

export interface FeuilleRouteProjet {
  projetId: string;
  programmeId?: string | null;
  nomProgramme?: string | null;
  parcoursId?: string | null;
  nomParcours?: string | null;
  progressionId?: string | null;
  statutProgression?: string | null;
  pourcentageAvancement?: number | null;
  phases: PhaseFeuilleRoute[];
}
