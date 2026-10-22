/**
 * Brouillon local d'un programme construit dans l'assistant, avant création
 * côté API (programme → parcours → phases → étapes → missions d'étape).
 */

export interface MissionBrouillon {
  cle: string;
  titre: string;
}

export interface EtapeBrouillon {
  cle: string;
  nom: string;
  obligatoire: boolean;
  missions: MissionBrouillon[];
}

export interface PhaseBrouillon {
  cle: string;
  nom: string;
  description: string;
  etapes: EtapeBrouillon[];
}

export interface ProgrammeBrouillon {
  nom: string;
  description: string;
  nomParcours: string;
  phases: PhaseBrouillon[];
}

let compteur = 0;
export const nouvelleCle = (): string => `b${Date.now().toString(36)}${(compteur++).toString(36)}`;

export const nouvelleMission = (titre = ''): MissionBrouillon => ({ cle: nouvelleCle(), titre });

export const nouvelleEtape = (nom = '', missions: string[] = []): EtapeBrouillon => ({
  cle: nouvelleCle(),
  nom,
  obligatoire: true,
  missions: missions.map((t) => nouvelleMission(t)),
});

export const nouvellePhase = (nom = '', description = '', etapes: EtapeBrouillon[] = []): PhaseBrouillon => ({
  cle: nouvelleCle(),
  nom,
  description,
  etapes,
});

/** Modèle recommandé : un parcours d'incubation classique en trois phases. */
export function modeleRecommande(): PhaseBrouillon[] {
  return [
    nouvellePhase('Idéation', 'Clarifier le problème, la cible et la proposition de valeur.', [
      nouvelleEtape('Problème et cible', ['Décrire le problème et le segment client']),
      nouvelleEtape('Proposition de valeur', ['Formuler la proposition de valeur']),
      nouvelleEtape('Business Model Canvas', ['Compléter le Business Model Canvas']),
    ]),
    nouvellePhase('Validation', 'Confronter le projet au marché et construire un premier produit.', [
      nouvelleEtape('Entretiens clients', ['Mener 10 entretiens clients']),
      nouvelleEtape('Produit minimum viable', ['Présenter le MVP et ses premiers retours']),
      nouvelleEtape('Premiers revenus', ['Documenter les premières ventes']),
    ]),
    nouvellePhase('Accélération', 'Structurer la croissance et préparer le financement.', [
      nouvelleEtape('Prévisionnel financier', ['Construire le prévisionnel sur 3 ans']),
      nouvelleEtape('Pitch investisseurs', ['Préparer le pitch deck']),
      nouvelleEtape('Plan de croissance', ['Rédiger le plan de croissance à 12 mois']),
    ]),
  ];
}

/** Nombre d'appels API nécessaires pour créer le brouillon (sert à la progression). */
export function nombreOperations(b: ProgrammeBrouillon): number {
  const etapes = b.phases.flatMap((p) => p.etapes);
  const missions = etapes.flatMap((e) => e.missions.filter((m) => m.titre.trim()));
  // programme + parcours + (phase + rattachement) par phase + étapes + missions
  return 2 + b.phases.length * 2 + etapes.length + missions.length;
}
