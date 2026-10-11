import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { StatutMission, PrioriteMission, MissionCohorteResponse } from '../../../../core/models/mission.model';
import { EtapeService } from '../../../../core/services/etape.service';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { ProgrammeService } from '../../../../core/services/programme.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { Cohorte, Parcours } from '../../../../core/models/cohorte.model';
import { Etape, MissionEtape, Programme } from '../../../../core/models/parcours.model';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { MissionCreateModalComponent } from "../mission-create/mission-create";
import { Icon } from '../../../../shared/components/icon/icon';

// Modale de création

export type FiltreStatutMission = 'TOUTES' | 'EN_COURS' | 'A_REVOIR' | 'VALIDEE';

interface MissionListeItem {
  id: string;
  source: 'COHORTE' | 'ETAPE';
  titre: string;
  description?: string | null;
  dateEcheance?: string | null;
  priorite?: PrioriteMission;
  programmeIds: string[];
  programmeNoms: string[];
  phaseId?: string;
  phaseNom?: string;
  etapeId?: string;
  etapeNom?: string;
  cohorteIds: string[];
  cohorteNoms: string[];
  nombreProjetsConcernes?: number;
  nombreValides?: number;
  nombreEnRevue?: number;
  nombreEnRetard?: number;
  nombreAFaire?: number;
}

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    Icon,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    ErrorState,
    TabFilterComponent,
    MissionCreateModalComponent
],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
<app-page-header
  title="Activités"
  subtitle="Retrouvez les missions des programmes et des cohortes, puis filtrez-les par programme, phase, étape ou cohorte."
  breadcrumb="Incubateur > Suivi des missions"
>
  <div class="flex items-center gap-2">
    <app-button size="sm" (click)="showCreateModal.set(true)">
      <app-icon name="plus" class="size-4 mr-1.5 text-white" />
      <span class="hidden sm:inline">Nouvelle mission</span>
    </app-button>
  </div>
