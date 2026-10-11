import '@angular/compiler';
import { signal, WritableSignal } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { LivrableResponse } from '../../../../core/models/livrable.model';
import { Mission } from '../../../../core/models/mission.model';
import { LivrableItem, MissionDetail } from './mission-detail';

interface MissionDetailTestHarness {
  mission: WritableSignal<Mission | undefined>;
  livrablesExistants: WritableSignal<LivrableResponse[]>;
  items: WritableSignal<LivrableItem[]>;
  reponsesBmc: WritableSignal<Record<string, Record<string, string>>>;
  remiseCompatibleAvecAttendu(item: LivrableItem): boolean;
  formatCompatiblePourRedepot(livrable: LivrableResponse, type: string): boolean;
  modifierReponseBmc(attenduId: string, champId: string, valeur: string): void;
  reponseBmcComplete(attendu: NonNullable<Mission['livrablesAttendus']>[number]): boolean;
  ajouterReponseBmc(attendu: NonNullable<Mission['livrablesAttendus']>[number]): void;
}

describe('MissionDetail formats de remise', () => {
  function createComponent(): MissionDetailTestHarness {
    const component = Object.create(MissionDetail.prototype) as unknown as MissionDetailTestHarness;
    Object.assign(component, {
      mission: signal({
        id: 'mission-1',
        titre: 'Mission de test',
        statut: 'EN_COURS',
        livrablesAttendus: [
          { id: 'expected-file', titre: 'Document', type: 'FICHIER', obligatoire: true },
          { id: 'expected-text', titre: 'Questionnaire', type: 'TEXTE', obligatoire: true },
          {
            id: 'expected-template',
            titre: 'BMC',
            type: 'TEMPLATE',
            templateType: 'BMC',
            templateFields: [{ id: 'value', label: 'Proposition de valeur' }],
            obligatoire: true,
          },
        ],
      } as Mission),
      livrablesExistants: signal([]),
      items: signal([]),
    });
    return component;
  }

  it('requiert un attendu et vérifie le type avant la soumission', () => {
    const component = createComponent();
    const fileWithoutExpected = {
      id: 'queued-file',
      type: 'fichier',
      titre: 'Document.pdf',
      valeur: 'Document.pdf',
    } as const;
    const textForFileExpected = {
      ...fileWithoutExpected,
      id: 'queued-text',
      type: 'texte',
      livrableAttenduId: 'expected-file',
    } as const;
    const textForTextExpected = {
      ...textForFileExpected,
      livrableAttenduId: 'expected-text',
    } as const;

    expect(component.remiseCompatibleAvecAttendu(fileWithoutExpected)).toBe(false);
    expect(component.remiseCompatibleAvecAttendu(textForFileExpected)).toBe(false);
    expect(component.remiseCompatibleAvecAttendu(textForTextExpected)).toBe(true);
  });

  it('autorise un fichier ou un lien pour un modèle, mais pas une réponse texte', () => {
    const component = createComponent();
    component.mission.update((mission) => {
      if (!mission) return undefined;
      return {
        ...mission,
        livrablesAttendus: mission.livrablesAttendus?.map((attendu) => attendu.id === 'expected-template'
          ? { ...attendu, templateFields: undefined }
          : attendu),
      };
    });
    const expectedTemplate = {
      id: 'livrable-bmc',
      nom: 'BMC complété',
      url: 'https://files.test/bmc.pdf',
      typePiece: 'FICHIER',
      statut: 'A_CORRIGER',
      missionProjetId: 'mission-1',
      projetId: 'projet-1',
      livrableAttenduId: 'expected-template',
    } as LivrableResponse;

    expect(component.formatCompatiblePourRedepot(expectedTemplate, 'FICHIER')).toBe(true);
    expect(component.formatCompatiblePourRedepot(expectedTemplate, 'LIEN')).toBe(true);
    expect(component.formatCompatiblePourRedepot(expectedTemplate, 'TEXTE')).toBe(false);
  });

  it('rattache la réponse BMC structurée à son attendu', () => {
    const component = createComponent();
    Object.assign(component, { reponsesBmc: signal({}) });
    const attendu = component.mission()?.livrablesAttendus?.find((item) => item.id === 'expected-template');
    if (!attendu) throw new Error('Expected BMC fixture not found');
    const fileSubmission = {
      id: 'queued-file',
      type: 'fichier',
      titre: 'BMC.pdf',
      valeur: 'BMC.pdf',
      livrableAttenduId: attendu.id,
    } as const;

    expect(component.remiseCompatibleAvecAttendu(fileSubmission)).toBe(false);
    component.modifierReponseBmc(attendu.id, 'value', 'Accompagnement des PME');
    expect(component.reponseBmcComplete(attendu)).toBe(true);

    component.ajouterReponseBmc(attendu);

    const [item] = component.items();
    expect(item.type).toBe('template');
    expect(item.livrableAttenduId).toBe(attendu.id);
    expect(item.valeur).toBe(JSON.stringify({ value: 'Accompagnement des PME' }));
  });
});
