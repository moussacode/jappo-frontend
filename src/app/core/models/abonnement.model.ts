/**
 * Plan d'abonnement configuré par le SUPER_ADMIN.
 * Les limites à null signifient « illimité » ; dureeJours à null signifie « sans fin ».
 */
export interface PlanAbonnement {
  id: string;
  code: string;
  libelle: string;
  description: string | null;
  prix: number;
  devise: string;
  dureeJours: number | null;
  maxCohortes: number | null;
  iaCoachActive: boolean;
  iaEntrepreneurActive: boolean;
  iaTokensMensuels: number | null;
  estDefaut: boolean;
  actif: boolean;
  ordre: number;
}

export type PlanAbonnementRequest = Omit<PlanAbonnement, 'id' | 'actif'>;

export type StatutAbonnement =
  | 'ACTIF'
  | 'EXPIRE'
  | 'EN_ATTENTE_PAIEMENT'
  | 'ANNULE';

/**
 * plan = plan souscrit ; planEffectif = plan réellement appliqué
 * (le plan par défaut si l'abonnement n'est plus en vigueur).
 */
export interface Abonnement {
  id: string;
  plan: PlanAbonnement;
  planEffectif: PlanAbonnement;
  statut: StatutAbonnement;
  dateDebut: string | null;
  dateFin: string | null;
  renouvellementAuto: boolean;
  dateCreation: string;
}

/** Limites du plan effectif et consommation courante de la structure active. */
export interface UsageAbonnement {
  planEffectif: PlanAbonnement;
  statutAbonnement: StatutAbonnement | null;
  dateFin: string | null;
  cohortes: { utilise: number; limite: number | null };
  ia: {
    accesCoach: boolean;
    accesEntrepreneur: boolean;
    /** L'utilisateur connecté peut-il utiliser l'IA avec ce plan ? */
    accesUtilisateur: boolean;
    roleUtilisateur: string | null;
    tokensConsommes: number;
    tokensLimite: number | null;
    pourcentage: number | null;
    debutPeriode: string;
    finPeriode: string;
  };
}

/** Codes d'erreur renvoyés par le backend quand une limite du plan est atteinte. */
export type CodeLimitePlan = 'IA_ROLE_NON_AUTORISE' | 'IA_QUOTA_EPUISE' | 'PLAN_LIMITE_ATTEINTE';

export interface ErreurLimitePlan {
  code: CodeLimitePlan;
  message: string;
  consomme: number | null;
  limite: number | null;
}

/** Extrait une erreur de limite de plan d'une réponse HTTP (reconnue par son code, jamais par le message). */
export function lireErreurLimitePlan(error: unknown): ErreurLimitePlan | null {
  const body = (error as { error?: Partial<ErreurLimitePlan> } | null)?.error;
  const codes: CodeLimitePlan[] = ['IA_ROLE_NON_AUTORISE', 'IA_QUOTA_EPUISE', 'PLAN_LIMITE_ATTEINTE'];
  if (!body || !body.code || !codes.includes(body.code)) {
    return null;
  }
  return {
    code: body.code,
    message: body.message ?? '',
    consomme: body.consomme ?? null,
    limite: body.limite ?? null,
  };
}

/** Prix formaté, ex. « 90 000 FCFA » (XOF est affiché FCFA). */
export function formaterPrix(prix: number, devise: string): string {
  const montant = new Intl.NumberFormat('fr-FR').format(prix);
  return `${montant} ${devise === 'XOF' ? 'FCFA' : devise}`;
}

/** Durée lisible d'un plan : « 12 mois », « 30 jours », « Sans limite de durée ». */
export function formaterDuree(dureeJours: number | null): string {
  if (dureeJours === null) return 'Sans limite de durée';
  if (dureeJours % 365 === 0) {
    const annees = dureeJours / 365;
    return annees === 1 ? '12 mois' : `${annees * 12} mois`;
  }
  if (dureeJours % 30 === 0) return `${dureeJours / 30} mois`;
  return `${dureeJours} jours`;
}

/** Nombre de tokens lisible, ex. « 200 k ». */
export function formaterTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000).toLocaleString('fr-FR')} k`;
  return tokens.toLocaleString('fr-FR');
}

/** Avantages d'un plan, générés depuis ses limites (aucun texte de plan en dur). */
export function avantagesPlan(plan: PlanAbonnement): string[] {
  const avantages = [
    plan.maxCohortes === null
      ? 'Cohortes illimitées'
      : `${plan.maxCohortes} cohorte${plan.maxCohortes > 1 ? 's' : ''} planifiée${plan.maxCohortes > 1 ? 's' : ''} ou en cours`,
  ];

  if (plan.iaCoachActive && plan.iaEntrepreneurActive) {
    avantages.push('Assistant IA pour les coachs, les administrateurs et les entrepreneurs');
  } else if (plan.iaCoachActive) {
    avantages.push('Assistant IA pour les coachs et les administrateurs');
  } else if (plan.iaEntrepreneurActive) {
    avantages.push('Assistant IA pour les entrepreneurs');
  } else {
    avantages.push('Sans assistant IA');
  }

  if (plan.iaCoachActive || plan.iaEntrepreneurActive) {
    avantages.push(
      plan.iaTokensMensuels === null
        ? 'Consommation IA illimitée'
        : `${formaterTokens(plan.iaTokensMensuels)} tokens IA par mois pour la structure`,
    );
  }
  return avantages;
}
