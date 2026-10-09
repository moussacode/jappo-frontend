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

export interface LivrableAttendu {
  id: string;
  titre: string;
  description?: string | null;
  ordre: number;
  obligatoire: boolean;
  type: LivrableAttenduType;
  templateType?: string | null;
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
}

export interface UpdateLivrableAttenduRequest {
  titre?: string;
  description?: string | null;
  ordre?: number;
  obligatoire?: boolean;
  type?: LivrableAttenduType;
  templateType?: string | null;
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
