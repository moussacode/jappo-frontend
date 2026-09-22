export type TypeRessource = 'PDF' | 'LIEN' | 'DOCUMENT' | 'VIDEO' | 'AUTRE';
export type PorteeRessource = 'STRUCTURE' | 'COHORTE' | 'PARCOURS' | 'PHASE' | 'MISSION';

export interface Ressource {
  id: string;
  structureId: string;
  titre: string;
  description?: string;
  type: TypeRessource;
  portee: PorteeRessource;
  url?: string;
  nomFichier?: string;
  taille?: number;
  mimeType?: string;
  cohorteId?: string;
  nomCohorte?: string;
  parcoursId?: string;
  nomParcours?: string;
  phaseId?: string;
  nomPhase?: string;
  missionCohorteIds?: string[];
  archivee: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRessourceRequest {
  titre: string;
  description?: string;
  type?: TypeRessource;
  url?: string;
  portee?: PorteeRessource;
  cohorteId?: string;
  parcoursId?: string;
  phaseId?: string;
  missionCohorteIds?: string[];
}

export interface UpdateRessourceRequest {
  titre?: string;
  description?: string;
  type?: TypeRessource;
  url?: string;
  portee?: PorteeRessource;
  cohorteId?: string;
  parcoursId?: string;
  phaseId?: string;
  missionCohorteIds?: string[];
}

/**
 * Labels lisibles pour les types de ressources
 */
export const TYPE_RESSOURCE_LABELS: Record<TypeRessource, string> = {
  PDF: 'PDF',
  LIEN: 'Lien',
  DOCUMENT: 'Document',
  VIDEO: 'Vidéo',
  AUTRE: 'Autre',
};

/**
 * Icônes pour les types de ressources (noms compatibles IconComponent)
 */
export const TYPE_RESSOURCE_ICONS: Record<TypeRessource, string> = {
  PDF: 'file-text',
  LIEN: 'link',
  DOCUMENT: 'file',
  VIDEO: 'video',
  AUTRE: 'paperclip',
};

/**
 * Labels lisibles pour les portées
 */
export const PORTEE_RESSOURCE_LABELS: Record<PorteeRessource, string> = {
  STRUCTURE: 'Général',
  COHORTE: 'Cohorte',
  PARCOURS: 'Parcours',
  PHASE: 'Phase',
  MISSION: 'Mission',
};
