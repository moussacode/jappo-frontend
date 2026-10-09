import { describe, expect, it } from 'vitest';
import { getMissionSourceLabel, MissionProjet } from './mission.model';

describe('MissionProjet DTO', () => {
  it('should expose the backend MissionResponse fields without inventing extra ones', () => {
    const mission: MissionProjet = {
      id: '11111111-1111-4111-8111-111111111111',
      missionCohorteId: '22222222-2222-4222-8222-222222222222',
      missionEtapeId: '33333333-3333-4333-8333-333333333333',
      titre: 'Mission test',
      description: 'Description',
      dateEcheance: '2026-10-15',
      statut: 'A_FAIRE',
      priorite: 'MOYENNE',
      projetId: '44444444-4444-4444-8444-444444444444',
      nomProjet: 'Projet test',
      cohorteId: '55555555-5555-4555-8555-555555555555',
      nomCohorte: 'Cohorte test',
      entrepreneurId: '66666666-6666-4666-8666-666666666666',
      nomEntrepreneur: 'Entrepreneur',
      assigneAId: '77777777-7777-4777-8777-777777777777',
      nomAssigneA: 'Coach',
      creeParId: '88888888-8888-4888-8888-888888888888',
      nomCreePar: 'Admin',
      structureId: '99999999-9999-4999-8999-999999999999',
      dateCreation: '2026-09-30T10:00:00',
      dateModification: '2026-10-01T10:00:00',
      nombreLivrablesAttendus: 2,
      nombreLivrablesDeposes: 1,
    };

    expect(mission.id).toBeTruthy();
    expect(mission.titre).toBe('Mission test');
    expect(mission.missionEtapeId).toBeTruthy();
    expect(mission.nombreLivrablesAttendus).toBe(2);
    expect(getMissionSourceLabel(mission)).toBe('Mission d’étape');
  });

  it('should identify step-based missions independently from legacy cohort missions', () => {
    expect(getMissionSourceLabel({ missionEtapeId: 'step-id', missionCohorteId: null })).toBe('Mission d’étape');
    expect(getMissionSourceLabel({ missionEtapeId: null, missionCohorteId: 'cohorte-id' })).toBe('Mission de cohorte');
    expect(getMissionSourceLabel({ missionEtapeId: null, missionCohorteId: null })).toBe('Mission');
  });
});
