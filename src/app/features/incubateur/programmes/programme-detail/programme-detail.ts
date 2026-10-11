import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ProgrammeService } from '../../../../core/services/programme.service';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { EtapeService } from '../../../../core/services/etape.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Programme, Etape } from '../../../../core/models/parcours.model';
import { Parcours, Phase, ParcoursPhase, CreateParcoursRequest } from '../../../../core/models/cohorte.model';
import { INPUT_CLASS } from '../constants';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { CardComponent } from '../../../../shared/components/card/card.component';

interface StatsParcours {
  phases: number;
  etapes: number;
}

@Component({
  selector: 'app-programme-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    RouterLink,
    Icon,
    ButtonComponent,
    EmptyStateComponent,
    BadgeComponent,
    ModalComponent,
    PageHeaderComponent,
    LoadingState,
    CardComponent,
  ],
  host: { '(document:keydown.escape)': 'menuOuvert.set(false)' },
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      @if (programme(); as prog) {
        <app-page-header
          [title]="prog.nom"
          [subtitle]="prog.description"
          [breadcrumb]="[{ label: 'Programmes', path: '/incubateur/programmes' }, { label: prog.nom }]"
        >
          @if (prog.archive) {
            <app-badge status="warning" size="md">Archivé</app-badge>
          }
          @if (isAdmin()) {
            <div class="relative">
              <app-button variant="secondary" size="sm" (click)="menuOuvert.set(!menuOuvert())">
                Actions <app-icon name="chevron-down" class="size-3.5" />
              </app-button>
              @if (menuOuvert()) {
                <div class="fixed inset-0 z-10" (click)="menuOuvert.set(false)"></div>
                <div class="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-subtle">
                  <button type="button" (click)="ouvrirEditionProgramme()" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-subtle cursor-pointer transition-colors">
                    <app-icon name="edit-2" class="size-4 text-ink-muted" /> Modifier
                  </button>
                  @if (prog.archive) {
                    <button type="button" (click)="restaurerProgramme()" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-subtle cursor-pointer transition-colors">
                      <app-icon name="rotate-ccw" class="size-4 text-ink-muted" /> Restaurer
                    </button>
                  } @else {
                    <button type="button" (click)="confirmationArchivage.set(true); menuOuvert.set(false)" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-subtle cursor-pointer transition-colors">
                      <app-icon name="archive" class="size-4 text-ink-muted" /> Archiver
                    </button>
                  }
                </div>
              }
            </div>
          }
        </app-page-header>
      }

      @if (erreurPage()) {
        <div class="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ erreurPage() }}</span>
        </div>
      }

      @if (loading()) {
        <div class="py-16">
          <app-loading-state text="Chargement du programme..."></app-loading-state>
        </div>
      } @else if (!programme()) {
        <app-empty-state iconName="alert-circle" title="Programme introuvable" description="Ce programme n'existe pas ou n'est plus accessible.">
          <app-button size="sm" (click)="retour()">Retour aux programmes</app-button>
        </app-empty-state>
      } @else {

        <!-- Barre de synthèse + actions -->
        <app-card padding="md">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-ink-muted">
              <span><strong class="text-ink">{{ parcoursDuProgramme().length }}</strong> parcours</span>
              <span><strong class="text-ink">{{ totaux().phases }}</strong> phases</span>
              <span><strong class="text-ink">{{ totaux().etapes }}</strong> étapes</span>
              <span class="flex items-center gap-1.5 text-xs">
                <app-icon name="calendar" class="size-3.5" />
                Modifié le {{ (programme()!.dateModification || programme()!.dateCreation) | date:'dd/MM/yyyy' }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              @if (parcoursDuProgramme().length > 0) {
                <app-button variant="ghost" size="xs" (click)="toutDeplier()">Tout déplier</app-button>
                <app-button variant="ghost" size="xs" (click)="toutReplier()">Tout replier</app-button>
              }
              @if (isAdmin()) {
                <app-button size="sm" (click)="ouvrirCreationParcours()">
                  <app-icon name="plus" class="size-4" /> Ajouter un parcours
                </app-button>
              }
            </div>
          </div>
        </app-card>

        @if (parcoursDuProgramme().length === 0) {
          <app-empty-state iconName="folder" title="Aucun parcours" description="Ce programme ne contient encore aucun parcours.">
            @if (isAdmin()) {
              <app-button size="sm" (click)="ouvrirCreationParcours()">
                <app-icon name="plus" class="size-4" /> Ajouter un parcours
              </app-button>
            }
          </app-empty-state>
        } @else {
          <div class="flex flex-col gap-4">
            @for (parcours of parcoursDuProgramme(); track parcours.id) {
              @let sp = statsParcours().get(parcours.id);
              <app-card padding="none" class="overflow-hidden">

                <!-- Parcours -->
                <div class="flex items-center gap-2 px-4 py-3 hover:bg-surface-subtle transition-colors sm:px-5">
                  <button
                    type="button"
                    (click)="toggleParcours(parcours.id)"
                    class="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    [attr.aria-expanded]="parcoursOuverts().has(parcours.id)"
                  >
                    <app-icon name="chevron-down" class="size-4 shrink-0 text-ink-muted transition-transform duration-200" [class.-rotate-90]="!parcoursOuverts().has(parcours.id)" />
                    <div class="min-w-0">
                      <h2 class="truncate text-base font-semibold text-ink">{{ parcours.nom }}</h2>
                      @if (parcours.description) {
                        <p class="line-clamp-1 text-xs text-ink-muted">{{ parcours.description }}</p>
                      }
                    </div>
                  </button>
                  <span class="hidden shrink-0 text-xs text-ink-muted sm:block">{{ sp?.phases ?? 0 }} phases · {{ sp?.etapes ?? 0 }} étapes</span>
                  @if (isAdmin()) {
                    <button type="button" (click)="ouvrirParcours(parcours.id)" class="shrink-0 rounded-lg px-2 py-1 text-xs text-ink-muted hover:bg-surface-subtle hover:text-accent transition-colors cursor-pointer" title="Gérer ce parcours en détail">
                      Gérer
                    </button>
                  }
                </div>

                @if (parcoursOuverts().has(parcours.id)) {
                  <div class="border-t border-line bg-surface-subtle px-3 py-3 sm:px-5">
                    @let phases = phasesDe(parcours);
                    @if (phases.length === 0) {
                      <p class="py-4 text-center text-sm text-ink-muted">Ce parcours ne contient encore aucune phase.</p>
                    } @else {
                      <div class="flex flex-col gap-3">
                        @for (phase of phases; track phase.id; let i = $index) {
                          <app-card padding="none">
                            <button
                              type="button"
                              (click)="togglePhase(parcours.id + ':' + phase.id)"
                              class="flex w-full items-center gap-3 px-4 py-2.5 text-left cursor-pointer hover:bg-surface-subtle transition-colors"
                              [attr.aria-expanded]="phasesOuvertes().has(parcours.id + ':' + phase.id)"
                            >
                              <app-icon name="chevron-down" class="size-3.5 shrink-0 text-ink-muted transition-transform duration-200" [class.-rotate-90]="!phasesOuvertes().has(parcours.id + ':' + phase.id)" />
                              <span class="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-accent">Phase {{ i + 1 }}</span>
                              <span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{{ phase.nom }}</span>
                              @if ((nbParcoursParPhase().get(phase.id) ?? 1) > 1) {
                                <app-badge status="purple" size="sm" class="hidden sm:inline-flex">
                                  Partagée · {{ nbParcoursParPhase().get(phase.id) }} parcours
                                </app-badge>
                              }
                              <span class="shrink-0 text-xs text-ink-muted">{{ (etapesParPhase().get(phase.id) ?? []).length }} étapes</span>
                            </button>

                            @if (phasesOuvertes().has(parcours.id + ':' + phase.id)) {
                              <div class="border-t border-line px-4 py-3 bg-surface">
                                @if (phase.description) {
                                  <p class="mb-3 text-xs text-ink-muted">{{ phase.description }}</p>
                                }

                                @let etapes = etapesParPhase().get(phase.id) ?? [];
                                @if (etapes.length === 0) {
                                  <p class="py-2 text-sm text-ink-muted">Aucune étape dans cette phase.</p>
                                } @else {
                                  <ol class="ml-3 flex flex-col border-l-2 border-line">
                                    @for (etape of etapes; track etape.id; let n = $index) {
                                      <li class="relative flex items-center gap-3 py-1.5 pl-5">
                                        <span class="absolute -left-3.25 flex size-6 items-center justify-center rounded-full border-2 border-line bg-surface text-[11px] font-semibold text-ink-muted">{{ n + 1 }}</span>
                                        <div class="min-w-0 flex-1">
                                          <a
                                            [routerLink]="['/incubateur/programmes/etapes', etape.id]"
                                            [queryParams]="{ parcoursId: parcours?.id, programmeId: programme()?.id }"
                                            class="block truncate text-sm font-medium text-ink transition-colors hover:text-accent"
                                          >
                                            {{ etape.nom }}
                                          </a>
                                          @if (etape.description) {
                                            <p class="line-clamp-1 text-xs text-ink-muted">{{ etape.description }}</p>
                                          }
                                        </div>
                                        <app-badge [status]="etape.obligatoire ? 'info' : 'neutral'" size="sm">
                                          {{ etape.obligatoire ? 'Obligatoire' : 'Facultative' }}
                                        </app-badge>
                                      </li>
                                    }
                                  </ol>
                                }

                                @if (isAdmin()) {
                                  <button type="button" (click)="ouvrirCreationEtape(parcours, phase)" class="mt-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft transition-colors cursor-pointer">
                                    <app-icon name="plus" class="size-3.5" /> Ajouter une étape
                                  </button>
                                }
                              </div>
                            }
                          </app-card>
                        }
                      </div>
                    }

                    @if (isAdmin()) {
                      <button type="button" (click)="ouvrirAjoutPhase(parcours)" class="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft transition-colors cursor-pointer">
                        <app-icon name="plus" class="size-3.5" /> Ajouter une phase
                      </button>
                    }
                  </div>
                }
              </app-card>
            }
          </div>
        }
      }

      <!-- Modal : nouveau parcours -->
      @if (modalParcours()) {
        <app-modal title="Nouveau parcours" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formParcours" (ngSubmit)="creerParcours()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" placeholder="Ex : Idéation" class="${INPUT_CLASS}" />
              @if (formParcours.controls.nom.invalid && formParcours.controls.nom.touched) {
                <p class="mt-1 text-xs text-danger">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formParcours.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Créer' }}</app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : ajouter une phase (nouvelle ou existante) -->
      @if (parcoursPourPhase(); as cible) {
        <app-modal [title]="'Ajouter une phase'" [subtitle]="cible.nom" maxWidth="md" (close)="fermerModals()">
          <div class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">{{ erreurModal() }}</div>
            }

            <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-semibold">
              <button type="button" (click)="modePhase.set('nouvelle')" class="flex-1 rounded-lg px-3 py-1.5 cursor-pointer transition-all" [class]="modePhase() === 'nouvelle' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'">Nouvelle phase</button>
              <button type="button" (click)="modePhase.set('existante')" class="flex-1 rounded-lg px-3 py-1.5 cursor-pointer transition-all" [class]="modePhase() === 'existante' ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'">Phase existante</button>
            </div>

            @if (modePhase() === 'nouvelle') {
              <form [formGroup]="formPhase" (ngSubmit)="creerPhase()" class="flex flex-col gap-4">
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
                  <input type="text" formControlName="nom" placeholder="Ex : Comprendre le problème" class="${INPUT_CLASS}" />
                  @if (formPhase.controls.nom.invalid && formPhase.controls.nom.touched) {
                    <p class="mt-1 text-xs text-danger">Le nom est obligatoire</p>
                  }
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
                  <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
                </div>
                <p class="text-xs text-ink-muted">La phase sera ajoutée à la fin du parcours.</p>
                <div class="flex justify-end gap-2">
                  <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
                  <app-button type="submit" [disabled]="formPhase.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Créer et ajouter' }}</app-button>
                </div>
              </form>
            } @else {
              <div class="flex flex-col gap-4">
                @if (phasesDisponibles().length === 0) {
                  <p class="rounded-xl border border-line bg-surface-subtle p-4 text-center text-sm text-ink-muted">
                    Aucune autre phase disponible. Créez une nouvelle phase.
                  </p>
                } @else {
                  <div>
                    <label class="mb-1.5 block text-sm font-medium text-ink">Phase</label>
                    <select [formControl]="phaseExistanteId" class="${INPUT_CLASS}">
                      <option value="">Choisir une phase…</option>
                      @for (p of phasesDisponibles(); track p.id) {
                        <option [value]="p.id">{{ p.nom }}</option>
                      }
                    </select>
                  </div>
                  <p class="text-xs text-warning">Une phase existante est partagée : ses étapes seront identiques dans tous les parcours qui l'utilisent.</p>
                }
                <div class="flex justify-end gap-2">
                  <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
                  <app-button [disabled]="!phaseExistanteId.value || enCours()" (click)="attacherPhase()">{{ enCours() ? 'En cours...' : 'Ajouter' }}</app-button>
                </div>
              </div>
            }
          </div>
        </app-modal>
      }

      <!-- Modal : nouvelle étape -->
      @if (cibleEtape(); as cible) {
        <app-modal title="Ajouter une étape" [subtitle]="cible.phase.nom" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formEtape" (ngSubmit)="creerEtape()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" placeholder="Ex : Identifier le problème" class="${INPUT_CLASS}" />
              @if (formEtape.controls.nom.invalid && formEtape.controls.nom.touched) {
                <p class="mt-1 text-xs text-danger">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <label class="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" formControlName="obligatoire" class="size-4 accent-accent" />
              Étape obligatoire
            </label>
            <p class="text-xs text-ink-muted">L'étape sera ajoutée à la fin de la phase.</p>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formEtape.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Ajouter' }}</app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : modifier programme -->
      @if (modalProgramme()) {
        <app-modal title="Modifier le programme" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formProgramme" (ngSubmit)="modifierProgramme()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" class="${INPUT_CLASS}" />
              @if (formProgramme.controls.nom.invalid && formProgramme.controls.nom.touched) {
                <p class="mt-1 text-xs text-danger">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formProgramme.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Enregistrer' }}</app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : confirmation archivage -->
      @if (confirmationArchivage()) {
        <app-modal title="Archiver ce programme ?" maxWidth="sm" (close)="confirmationArchivage.set(false)">
          <div class="flex flex-col gap-4">
            <p class="text-sm text-ink-muted">Le programme ne sera plus proposé parmi les programmes actifs. Vous pourrez le restaurer à tout moment.</p>
            <div class="flex justify-end gap-2">
              <app-button variant="ghost" (click)="confirmationArchivage.set(false)">Annuler</app-button>
              <app-button (click)="archiverProgramme()">Archiver</app-button>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `,
})
export class ProgrammeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly programmeService = inject(ProgrammeService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly phaseService = inject(PhaseService);
  private readonly etapeService = inject(EtapeService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  // Données
  readonly programme = signal<Programme | null>(null);
  readonly tousParcours = signal<Parcours[]>([]);
  readonly toutesEtapes = signal<Etape[]>([]);
  readonly bibliothequePhases = signal<Phase[]>([]);

  // État UI
  readonly loading = signal(true);
  readonly erreurPage = signal<string | null>(null);
  readonly erreurModal = signal<string | null>(null);
  readonly enCours = signal(false);
  readonly menuOuvert = signal(false);
  readonly parcoursOuverts = signal<Set<string>>(new Set());
  readonly phasesOuvertes = signal<Set<string>>(new Set());

  // Modals
  readonly modalParcours = signal(false);
  readonly modalProgramme = signal(false);
  readonly confirmationArchivage = signal(false);
  readonly parcoursPourPhase = signal<Parcours | null>(null);
  readonly cibleEtape = signal<{ parcours: Parcours; phase: Phase } | null>(null);
  readonly modePhase = signal<'nouvelle' | 'existante'>('nouvelle');

  // Formulaires (nonNullable : reset() revient aux valeurs initiales, jamais à null)
  readonly formParcours = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });
  readonly formProgramme = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });
  readonly formPhase = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });
  readonly formEtape = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    obligatoire: new FormControl(true, { nonNullable: true }),
  });
  readonly phaseExistanteId = new FormControl('', { nonNullable: true });

  readonly isAdmin = computed(() => this.structureCtx.activeRole() === 'ADMIN_STRUCTURE');

  readonly parcoursDuProgramme = computed(() => {
    const prog = this.programme();
    if (!prog) return [];
    return this.tousParcours().filter(
      p => !p.archive && (prog.parcoursIds.includes(p.id) || p.programmeId === prog.id),
    );
  });

  /** Étapes actives, groupées par phase et triées par ordre. */
  readonly etapesParPhase = computed(() => {
    const map = new Map<string, Etape[]>();
    for (const e of this.toutesEtapes()) {
      if (e.archive) continue;
      const liste = map.get(e.phaseId) ?? [];
      liste.push(e);
      map.set(e.phaseId, liste);
    }
    map.forEach(liste => liste.sort((a, b) => a.ordre - b.ordre));
    return map;
  });

  /** Nombre de parcours (actifs, de toute la structure) utilisant chaque phase. */
  readonly nbParcoursParPhase = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.tousParcours()) {
      if (p.archive) continue;
      for (const ph of p.phases ?? []) {
        map.set(ph.id, (map.get(ph.id) ?? 0) + 1);
      }
    }
    return map;
  });

  readonly statsParcours = computed(() => {
    const map = new Map<string, StatsParcours>();
    for (const p of this.parcoursDuProgramme()) {
      const phases = this.phasesDe(p);
      const etapes = phases.reduce((total, ph) => total + (this.etapesParPhase().get(ph.id)?.length ?? 0), 0);
      map.set(p.id, { phases: phases.length, etapes });
    }
    return map;
  });

  readonly totaux = computed(() => {
    const phaseIds = new Set<string>();
    for (const p of this.parcoursDuProgramme()) this.phasesDe(p).forEach(ph => phaseIds.add(ph.id));
    let etapes = 0;
    phaseIds.forEach(id => (etapes += this.etapesParPhase().get(id)?.length ?? 0));
    return { phases: phaseIds.size, etapes };
  });

  readonly phasesDisponibles = computed(() => {
    const cible = this.parcoursPourPhase();
    const dejaIds = new Set((cible?.phases ?? []).map(p => p.id));
    return this.bibliothequePhases().filter(p => !p.archive && !dejaIds.has(p.id));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }
    this.charger(id, false);
  }

  phasesDe(parcours: Parcours): ParcoursPhase[] {
    return [...(parcours.phases ?? [])]
      .filter(ph => !ph.archive)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  }

  charger(id: string, silencieux = true): void {
    if (!silencieux) this.loading.set(true);
    forkJoin({
      programme: this.programmeService.getProgrammeById(id),
      parcours: this.parcoursService.getAllParcours().pipe(catchError(() => of(null))),
      etapes: this.etapeService.getAllEtapes().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ programme, parcours, etapes }) => {
          this.programme.set(programme);
          if (parcours) this.tousParcours.set(parcours);
          if (etapes) this.toutesEtapes.set(etapes);
          this.erreurPage.set(
            !parcours || !etapes ? 'Certaines données de la structure n\'ont pas pu être chargées.' : null,
          );
          this.loading.set(false);
          if (!silencieux) this.ouvrirParDefaut();
        },
        error: () => {
          this.loading.set(false);
          this.programme.set(null);
          this.erreurPage.set('Impossible de charger le programme.');
        },
      });
  }

  /** Par défaut : le premier parcours est déplié avec ses phases. */
  private ouvrirParDefaut(): void {
    const premier = this.parcoursDuProgramme()[0];
    if (!premier) return;
    this.parcoursOuverts.set(new Set([premier.id]));
    this.phasesOuvertes.set(new Set(this.phasesDe(premier).map(ph => premier.id + ':' + ph.id)));
  }

  // --- Dépliage ---
  toggleParcours(id: string): void {
    const s = new Set(this.parcoursOuverts());
    s.has(id) ? s.delete(id) : s.add(id);
    this.parcoursOuverts.set(s);
  }

  togglePhase(cle: string): void {
    const s = new Set(this.phasesOuvertes());
    s.has(cle) ? s.delete(cle) : s.add(cle);
    this.phasesOuvertes.set(s);
  }

  toutDeplier(): void {
    const parcours = this.parcoursDuProgramme();
    this.parcoursOuverts.set(new Set(parcours.map(p => p.id)));
    this.phasesOuvertes.set(new Set(parcours.flatMap(p => this.phasesDe(p).map(ph => p.id + ':' + ph.id))));
  }

  toutReplier(): void {
    this.parcoursOuverts.set(new Set());
    this.phasesOuvertes.set(new Set());
  }

  // --- Navigation ---
  retour(): void {
    this.router.navigate(['/incubateur/programmes']);
  }

  ouvrirParcours(parcoursId: string): void {
    this.router.navigate(['/incubateur/programmes', this.programme()!.id, 'parcours', parcoursId]);
  }

  // --- Modals ---
  fermerModals(): void {
    this.modalParcours.set(false);
    this.modalProgramme.set(false);
    this.parcoursPourPhase.set(null);
    this.cibleEtape.set(null);
    this.erreurModal.set(null);
    this.enCours.set(false);
  }

  private ouvrirModal(): void {
    this.erreurModal.set(null);
    this.enCours.set(false);
  }

  // --- Parcours ---
  ouvrirCreationParcours(): void {
    this.ouvrirModal();
    this.formParcours.reset();
    this.modalParcours.set(true);
  }

  creerParcours(): void {
    const prog = this.programme();
    if (this.formParcours.invalid || !prog) return;
    this.enCours.set(true);
    this.erreurModal.set(null);

    const { nom, description } = this.formParcours.getRawValue();
    const request: CreateParcoursRequest = { nom, description: description || undefined, programmeId: prog.id };

    this.parcoursService.createParcours(request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cree) => {
        this.fermerModals();
        this.charger(prog.id);
        this.parcoursOuverts.set(new Set([...this.parcoursOuverts(), cree.id]));
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || 'Erreur lors de la création du parcours.');
      },
    });
  }

  // --- Phases ---
  ouvrirAjoutPhase(parcours: Parcours): void {
    this.ouvrirModal();
    this.formPhase.reset();
    this.phaseExistanteId.reset();
    this.modePhase.set('nouvelle');
    this.parcoursPourPhase.set(parcours);
    this.parcoursService.getAllPhases().pipe(
      catchError(() => of([] as Phase[])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(p => this.bibliothequePhases.set(p));
  }

  creerPhase(): void {
    const cible = this.parcoursPourPhase();
    if (this.formPhase.invalid || !cible) return;
    this.enCours.set(true);
    this.erreurModal.set(null);

    const { nom, description } = this.formPhase.getRawValue();
    this.phaseService.createPhase({ nom, description: description || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (phase) => this.rattacherPhase(cible, phase.id),
        error: (err) => {
          this.enCours.set(false);
          this.erreurModal.set(err.error?.message || 'Erreur lors de la création de la phase.');
        },
      });
  }

  attacherPhase(): void {
    const cible = this.parcoursPourPhase();
    const phaseId = this.phaseExistanteId.value;
    if (!cible || !phaseId) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    this.rattacherPhase(cible, phaseId);
  }

  private rattacherPhase(parcours: Parcours, phaseId: string): void {
    this.parcoursService.ajouterPhase(parcours.id, phaseId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fermerModals();
        this.charger(this.programme()!.id);
        this.parcoursOuverts.set(new Set([...this.parcoursOuverts(), parcours.id]));
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || "Impossible d'ajouter la phase au parcours.");
      },
    });
  }

  // --- Étapes ---
  ouvrirCreationEtape(parcours: Parcours, phase: Phase): void {
    this.ouvrirModal();
    this.formEtape.reset();
    this.cibleEtape.set({ parcours, phase });
  }

  creerEtape(): void {
    const cible = this.cibleEtape();
    if (this.formEtape.invalid || !cible) return;
    this.enCours.set(true);
    this.erreurModal.set(null);

    const existantes = this.etapesParPhase().get(cible.phase.id) ?? [];
    const ordre = existantes.reduce((max, e) => Math.max(max, e.ordre), 0) + 1;
    const { nom, description, obligatoire } = this.formEtape.getRawValue();

    this.etapeService.createEtape({
      nom,
      description: description || undefined,
      ordre,
      obligatoire,
      phaseId: cible.phase.id,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fermerModals();
        this.charger(this.programme()!.id);
        this.phasesOuvertes.set(new Set([...this.phasesOuvertes(), cible.parcours.id + ':' + cible.phase.id]));
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || "Erreur lors de la création de l'étape.");
      },
    });
  }

  // --- Programme ---
  ouvrirEditionProgramme(): void {
    const prog = this.programme();
    if (!prog) return;
    this.menuOuvert.set(false);
    this.ouvrirModal();
    this.formProgramme.reset({ nom: prog.nom, description: prog.description ?? '' });
    this.modalProgramme.set(true);
  }

  modifierProgramme(): void {
    const prog = this.programme();
    if (this.formProgramme.invalid || !prog) return;
    this.enCours.set(true);
    this.erreurModal.set(null);

    const { nom, description } = this.formProgramme.getRawValue();
    this.programmeService.updateProgramme(prog.id, { nom, description: description || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fermerModals();
          this.charger(prog.id);
        },
        error: (err) => {
          this.enCours.set(false);
          this.erreurModal.set(err.error?.message || 'Erreur lors de la modification.');
        },
      });
  }

  archiverProgramme(): void {
    const prog = this.programme();
    if (!prog) return;
    this.confirmationArchivage.set(false);
    this.programmeService.archiverProgramme(prog.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.charger(prog.id),
      error: () => this.erreurPage.set("Impossible d'archiver le programme."),
    });
  }

  restaurerProgramme(): void {
    const prog = this.programme();
    if (!prog) return;
    this.menuOuvert.set(false);
    this.programmeService.restaurerProgramme(prog.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.charger(prog.id),
      error: () => this.erreurPage.set('Impossible de restaurer le programme.'),
    });
  }
}