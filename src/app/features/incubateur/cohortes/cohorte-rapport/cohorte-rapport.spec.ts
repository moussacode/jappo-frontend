import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { CohorteRapport } from './cohorte-rapport';
import { ENTETES_CSV_RAPPORT, lignesCsvRapport } from './cohorte-rapport-csv';
import { RapportCohorte } from '../../../../core/models/cohorte.model';

const rapport: RapportCohorte = {
  cohorteId: 'c1',
  nomCohorte: 'Promo 2026',
  statutCohorte: 'EN_COURS',
  dateDebut: '2026-01-10',
  dateFin: null,
  nomProgramme: null,
  nomParcours: 'Parcours',
  nomPhase: 'Incubation',
  stade: 'INCUBATION',
  dateGeneration: '2026-10-12T10:00:00',
  synthese: {
    projets: 2, enCours: 1, promus: 1, diplomes: 0, abandons: 0, retires: 0,
    missionsTotal: 4, missionsValidees: 1, tauxValidationMissions: 25, missionsEnRetard: 1,
    projetsEnRetard: 1, livrablesEnAttente: 1, livrablesACorriger: 0, livrablesValides: 0, avancementMoyen: 40,
  },
  projets: [
    {
      projetId: 'p1', nomProjet: 'Alpha', entrepreneurId: 'u1', nomEntrepreneur: 'Awa Diop',
      emailEntrepreneur: 'awa@test.local', situation: 'EN_COURS', dateEntree: '2026-01-10T09:00:00',
      dateSortie: null, raisonSortie: null, phaseActuelle: 'Incubation', stadeActuel: 'INCUBATION',
      avancement: 40, missionsTotal: 2, missionsValidees: 1, missionsEnRetard: 0,
      livrablesEnAttente: 1, livrablesACorriger: 0, livrablesValides: 0,
    },
    {
      projetId: 'p2', nomProjet: 'Beta', entrepreneurId: 'u2', nomEntrepreneur: 'Ali Ba',
      emailEntrepreneur: 'ali@test.local', situation: 'PROMU', dateEntree: '2026-01-10T09:00:00',
      dateSortie: '2026-06-01T14:30:00', raisonSortie: 'Comité de juin', phaseActuelle: 'Alumni',
      stadeActuel: 'POST_INCUBATION', avancement: null, missionsTotal: 2, missionsValidees: 0,
      missionsEnRetard: 1, livrablesEnAttente: 0, livrablesACorriger: 0, livrablesValides: 0,
    },
  ],
};

describe('lignesCsvRapport', () => {
  it('produit une ligne par projet alignée sur les en-têtes, avec libellés et dates courtes', () => {
    const lignes = lignesCsvRapport(rapport);

    expect(lignes).toHaveLength(2);
    expect(lignes[1]).toHaveLength(ENTETES_CSV_RAPPORT.length);
    expect(lignes[1]).toEqual([
      'Promo 2026', 'Beta', 'Ali Ba', 'ali@test.local', 'Promu', '2026-01-10', '2026-06-01',
      'Comité de juin', 'Alumni', 'Post-incubation', null, 2, 0, 1, 0, 0, 0,
    ]);
  });
});

describe('CohorteRapport', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: 'c1' }) } } }],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('charge le rapport de la cohorte et filtre les projets par situation', () => {
    const fixture = TestBed.createComponent(CohorteRapport);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/cohortes/c1/rapport')).flush(rapport);
    fixture.detectChanges();

    const composant = fixture.componentInstance;
    expect(composant.optionsFiltre().map((o) => o.value)).toEqual(['TOUS', 'EN_COURS', 'PROMU']);

    composant.filtre.set('PROMU');
    expect(composant.lignesFiltrees().map((l) => l.nomProjet)).toEqual(['Beta']);
    expect(fixture.nativeElement.textContent).toContain('Rapport · Promo 2026');
  });

  it('affiche une erreur exploitable si le rapport est refusé', () => {
    const fixture = TestBed.createComponent(CohorteRapport);
    fixture.detectChanges();
    http.expectOne((r) => r.url.endsWith('/cohortes/c1/rapport'))
      .flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });

    expect(fixture.componentInstance.erreur()).toBe('Accès refusé');
  });
});
