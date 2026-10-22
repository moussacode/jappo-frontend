import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { ProjetDetail } from './projet-detail';
import { Projet } from '../../../../core/models/projet.model';

const projet: Projet = { id: 'p1', nom: 'Projet', statut: 'ACTIF', archive: false };

describe('ProjetDetail — clôture de l\'accompagnement', () => {
  let component: ProjetDetail;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({}) } } }],
    });
    component = TestBed.createComponent(ProjetDetail).componentInstance;
    http = TestBed.inject(HttpTestingController);
    component.projet.set(projet);
    component.ouvrirCloture();
  });

  afterEach(() => http.verify({ ignoreCancelled: true }));

  const requeteCloture = () => http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/projets/p1/cloturer'));

  it('exige un motif pour un abandon et n\'envoie rien sans motif', () => {
    component.choisirIssue('ABANDONNE');
    expect(component.motifObligatoire()).toBe(true);

    component.confirmerCloture();
    http.expectNone((r) => r.url.endsWith('/cloturer'));
  });

  it('envoie un abandon motivé sans forçage', () => {
    component.choisirIssue('ABANDONNE');
    component.motifCloture.set('  Arrêt du projet  ');
    component.confirmerCloture();

    const req = requeteCloture();
    expect(req.request.body).toEqual({ issue: 'ABANDONNE', motif: 'Arrêt du projet', forcer: false });
    req.flush({ ...projet, statut: 'ABANDONNE' });
    // Après la clôture, l'historique et le suivi sont rechargés.
    http.expectOne((r) => r.url.endsWith('/projets/p1/historique')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suivi/projet/p1')).flush({});

    expect(component.projet()?.statut).toBe('ABANDONNE');
    expect(component.clotureOuverte()).toBe(false);
    expect(component.estActif(component.projet()!)).toBe(false);
  });

  it('propose le forçage quand un diplôme est refusé (409), puis exige un motif', () => {
    component.confirmerCloture();
    requeteCloture().flush(
      { message: 'Missions non validées', missionsNonValidees: [{ titre: 'BMC', statut: 'A_FAIRE' }] },
      { status: 409, statusText: 'Conflict' },
    );

    const erreur = component.erreurCloture();
    expect(erreur?.forcable).toBe(true);
    expect(erreur?.missionsNonValidees).toHaveLength(1);

    component.forcerCloture.set(true);
    expect(component.motifObligatoire()).toBe(true);
    component.motifCloture.set('Levée réalisée');
    component.confirmerCloture();
    expect(requeteCloture().request.body).toEqual({ issue: 'DIPLOME', motif: 'Levée réalisée', forcer: true });
  });

  it('ne propose pas de forçage pour un refus autre que 409', () => {
    component.confirmerCloture();
    requeteCloture().flush({ message: 'Accès refusé' }, { status: 403, statusText: 'Forbidden' });
    expect(component.erreurCloture()?.forcable).toBe(false);
  });
});
