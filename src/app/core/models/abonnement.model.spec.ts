import { PlanAbonnement, avantagesPlan, formaterDuree, formaterPrix, lireErreurLimitePlan } from './abonnement.model';

const plan = (surcharge: Partial<PlanAbonnement> = {}): PlanAbonnement => ({
  id: 'p1',
  code: 'TEST',
  libelle: 'Test',
  description: null,
  prix: 0,
  devise: 'XOF',
  dureeJours: null,
  maxCohortes: 1,
  iaCoachActive: true,
  iaEntrepreneurActive: false,
  iaTokensMensuels: 200_000,
  estDefaut: true,
  actif: true,
  ordre: 1,
  ...surcharge,
});

describe('abonnement.model', () => {
  it('reconnaît une limite du plan par son code', () => {
    const erreur = lireErreurLimitePlan({
      status: 429,
      error: { code: 'IA_QUOTA_EPUISE', message: 'Épuisé', consomme: 210, limite: 200 },
    });
    expect(erreur).toEqual({ code: 'IA_QUOTA_EPUISE', message: 'Épuisé', consomme: 210, limite: 200 });
  });

  it("ignore une erreur qui n'est pas une limite du plan, même si le message cite une offre", () => {
    expect(lireErreurLimitePlan({ status: 400, error: { message: 'Passez à Premium' } })).toBeNull();
    expect(lireErreurLimitePlan(null)).toBeNull();
  });

  it('génère les avantages depuis les limites du plan', () => {
    expect(avantagesPlan(plan())).toEqual([
      '1 cohorte planifiée ou en cours',
      'Assistant IA pour les coachs et les administrateurs',
      '200 k tokens IA par mois pour la structure',
    ]);
    expect(avantagesPlan(plan({ maxCohortes: null, iaEntrepreneurActive: true, iaTokensMensuels: null }))).toEqual([
      'Cohortes illimitées',
      'Assistant IA pour les coachs, les administrateurs et les entrepreneurs',
      'Consommation IA illimitée',
    ]);
  });

  it('formate prix et durée', () => {
    expect(formaterPrix(90000, 'XOF')).toMatch(/^90\s000 FCFA$/);
    expect(formaterPrix(50, 'EUR')).toBe('50 EUR');
    expect(formaterDuree(365)).toBe('12 mois');
    expect(formaterDuree(90)).toBe('3 mois');
    expect(formaterDuree(null)).toBe('Sans limite de durée');
  });
});