</app-page-header>

      <!-- Recherche et filtres de contexte -->
      <div class="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label class="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Programme
            <select [value]="filtreProgramme()" (change)="changerProgramme($event)"
              class="w-full rounded-input border border-input-border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Tous les programmes</option>
              @for (programme of optionsProgrammes(); track programme.id) {
                <option [value]="programme.id">{{ programme.nom }}</option>
              }
            </select>
          </label>

          <label class="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Phase
            <select [value]="filtrePhase()" (change)="changerPhase($event)"
              class="w-full rounded-input border border-input-border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Toutes les phases</option>
              @for (phase of optionsPhases(); track phase.id) {
                <option [value]="phase.id">{{ phase.nom }}</option>
              }
            </select>
          </label>

          <label class="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Étape
            <select [value]="filtreEtape()" (change)="filtreEtape.set(valeurFiltre($event))"
              class="w-full rounded-input border border-input-border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Toutes les étapes</option>
              @for (etape of optionsEtapes(); track etape.id) {
                <option [value]="etape.id">{{ etape.nom }}</option>
              }
            </select>
          </label>

          <label class="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Cohorte
            <select [value]="filtreCohorte()" (change)="filtreCohorte.set(valeurFiltre($event))"
              class="w-full rounded-input border border-input-border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="">Toutes les cohortes</option>
              @for (cohorte of optionsCohortes(); track cohorte.id) {
                <option [value]="cohorte.id">{{ cohorte.nom }}</option>
              }
            </select>
          </label>

          <label class="flex flex-col gap-1.5 text-xs font-medium text-ink-muted">
            Rechercher
            <span class="relative">
              <input
                type="search"
                [formControl]="searchControl"
                placeholder="Nom, description, contexte..."
                class="w-full rounded-input border border-input-border bg-surface py-2.5 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
            </span>
          </label>
        </div>

        <div class="flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
          <app-tab-filter
            [options]="optionsFiltreStatut()"
            [value]="filtreStatut()"
            (valueChange)="filtreStatut.set($event)"
          />
          <div class="flex items-center justify-between gap-3 text-xs text-ink-muted sm:justify-end">
            <span>{{ missionsFiltrees().length }} mission(s)</span>
            @if (filtresActifs()) {
              <button type="button" (click)="reinitialiserFiltres()"
                class="font-semibold text-accent hover:text-accent-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                Effacer les filtres
              </button>
            }
          </div>
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <app-card padding="lg" class="animate-pulse">
          <div class="h-5 w-1/3 rounded bg-line"></div>
          <div class="mt-4 h-10 rounded bg-line/40"></div>
          <div class="mt-2 h-10 rounded bg-line/40"></div>
          <div class="mt-2 h-10 rounded bg-line/40"></div>
        </app-card>
      } @else if (loadError()) {
        <app-error-state
          title="Impossible de charger les missions"
          [description]="loadError()!"
          actionLabel="Réessayer"
          (retry)="chargerMissions()"
        />
      } @else {

        <!-- Liste tabulaire : missions de cohorte et missions des étapes -->
        <app-card padding="none">
          <div class="table-responsive">
            <table class="w-full min-w-190 text-sm">
              <thead class="border-b border-line bg-surface-subtle text-left text-xs font-semibold text-ink-muted">
                <tr>
                  <th scope="col" class="px-4 py-3">Mission</th>
                  <th scope="col" class="px-4 py-3">Programme / phase / étape</th>
                  <th scope="col" class="px-4 py-3">Cohorte</th>
                  <th scope="col" class="px-4 py-3">Échéance</th>
                  <th scope="col" class="px-4 py-3">Suivi</th>
                  <th scope="col" class="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (mission of missionsFiltrees(); track mission.source + ':' + mission.id) {
                  <tr class="align-top transition-colors hover:bg-surface-subtle">
                    <td class="max-w-sm px-4 py-3">
                      <a [routerLink]="lienMission(mission)"
                        class="font-semibold text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                        {{ mission.titre }}
                      </a>
                      @if (mission.description) {
                        <p class="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">{{ mission.description }}</p>
                      }
                      <div class="mt-2 flex flex-wrap items-center gap-2">
                        <app-badge [status]="mission.source === 'ETAPE' ? 'info' : 'neutral'" size="sm">
                          {{ mission.source === 'ETAPE' ? 'Mission de programme' : 'Mission de cohorte' }}
                        </app-badge>
                        @if (mission.priorite) {
                          <app-badge [status]="badgePrioriteStatus(mission.priorite)" size="sm">
                            {{ prioriteLabel(mission.priorite) }}
                          </app-badge>
                        }
                      </div>
                    </td>
                    <td class="px-4 py-3 text-xs">
                      @if (mission.programmeNoms.length > 0) {
                        <p class="font-medium text-ink">{{ mission.programmeNoms.join(', ') }}</p>
                      } @else {
                        <p class="text-ink-faint">Programme non renseigné</p>
                      }
                      @if (mission.phaseNom) {
                        <p class="mt-1 text-ink-muted">{{ mission.phaseNom }}</p>
                      }
                      @if (mission.etapeNom) {
                        <p class="mt-1 text-ink-faint">{{ mission.etapeNom }}</p>
                      }
                    </td>
                    <td class="px-4 py-3">
                      @if (mission.cohorteNoms.length > 0) {
                        <div class="flex flex-wrap gap-1.5">
                          @for (nomCohorte of mission.cohorteNoms; track nomCohorte) {
                            <app-badge status="neutral" size="sm">{{ nomCohorte }}</app-badge>
                          }
                        </div>
                      } @else {
                        <span class="text-xs text-ink-faint">Aucune cohorte associée</span>
                      }
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 text-xs text-ink-muted">
                      {{ mission.dateEcheance ? (mission.dateEcheance | date:'dd/MM/yyyy') : '—' }}
                    </td>
                    <td class="px-4 py-3">
                      @if (mission.source === 'COHORTE') {
                        <div class="flex flex-col items-start gap-1">
                          <app-badge [status]="badgeStatusAgrege(mission)" size="sm">
                            {{ formaterStatutAgrege(mission) }}
                          </app-badge>
                          <span class="text-xs text-ink-muted">
                            {{ mission.nombreValides ?? 0 }}/{{ mission.nombreProjetsConcernes ?? 0 }} validés
                          </span>
                          @if (estEnRetard(mission)) {
                            <span class="text-xs font-medium text-danger">{{ mission.nombreEnRetard }} en retard</span>
                          }
                        </div>
                      } @else {
                        <span class="text-xs text-ink-muted">Définie pour l’étape</span>
                      }
                    </td>
                    <td class="whitespace-nowrap px-4 py-3 text-right">
                      @if (mission.source === 'COHORTE') {
                        <button type="button" (click)="archiverMission(mission.id, $event)"
                          class="rounded-button px-2 py-1 text-xs font-semibold text-ink-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          title="Archiver cette mission">
                          Archiver
                        </button>
                      } @else {
                        <a [routerLink]="lienMission(mission)"
                          class="text-xs font-semibold text-accent hover:text-accent-strong hover:underline">
                          Voir l’étape
                        </a>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="6" class="p-0">
              <app-empty-state
                title="Aucune mission trouvée"
                description="Ajustez les filtres ou créez une mission pour une cohorte."
                iconName="missions"
              >
                <app-button size="xs" (click)="showCreateModal.set(true)">
                  <app-icon name="plus" class="size-3.5" />
                  <span>Créer une mission</span>
                </app-button>
              </app-empty-state>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-card>
      }

    </div>

    <!-- Modale de Création de Mission -->
    @if (showCreateModal()) {
      <app-mission-create-modal
        (close)="showCreateModal.set(false)"
        (created)="chargerMissions(); showCreateModal.set(false)"
      />
    }
  `,
})
export class MissionsList implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly missionService = inject(MissionService);
  private readonly etapeService = inject(EtapeService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly programmeService = inject(ProgrammeService);
  private readonly cohorteService = inject(CohorteService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly missionsCohorte = signal<MissionCohorteResponse[]>([]);
  protected readonly missionsListe = signal<MissionListeItem[]>([]);
  protected readonly etapes = signal<Etape[]>([]);
  protected readonly parcours = signal<Parcours[]>([]);
  protected readonly programmes = signal<Programme[]>([]);
  protected readonly cohortes = signal<Cohorte[]>([]);
  protected readonly filtreStatut = signal<FiltreStatutMission>('TOUTES');
  protected readonly filtreProgramme = signal('');
  protected readonly filtrePhase = signal('');
  protected readonly filtreEtape = signal('');
  protected readonly filtreCohorte = signal('');
  protected readonly showCreateModal = signal<boolean>(false);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

protected readonly compteEnCours = computed(() =>
  this.missionsCohorte().filter(
    (m) => m.nombreAFaire > 0
  ).length
);

protected readonly compteARevoir = computed(() =>
  this.missionsCohorte().filter(
    (m) => m.nombreEnRevue > 0
  ).length
);

protected readonly compteValidees = computed(() =>
  this.missionsCohorte().filter(
    (m) => m.nombreValides > 0
  ).length
);

protected readonly optionsFiltreStatut =
  computed<TabOption<FiltreStatutMission>[]>(() => [
    {
      value: 'TOUTES',
      label: 'Toutes',
      count: this.missionsListe().length,
    },
    {
      value: 'EN_COURS',
      label: 'En cours',
      count: this.compteEnCours(),
    },
    {
      value: 'A_REVOIR',
      label: 'À revoir',
      count: this.compteARevoir(),
    },
    {
      value: 'VALIDEE',
      label: 'Validées',
      count: this.compteValidees(),
    },
  ]);

  protected readonly optionsProgrammes = computed(() =>
    this.programmes().filter(programme => !programme.archive)
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  );

  protected readonly optionsPhases = computed(() => {
    const programmeId = this.filtreProgramme();
    const programme = this.programmes().find(item => item.id === programmeId);
    const phases = this.parcours()
      .filter(parcours => !parcours.archive
        && (!programmeId || parcours.programmeId === programmeId || !!programme?.parcoursIds.includes(parcours.id)))
      .flatMap(parcours => parcours.phases ?? [])
      .filter(phase => !phase.archive);
    return [...new Map(phases.map(phase => [phase.id, phase])).values()]
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0) || a.nom.localeCompare(b.nom, 'fr'));
  });

  protected readonly optionsEtapes = computed(() => {
    const phaseId = this.filtrePhase();
    if (!phaseId) return [];
    return this.etapes().filter(etape => !etape.archive && etape.phaseId === phaseId)
      .sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, 'fr'));
  });

  protected readonly optionsCohortes = computed(() =>
    this.cohortes().filter(cohorte => cohorte.statut !== 'ARCHIVEE')
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  );

  protected readonly filtresActifs = computed(() =>
    !!this.filtreProgramme()
      || !!this.filtrePhase()
      || !!this.filtreEtape()
      || !!this.filtreCohorte()
      || !!this.searchTerm().trim()
      || this.filtreStatut() !== 'TOUTES',
  );

  protected readonly missionsFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    const programmeId = this.filtreProgramme();
    const phaseId = this.filtrePhase();
    const etapeId = this.filtreEtape();
    const cohorteId = this.filtreCohorte();

    return this.missionsListe().filter(mission => {
      const matchStatut = filtre === 'TOUTES'
        || (mission.source === 'COHORTE' && (
          (filtre === 'EN_COURS' && (mission.nombreAFaire ?? 0) > 0)
          || (filtre === 'A_REVOIR' && (mission.nombreEnRevue ?? 0) > 0)
          || (filtre === 'VALIDEE' && (mission.nombreValides ?? 0) > 0)
        ));
      const matchContexte = (!programmeId || mission.programmeIds.includes(programmeId))
        && (!phaseId || mission.phaseId === phaseId)
        && (!etapeId || mission.etapeId === etapeId)
        && (!cohorteId || mission.cohorteIds.includes(cohorteId));
      const contenuRecherche = [
        mission.titre,
        mission.description ?? '',
        ...mission.cohorteNoms,
        mission.phaseNom ?? '',
        mission.etapeNom ?? '',
        ...mission.programmeNoms,
      ].join(' ').toLowerCase();
      return matchStatut && matchContexte && (!term || contenuRecherche.includes(term));
    });
  });

  ngOnInit(): void {
    const cohortId = this.route.snapshot.queryParamMap.get('cohorteId');
    if (cohortId) this.filtreCohorte.set(cohortId);
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    this.chargerMissions();
  }

  protected chargerMissions(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    forkJoin({
      missionsCohorte: this.missionService.getMissionsCohorteAgregees(),
      programmes: this.programmeService.getAllProgrammes(),
      parcours: this.parcoursService.getAllParcours(),
      etapes: this.etapeService.getAllEtapes(),
      cohortes: this.cohorteService.getCohortes(),
    })
      .pipe(
        switchMap(data => {
          const etapesActives = data.etapes.filter(etape => !etape.archive);
          const requests = etapesActives.map(etape =>
            this.etapeService.getMissionsByEtapeId(etape.id).pipe(
              catchError(error => {
                console.error(`Erreur chargement des missions de l’étape ${etape.id}:`, error);
                return of([] as MissionEtape[]);
              }),
            ),
          );
          return (requests.length ? forkJoin(requests) : of([] as MissionEtape[][]))
            .pipe(map(missionsEtape => ({
              ...data,
              etapes: etapesActives,
              missionsEtape: missionsEtape.flat(),
            })));
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (data) => {
          this.missionsCohorte.set(data.missionsCohorte);
          this.programmes.set(data.programmes);
          this.parcours.set(data.parcours);
          this.etapes.set(data.etapes);
          this.cohortes.set(data.cohortes);
          this.missionsListe.set(this.construireListeMissions(data));
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement de la liste des missions:', err);
          this.loadError.set('Vérifiez votre connexion puis réessayez. Les missions et leurs filtres de programme n’ont pas pu être chargés.');
          this.isLoading.set(false);
        },
      });
  }

  private construireListeMissions(data: {
    missionsCohorte: MissionCohorteResponse[];
    missionsEtape: MissionEtape[];
    programmes: Programme[];
    parcours: Parcours[];
    etapes: Etape[];
    cohortes: Cohorte[];
  }): MissionListeItem[] {
    const cohortesParId = new Map(data.cohortes.map(cohorte => [cohorte.id, cohorte]));
    const etapesParId = new Map(data.etapes.map(etape => [etape.id, etape]));
    const programmesParId = new Map(data.programmes.map(programme => [programme.id, programme]));
    const parcoursParId = new Map(data.parcours.map(parcours => [parcours.id, parcours]));
    const parcoursPourPhase = (phaseId?: string) =>
      phaseId ? data.parcours.filter(parcours => parcours.phases?.some(phase => phase.id === phaseId)) : [];
    const contextProgrammes = (parcours: Parcours[]) => {
      const programmeIds = [...new Set(parcours
        .map(item => item.programmeId
          ?? data.programmes.find(programme => programme.parcoursIds.includes(item.id))?.id)
        .filter((id): id is string => !!id))];
      return {
        programmeIds,
        programmeNoms: programmeIds
          .map(id => programmesParId.get(id)?.nom)
          .filter((nom): nom is string => !!nom),
      };
    };

    const missionsCohorte = data.missionsCohorte.map(mission => {
      const cohorte = mission.cohorteId ? cohortesParId.get(mission.cohorteId) : undefined;
      const etape = mission.etapeId ? etapesParId.get(mission.etapeId) : undefined;
      const phaseId = etape?.phaseId ?? cohorte?.phaseId ?? cohorte?.phase?.id;
      const parcours = cohorte?.parcoursId
        ? [parcoursParId.get(cohorte.parcoursId)].filter((item): item is Parcours => !!item)
        : parcoursPourPhase(phaseId);
      const programmeContext = contextProgrammes(parcours);
      const cohorteIds = cohorte ? [cohorte.id] : mission.cohorteId ? [mission.cohorteId] : [];
      const cohorteNoms = cohorte ? [cohorte.nom] : mission.nomCohorte ? [mission.nomCohorte] : [];
      return {
        id: mission.id,
        source: 'COHORTE' as const,
        titre: mission.titre,
        description: mission.description,
        dateEcheance: mission.dateEcheance,
        priorite: mission.priorite,
        ...programmeContext,
        phaseId,
        phaseNom: parcours.flatMap(item => item.phases ?? []).find(phase => phase.id === phaseId)?.nom
          ?? (phaseId ? data.parcours.flatMap(item => item.phases ?? []).find(phase => phase.id === phaseId)?.nom : undefined),
        etapeId: mission.etapeId ?? undefined,
        etapeNom: etape?.nom ?? mission.nomEtape,
        cohorteIds,
        cohorteNoms,
        nombreProjetsConcernes: mission.nombreProjetsConcernes,
        nombreValides: mission.nombreValides,
        nombreEnRevue: mission.nombreEnRevue,
        nombreEnRetard: mission.nombreEnRetard,
        nombreAFaire: mission.nombreAFaire,
      };
    });

    const missionsEtape = data.missionsEtape.map(mission => {
      const etape = etapesParId.get(mission.etapeId);
      const phaseId = etape?.phaseId ?? mission.phaseId ?? undefined;
      const parcours = parcoursPourPhase(phaseId);
      const programmeContext = contextProgrammes(parcours);
      const parcoursIds = new Set(parcours.map(item => item.id));
      const cohortesAssociees = data.cohortes.filter(cohorte =>
        (cohorte.phaseId ?? cohorte.phase?.id) === phaseId
        && !!cohorte.parcoursId
        && parcoursIds.has(cohorte.parcoursId),
      );
      return {
        id: mission.id,
        source: 'ETAPE' as const,
        titre: mission.titre,
        description: mission.description,
        ...programmeContext,
        phaseId,
        phaseNom: data.parcours.flatMap(item => item.phases ?? []).find(phase => phase.id === phaseId)?.nom,
        etapeId: mission.etapeId,
        etapeNom: etape?.nom,
        cohorteIds: cohortesAssociees.map(cohorte => cohorte.id),
        cohorteNoms: cohortesAssociees.map(cohorte => cohorte.nom),
      };
    });

    return [...missionsCohorte, ...missionsEtape].sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
  }

  protected valeurFiltre(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  protected changerProgramme(event: Event): void {
    this.filtreProgramme.set(this.valeurFiltre(event));
    this.filtrePhase.set('');
    this.filtreEtape.set('');
  }

  protected changerPhase(event: Event): void {
    this.filtrePhase.set(this.valeurFiltre(event));
    this.filtreEtape.set('');
  }

  protected reinitialiserFiltres(): void {
    this.filtreProgramme.set('');
    this.filtrePhase.set('');
    this.filtreEtape.set('');
    this.filtreCohorte.set('');
    this.filtreStatut.set('TOUTES');
    this.searchControl.setValue('');
    this.searchTerm.set('');
  }

  protected lienMission(mission: MissionListeItem): string[] {
    return mission.source === 'COHORTE'
      ? ['/incubateur/missions-cohorte', mission.id]
      : ['/incubateur/programmes/etapes', mission.etapeId ?? ''];
  }

  protected archiverMission(missionId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Archiver cette mission de cohorte et tous ses suivis individuels ?')) {
      return;
    }

    this.missionService
      .archiverMissionCohorte(missionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.missionsCohorte.update((liste) => liste.filter((m) => m.id !== missionId));
          this.missionsListe.update((liste) =>
            liste.filter((mission) => mission.source !== 'COHORTE' || mission.id !== missionId),
          );
        },
        error: (err) => {
          console.error('Erreur archivage mission:', err);
          alert('Erreur lors de l\'archivage de la mission');
        },
      });
  }

protected badgeStatus(statut: StatutMission): BadgeStatus {
  switch (statut) {
    
    case 'VALIDE':
      return 'success';

    case 'SOUMIS':
    case 'A_REVOIR':
      return 'warning';

    case 'EN_COURS':
      return 'primary';

    case 'A_FAIRE':
    default:
      return 'neutral';
  }
}

protected formaterStatut(statut: StatutMission): string {
  switch (statut) {
    
    case 'VALIDE':
      return 'Validée';

    case 'SOUMIS':
      return 'Soumise';

    case 'A_REVOIR':
      return 'À revoir';

    case 'EN_COURS':
      return 'En cours';

    case 'A_FAIRE':
    default:
      return 'À faire';
  }
}

protected formaterStatutAgrege(m: MissionCohorteResponse | MissionListeItem): string {
if ((m.nombreProjetsConcernes ?? 0) > 0 && m.nombreValides === m.nombreProjetsConcernes) {
    return 'Complétée';
} else if ((m.nombreEnRevue ?? 0) > 0) {
    return 'En revue';
} else if ((m.nombreEnRetard ?? 0) > 0) {
    return 'En retard';
  } else {
    return 'En cours';
  }
}

protected badgeStatusAgrege(m: MissionCohorteResponse | MissionListeItem): BadgeStatus {
if ((m.nombreProjetsConcernes ?? 0) > 0 && m.nombreValides === m.nombreProjetsConcernes) {
    return 'success';
} else if ((m.nombreEnRevue ?? 0) > 0) {
    return 'warning';
} else if ((m.nombreEnRetard ?? 0) > 0) {
    return 'danger';
  } else {
    return 'primary';
  }
}

protected calculerProgression(m: MissionCohorteResponse): number {
  if (m.nombreProjetsConcernes === 0) return 0;
  return Math.round((m.nombreValides / m.nombreProjetsConcernes) * 100);
}
 

  protected badgePrioriteStatus(priorite?: PrioriteMission): BadgeStatus {
    switch (priorite) {
      case 'URGENTE':
        return 'danger';
      case 'HAUTE':
        return 'warning';
      case 'MOYENNE':
        return 'neutral';
      case 'BASSE':
      default:
        return 'neutral';
    }
  }

  protected prioriteLabel(priorite?: PrioriteMission): string {
    switch (priorite) {
      case 'URGENTE':
        return 'Urgente';
      case 'HAUTE':
        return 'Haute';
      case 'MOYENNE':
        return 'Moyenne';
      case 'BASSE':
        return 'Basse';
      default:
        return priorite || 'Non définie';
    }
  }

  protected estEnRetard(m: MissionCohorteResponse | MissionListeItem): boolean {
    return (m.nombreEnRetard ?? 0) > 0;
  }
}