import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProgrammeService } from '../../../../core/services/programme.service';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { EtapeService } from '../../../../core/services/etape.service';
import { ProgrammeBrouillon } from './programme-brouillon';

export interface ProgressionCreation {
  faites: number;
  libelle: string;
}

export class ErreurCreation extends Error {
  constructor(
    message: string,
    /** Identifiant du programme si celui-ci a pu être créé avant l'échec. */
    readonly programmeId: string | null,
  ) {
    super(message);
  }
}

/**
 * Crée un programme complet à partir d'un brouillon, dans l'ordre imposé
 * par l'API : programme, parcours, puis pour chaque phase sa création, son
 * rattachement au parcours, ses étapes et leurs missions.
 */
@Injectable({ providedIn: 'root' })
export class ProgrammeCreationService {
  private readonly programmes = inject(ProgrammeService);
  private readonly parcours = inject(ParcoursService);
  private readonly phases = inject(PhaseService);
  private readonly etapes = inject(EtapeService);

  async creer(b: ProgrammeBrouillon, onProgression: (p: ProgressionCreation) => void): Promise<string> {
    let faites = 0;
    let programmeId: string | null = null;
    const etape = (libelle: string) => onProgression({ faites: ++faites, libelle });

    try {
      const programme = await firstValueFrom(
        this.programmes.createProgramme({ nom: b.nom.trim(), description: b.description.trim() || undefined }),
      );
      programmeId = programme.id;
      etape(`Programme « ${programme.nom} » créé`);

      const parcours = await firstValueFrom(
        this.parcours.createParcours({ nom: b.nomParcours.trim() || 'Parcours principal', programmeId: programme.id }),
      );
      etape(`Parcours « ${parcours.nom} » créé`);

      for (const phaseB of b.phases) {
        const phase = await firstValueFrom(
          this.phases.createPhase({ nom: phaseB.nom.trim(), description: phaseB.description.trim() || undefined }),
        );
        faites++; // création de la phase
        await firstValueFrom(this.parcours.ajouterPhase(parcours.id, phase.id));
        etape(`Phase « ${phase.nom} » ajoutée`);

        for (const [i, etapeB] of phaseB.etapes.entries()) {
          const etapeCreee = await firstValueFrom(
            this.etapes.createEtape({
              nom: etapeB.nom.trim(),
              ordre: i + 1,
              obligatoire: etapeB.obligatoire,
              phaseId: phase.id,
            }),
          );
          etape(`Étape « ${etapeCreee.nom} » ajoutée`);

          const missions = etapeB.missions.filter((m) => m.titre.trim());
          for (const [j, mission] of missions.entries()) {
            await firstValueFrom(
              this.etapes.createMission(etapeCreee.id, { titre: mission.titre.trim(), ordre: j + 1, obligatoire: true }),
            );
            etape(`Mission « ${mission.titre.trim()} » ajoutée`);
          }
        }
      }

      return programme.id;
    } catch (err: unknown) {
      const message =
        (err as { error?: { message?: string } })?.error?.message ??
        'La création a été interrompue. Vérifiez votre connexion puis complétez le programme depuis sa fiche.';
      throw new ErreurCreation(message, programmeId);
    }
  }
}
