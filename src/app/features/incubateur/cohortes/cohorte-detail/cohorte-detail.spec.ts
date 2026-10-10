import { signal } from '@angular/core';
import '@angular/compiler';
import { Mission } from '../../../../core/models/mission.model';
import { describe, expect, it } from 'vitest';
import { CohorteDetail } from './cohorte-detail';

describe('CohorteDetail mission suivi', () => {
  function createComponentForStatusChecks(): CohorteDetail {
    const component = Object.create(CohorteDetail.prototype) as CohorteDetail;
    Object.assign(component, {
      projets: signal([
        { id: 'p1', nom: 'Projet 1', statut: 'ACTIF' },
        { id: 'p2', nom: 'Projet 2', statut: 'ACTIF' },
        { id: 'p3', nom: 'Projet 3', statut: 'ACTIF' },
        { id: 'p4', nom: 'Projet 4', statut: 'ACTIF' },
      ]),
      remisesParMission: signal({}),
      cohorte: signal({ id: 'c1', phaseId: 'phase-1' }),
      feuillesRouteParProjet: signal({
        p1: {
          projetId: 'p1',
          phases: [{
            id: 'phase-1',
            nom: 'Phase 1',
            ordre: 1,
            statut: 'EN_COURS',
            pourcentageAvancement: 25,
            etapes: [{
              id: 'step-1',
              nom: 'Étape 1',
              ordre: 1,
              obligatoire: true,
              statut: 'ACTIVE',
              pourcentageAvancement: 0,
              missions: [],
            }],
          }],
        },
        p2: {
          projetId: 'p2',
          phases: [{
            id: 'phase-1',
            nom: 'Phase 1',
            ordre: 1,
            statut: 'EN_COURS',
            pourcentageAvancement: 25,
            etapes: [{
              id: 'step-1',
              nom: 'Étape 1',
              ordre: 1,
              obligatoire: true,
              statut: 'VALIDEE',
              pourcentageAvancement: 100,
              missions: [],
            }],
          }],
        },
        p3: {
          projetId: 'p3',
          phases: [{
            id: 'phase-1',
            nom: 'Phase 1',
            ordre: 1,
            statut: 'EN_COURS',
            pourcentageAvancement: 25,
            etapes: [{
              id: 'step-1',
              nom: 'Étape 1',
              ordre: 1,
              obligatoire: true,
              statut: 'VERROUILLEE',
              motif: 'Prérequis non satisfait',
              pourcentageAvancement: 0,
              missions: [],
            }],
          }],
        },
        p4: {
          projetId: 'p4',
          phases: [{
            id: 'phase-1',
            nom: 'Phase 1',
            ordre: 1,
            statut: 'VERROUILLEE',
            pourcentageAvancement: 0,
            etapes: [],
          }],
        },
      }),
    });
    return component;
  }

  it('compte les statuts du suivi, y compris les projets non encore assignés', () => {
    const component = createComponentForStatusChecks();
    const mission = {
      id: 'm1',
      titre: 'Mission de suivi',
      attendus: [],
      suivis: [
        { id: 'mp1', projetId: 'p1', titre: 'Suivi 1', statut: 'SOUMIS' },
        { id: 'mp2', projetId: 'p2', titre: 'Suivi 2', statut: 'VALIDE' },
        { id: 'mp3', projetId: 'p3', titre: 'Suivi 3', statut: 'A_REVOIR' },
      ] as Mission[],
    };

    expect(component.nombreStatutMission(mission, 'SOUMIS')).toBe(1);
    expect(component.nombreStatutMission(mission, 'VALIDE')).toBe(1);
    expect(component.nombreStatutMission(mission, 'A_CORRIGER')).toBe(1);
    expect(component.nombreStatutMission(mission, 'NON_SOUMIS')).toBe(1);
  });

  it('signale comme en retard uniquement les suivis non soumis après échéance', () => {
    const component = createComponentForStatusChecks();
    const mission = {
      id: 'm1',
      titre: 'Mission échue',
      dateEcheance: '2000-01-01',
      attendus: [],
      suivis: [
        { id: 'mp1', projetId: 'p1', titre: 'Soumis en retard', statut: 'SOUMIS' },
        { id: 'mp2', projetId: 'p2', titre: 'Déjà validé', statut: 'VALIDE' },
        { id: 'mp3', projetId: 'p3', titre: 'À corriger', statut: 'A_REVOIR' },
      ] as Mission[],
    };

    expect(component.nombreStatutMission(mission, 'EN_RETARD')).toBe(1);
    expect(component.nombreStatutMission(mission, 'SOUMIS')).toBe(1);
    expect(component.nombreStatutMission(mission, 'VALIDE')).toBe(1);
    expect(component.nombreStatutMission(mission, 'A_CORRIGER')).toBe(1);
  });

  it('ne marque pas comme en retard une échéance fixée à aujourd’hui', () => {
    const component = createComponentForStatusChecks();
    const mission = {
      id: 'm1',
      titre: 'Mission à échéance aujourd’hui',
      dateEcheance: new Date().toISOString().slice(0, 10),
      attendus: [],
      suivis: [
        { id: 'mp1', projetId: 'p1', titre: 'En cours', statut: 'EN_COURS' },
      ] as Mission[],
    };

    expect(component.nombreStatutMission(mission, 'EN_RETARD')).toBe(0);
    expect(component.nombreStatutMission(mission, 'NON_SOUMIS')).toBe(4);
  });

  it('affiche l’accessibilité par projet selon la feuille de route existante', () => {
    const component = createComponentForStatusChecks();

    expect(component.nombreStatutPhase('EN_COURS')).toBe(3);
    expect(component.nombreStatutPhase('VERROUILLEE')).toBe(1);
    expect(component.nombreStatutEtape('step-1', 'ACTIVE')).toBe(1);
    expect(component.nombreStatutEtape('step-1', 'VALIDEE')).toBe(1);
    expect(component.nombreStatutEtape('step-1', 'VERROUILLEE')).toBe(1);
    expect(component.libelleAcces(component.statutEtapeProjet('p3', 'step-1'))).toBe('Verrouillée');
    expect(component.motifEtapeProjet('p3', 'step-1')).toBe('Prérequis non satisfait');
  });
});
