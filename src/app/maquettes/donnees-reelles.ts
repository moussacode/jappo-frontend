import { Injector } from '@angular/core';
import { Observable, map, of, switchMap } from 'rxjs';

import { CohorteService } from '../core/services/cohorte.service';
import { ProgrammeService } from '../core/services/programme.service';
import { ParcoursService } from '../core/services/parcours.service';
import { EtapeService } from '../core/services/etape.service';
import { EntrepreneurService } from '../core/services/entrepreneur.service';
import { MissionService } from '../core/services/mission.service';
import { ProjetService } from '../core/services/projet.service';
import { SuperAdminService } from '../core/services/super-admin.service';
import { MqDonnees, MqResolveur } from './kit/mq-page';

/*
 * Résolveurs de données réelles : chaque écran de détail reçoit le premier
 * élément existant du compte connecté (lecture seule, aucune écriture).
 */

const premier = <T>(source: Observable<T[]>, vers: (x: T) => MqDonnees, filtre: (x: T) => boolean = () => true) =>
  source.pipe(map((liste) => {
    const x = (liste ?? []).find(filtre);
    return x ? vers(x) : null;
  }));

const nonArchive = (x: { archive?: boolean }) => !x.archive;

export const R = {
  cohorte: ((i: Injector) =>
    premier(i.get(CohorteService).getCohortes(), (c) => ({ id: c.id, cohorte: c }))) as MqResolveur,

  programme: ((i: Injector) =>
    premier(i.get(ProgrammeService).getAllProgrammes(), (p) => ({ id: p.id }), nonArchive)) as MqResolveur,

  parcoursDeProgramme: ((i: Injector) =>
    premier(
      i.get(ParcoursService).getAllParcours(),
      (p) => ({ programmeId: p.programmeId!, parcoursId: p.id }),
      (p) => !p.archive && !!p.programmeId,
    )) as MqResolveur,

  etape: ((i: Injector) => premier(i.get(EtapeService).getAllEtapes(), (e) => ({ id: e.id }), nonArchive)) as MqResolveur,

  entrepreneur: ((i: Injector) =>
    premier(i.get(EntrepreneurService).getEntrepreneurs(), (e) => ({ id: e.id }))) as MqResolveur,

  missionSuivie: ((i: Injector) => premier(i.get(MissionService).getMissions(), (m) => ({ id: m.id }))) as MqResolveur,

  missionCohorte: ((i: Injector) =>
    premier(i.get(MissionService).getMissionsCohorteAgregees(), (m) => ({ id: m.id }))) as MqResolveur,

  projet: ((i: Injector) => premier(i.get(ProjetService).getProjets(), (p) => ({ id: p.id }), nonArchive)) as MqResolveur,

  structure: ((i: Injector) =>
    premier(i.get(SuperAdminService).getStructures(), (s) => ({ id: s.id }))) as MqResolveur,

  /** Projet de l'entrepreneur connecté. */
  monProjet: ((i: Injector) =>
    premier(i.get(ProjetService).getMesProjets(), (p) => ({ id: p.id }))) as MqResolveur,

  /** Première mission du projet de l'entrepreneur connecté. */
  maMission: ((i: Injector) =>
    i.get(ProjetService).getMesProjets().pipe(
      switchMap((projets) =>
        projets?.[0] ? premier(i.get(MissionService).getByProjet(projets[0].id), (m) => ({ id: m.id })) : of(null),
      ),
    )) as MqResolveur,
};
