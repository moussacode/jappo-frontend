import { CsvValue } from '../../../../core/utils/csv-export';
import { RapportCohorte, SituationRapport, libelleStade } from '../../../../core/models/cohorte.model';

export const LIBELLES_SITUATION: Record<SituationRapport, string> = {
  EN_COURS: 'En cours',
  PROMU: 'Promu',
  DIPLOME: 'Diplômé',
  ABANDON: 'Abandon',
  RETIRE: 'Retiré',
};

export const ENTETES_CSV_RAPPORT = [
  'Cohorte',
  'Projet',
  'Entrepreneur',
  'Email',
  'Situation',
  'Entrée',
  'Sortie',
  'Motif de sortie',
  'Phase actuelle',
  'Stade actuel',
  'Avancement parcours (%)',
  'Missions',
  'Missions validées',
  'Missions en retard',
  'Livrables en attente',
  'Livrables à corriger',
  'Livrables validés',
] as const;

/** Une ligne par projet passé par la cohorte ; dates au format AAAA-MM-JJ. */
export function lignesCsvRapport(rapport: RapportCohorte): CsvValue[][] {
  return rapport.projets.map((l) => [
    rapport.nomCohorte,
    l.nomProjet,
    l.nomEntrepreneur,
    l.emailEntrepreneur,
    LIBELLES_SITUATION[l.situation] ?? l.situation,
    jour(l.dateEntree),
    jour(l.dateSortie),
    l.raisonSortie,
    l.phaseActuelle,
    libelleStade(l.stadeActuel),
    l.avancement,
    l.missionsTotal,
    l.missionsValidees,
    l.missionsEnRetard,
    l.livrablesEnAttente,
    l.livrablesACorriger,
    l.livrablesValides,
  ]);
}

function jour(date: string | null | undefined): string | null {
  return date ? date.slice(0, 10) : null;
}
