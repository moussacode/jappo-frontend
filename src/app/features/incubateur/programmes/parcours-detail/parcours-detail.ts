import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { ParcoursService } from '../../../../core/services/parcours.service';
import { PhaseService } from '../../../../core/services/phase.service';
import { EtapeService } from '../../../../core/services/etape.service';
import { ProgrammeService } from '../../../../core/services/programme.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte, Parcours, Phase, ParcoursPhase, CreateParcoursRequest, CreateCohorteRequest } from '../../../../core/models/cohorte.model';
import { Etape, Programme } from '../../../../core/models/parcours.model';
import { INPUT_CLASS } from '../constants';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

const ICON_BTN =
  'flex size-7 items-center justify-center rounded-lg text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed';
const MENU_ITEM =
  'flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted cursor-pointer';

interface Confirmation {
  titre: string;
  message: string;
  label: string;
  action: () => void;
}

@Component({
  selector: 'app-parcours-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Icon,
    ButtonComponent,
    EmptyStateComponent,
    BadgeComponent,
    ModalComponent,
    PageHeaderComponent,
  ],
  host: { '(document:keydown.escape)': 'fermerMenus()' },
  template: `
    <div class="mx-auto flex w-full max-w-5xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      @if (parcours(); as p) {
        <app-page-header
          [title]="p.nom"
          [subtitle]="p.description"
          [breadcrumb]="fil()"
        >
          @if (isAdmin()) {
            <app-button size="sm" (click)="ouvrirAjoutPhase()">
              <app-icon name="plus" class="size-4" /> Ajouter une phase
            </app-button>
            <div class="relative">
              <app-button variant="secondary" size="sm" (click)="menuParcours.set(!menuParcours())">
                Actions <app-icon name="chevron-down" class="size-3.5" />
              </app-button>
              @if (menuParcours()) {
                <div class="fixed inset-0 z-10" (click)="fermerMenus()"></div>
                <div class="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                  <button type="button" (click)="ouvrirEditionParcours()" class="${MENU_ITEM}">
                    <app-icon name="edit-2" class="size-4 text-ink-muted" /> Modifier le parcours
                  </button>
                  <button type="button" (click)="demanderArchivageParcours()" class="${MENU_ITEM}">
                    <app-icon name="archive" class="size-4 text-ink-muted" /> Archiver le parcours
                  </button>
                </div>
              }
            </div>
          }
        </app-page-header>
      }

      @if (erreurPage()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span class="flex-1">{{ erreurPage() }}</span>
          <button type="button" (click)="erreurPage.set(null)" class="cursor-pointer text-rose-600 hover:text-rose-800" aria-label="Fermer">
            <app-icon name="x" class="size-3.5" />
          </button>
        </div>
      }

      @if (successMessage()) {
        <div class="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700" role="status">
          <app-icon name="check-circle" class="size-4 shrink-0" />
          <span class="flex-1">{{ successMessage() }}</span>
          <button type="button" (click)="successMessage.set(null)" class="cursor-pointer text-emerald-700 hover:text-emerald-900" aria-label="Fermer">
            <app-icon name="x" class="size-3.5" />
          </button>
        </div>
      }

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
        </div>
      } @else if (!parcours()) {
        <app-empty-state iconName="alert-circle" title="Parcours introuvable" description="Ce parcours n'existe pas ou n'est plus accessible.">
          <app-button size="sm" (click)="retourProgramme()">Retour</app-button>
        </app-empty-state>
      } @else {

        <!-- Synthèse -->
        <div class="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-muted">
          <span><strong class="text-ink">{{ phases().length }}</strong> phases</span>
          <span><strong class="text-ink">{{ totalEtapes() }}</strong> étapes</span>
          @if (programme()) {
            <span class="text-xs">Programme : {{ programme()!.nom }}</span>
          }
          @if (phases().length > 0) {
            <span class="ml-auto flex gap-2">
              <app-button variant="ghost" size="xs" (click)="toutDeplier()">Tout déplier</app-button>
              <app-button variant="ghost" size="xs" (click)="phasesOuvertes.set(emptySet)">Tout replier</app-button>
            </span>
          }
        </div>

        @if (phases().length === 0) {
          <app-empty-state iconName="layers" title="Aucune phase" description="Ce parcours ne contient encore aucune phase.">
            @if (isAdmin()) {
              <app-button size="sm" (click)="ouvrirAjoutPhase()">
                <app-icon name="plus" class="size-4" /> Ajouter une phase
              </app-button>
            }
          </app-empty-state>
        } @else {
          @if (menuPhaseId()) {
            <div class="fixed inset-0 z-10" (click)="fermerMenus()"></div>
          }
          <div class="flex flex-col gap-3">
            @for (phase of phases(); track phase.id; let i = $index; let premier = $first; let dernier = $last) {
              <section class="rounded-2xl border border-line bg-surface">

                <div class="flex items-center gap-2 px-3 py-2.5 sm:px-4">
                  <button
                    type="button"
                    (click)="togglePhase(phase.id)"
                    class="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer"
                    [attr.aria-expanded]="phasesOuvertes().has(phase.id)"
                  >
                    <app-icon name="chevron-down" class="size-4 shrink-0 text-ink-muted transition-transform duration-200" [class.-rotate-90]="!phasesOuvertes().has(phase.id)" />
                    <span class="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-accent">Phase {{ i + 1 }}</span>
                    <span class="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{{ phase.nom }}</span>
                  </button>

                  @if ((nbParcoursParPhase().get(phase.id) ?? 1) > 1) {
                    <app-badge status="purple" size="sm" class="hidden sm:inline-flex">
                      Partagée · {{ nbParcoursParPhase().get(phase.id) }} parcours
                    </app-badge>
                  }
                  <span class="hidden shrink-0 text-xs text-ink-muted sm:block">{{ (etapesParPhase().get(phase.id) ?? []).length }} étapes</span>

                  @if (isAdmin()) {
                    <button type="button" class="${ICON_BTN}" [disabled]="premier || enCours()" (click)="deplacerPhase(i, -1)" title="Monter" aria-label="Monter la phase">
                      <app-icon name="chevron-up" class="size-4" />
                    </button>
                    <button type="button" class="${ICON_BTN}" [disabled]="dernier || enCours()" (click)="deplacerPhase(i, 1)" title="Descendre" aria-label="Descendre la phase">
                      <app-icon name="chevron-down" class="size-4" />
                    </button>
                    <div class="relative">
                      <button type="button" class="${ICON_BTN} text-lg leading-none" (click)="menuPhaseId.set(menuPhaseId() === phase.id ? null : phase.id)" aria-label="Actions de la phase">⋯</button>
                      @if (menuPhaseId() === phase.id) {
                        <div class="absolute right-0 top-8 z-20 w-52 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                          <button type="button" (click)="ouvrirEditionPhase(phase)" class="${MENU_ITEM}">
                            <app-icon name="edit-2" class="size-4 text-ink-muted" /> Modifier
                          </button>
                          <button type="button" (click)="demanderRetraitPhase(phase)" class="${MENU_ITEM}">
                            <app-icon name="arrow-left" class="size-4 text-ink-muted" /> Retirer du parcours
                          </button>
                          <button type="button" (click)="demanderArchivagePhase(phase)" class="${MENU_ITEM}">
                            <app-icon name="archive" class="size-4 text-ink-muted" /> Archiver la phase
                          </button>
                        </div>
                      }
                    </div>
                  }
                </div>

                @if (phasesOuvertes().has(phase.id)) {
                  <div class="border-t border-line px-4 py-3">
                    @if (phase.description) {
                      <p class="mb-3 text-xs text-ink-muted">{{ phase.description }}</p>
                    }

                    @let cohortes = cohortesParPhase().get(phase.id) ?? [];
                    @if (cohortes.length > 0) {
                      <div class="mb-3">
                        <p class="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted">Cohortes</p>
                        <div class="flex flex-wrap gap-2">
                          @for (cohorte of cohortes; track cohorte.id) {
                            <a
                              [routerLink]="['/incubateur/cohortes', cohorte.id]"
                              class="inline-flex items-center rounded-full border border-accent/30 bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                            >
                              {{ cohorte.nom }}
                            </a>
                          }
                        </div>
                      </div>
                    } @else {
                      <p class="mb-3 text-sm text-ink-muted">Aucune cohorte associée à cette phase.</p>
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
                                [queryParams]="{ parcoursId: parcours()?.id, programmeId: programme()?.id }"
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
                            @if (isAdmin()) {
                              <button type="button" class="${ICON_BTN}" (click)="ouvrirEditionEtape(etape)" title="Modifier" aria-label="Modifier l'étape">
                                <app-icon name="edit-2" class="size-4" />
                              </button>
                              <button type="button" class="${ICON_BTN}" (click)="demanderArchivageEtape(etape)" title="Archiver" aria-label="Archiver l'étape">
                                <app-icon name="archive" class="size-4" />
                              </button>
                            }
                          </li>
                        }
                      </ol>
                    }

                    @if (isAdmin()) {
                      <div class="mt-2 flex flex-wrap gap-2">
                        <button type="button" (click)="ouvrirCreationCohortePhase(phase)" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer">
                          <app-icon name="plus" class="size-3.5" /> Créer une cohorte
                        </button>
                        <button type="button" (click)="ouvrirCreationEtape(phase)" class="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors cursor-pointer">
                          <app-icon name="plus" class="size-3.5" /> Ajouter une étape
                        </button>
                      </div>
                    }
                  </div>
                }
              </section>
            }
          </div>
        }
      }

      <!-- Modal : ajouter une phase -->
      @if (modalPhase()) {
        <app-modal title="Ajouter une phase" [subtitle]="parcours()?.nom" maxWidth="md" (close)="fermerModals()">
          <div class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">{{ erreurModal() }}</div>
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
                    <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
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
                  <p class="rounded-xl border border-line bg-surface-muted/40 p-4 text-center text-sm text-ink-muted">Aucune autre phase disponible. Créez une nouvelle phase.</p>
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
                  <p class="text-xs text-amber-600">Une phase existante est partagée : ses étapes seront identiques dans tous les parcours qui l'utilisent.</p>
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

      <!-- Modal : modifier une phase -->
      @if (phaseEnEdition(); as ph) {
        <app-modal title="Modifier la phase" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formPhase" (ngSubmit)="modifierPhase()" class="flex flex-col gap-4">
            @if ((nbParcoursParPhase().get(ph.id) ?? 1) > 1) {
              <p class="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700">
                Cette phase est utilisée par {{ nbParcoursParPhase().get(ph.id) }} parcours : la modification s'appliquera partout.
              </p>
            }
            @if (erreurModal()) {
              <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" class="${INPUT_CLASS}" />
              @if (formPhase.controls.nom.invalid && formPhase.controls.nom.touched) {
                <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formPhase.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Enregistrer' }}</app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : créer une cohorte depuis une phase -->
      @if (modalCohortePhase()) {
        <app-modal [title]="'Créer une cohorte'" [subtitle]="cohortePhaseCourante() ? cohortePhaseCourante()!.parcoursNom + ' · ' + cohortePhaseCourante()!.phaseNom : undefined" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formCohortePhase" (ngSubmit)="creerCohorteDepuisPhase()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom de la cohorte *</label>
              <input type="text" formControlName="nom" placeholder="Ex : Batch #3" class="${INPUT_CLASS}" />
              @if (formCohortePhase.controls.nom.invalid && formCohortePhase.controls.nom.touched) {
                <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink">Date de début</label>
                <input type="date" formControlName="dateDebut" class="${INPUT_CLASS}" />
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-medium text-ink">Date de fin</label>
                <input type="date" formControlName="dateFin" class="${INPUT_CLASS}" />
              </div>
            </div>
            <div class="rounded-xl border border-line bg-surface-muted/40 p-3 text-xs text-ink-muted">
              <strong class="text-ink">Parcours :</strong> {{ cohortePhaseCourante()?.parcoursNom ?? '—' }}
              <br />
              <strong class="text-ink">Phase :</strong> {{ cohortePhaseCourante()?.phaseNom ?? '—' }}
            </div>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formCohortePhase.invalid || creationCohortePhaseEnCours()">
                {{ creationCohortePhaseEnCours() ? 'Création...' : 'Créer la cohorte' }}
              </app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : créer / modifier une étape -->
      @if (modalEtape()) {
        <app-modal [title]="etapeEnEdition() ? 'Modifier l\\'étape' : 'Ajouter une étape'" [subtitle]="etapeEnEdition() ? undefined : phaseCible()?.nom" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formEtape" (ngSubmit)="soumettreEtape()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" placeholder="Ex : Identifier le problème" class="${INPUT_CLASS}" />
              @if (formEtape.controls.nom.invalid && formEtape.controls.nom.touched) {
                <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
              @if (etapeEnEdition()) {
                <div class="sm:w-28">
                  <label class="mb-1.5 block text-sm font-medium text-ink">Ordre</label>
                  <input type="number" min="1" formControlName="ordre" class="${INPUT_CLASS}" />
                </div>
              }
              <label class="flex items-center gap-2 pb-2 text-sm text-ink cursor-pointer">
                <input type="checkbox" formControlName="obligatoire" class="size-4" />
                Étape obligatoire
              </label>
            </div>
            @if (!etapeEnEdition()) {
              <p class="text-xs text-ink-muted">L'étape sera ajoutée à la fin de la phase.</p>
            }
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formEtape.invalid || enCours()">
                {{ enCours() ? 'En cours...' : (etapeEnEdition() ? 'Enregistrer' : 'Ajouter') }}
              </app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal : modifier le parcours -->
      @if (modalParcours()) {
        <app-modal title="Modifier le parcours" maxWidth="md" (close)="fermerModals()">
          <form [formGroup]="formParcours" (ngSubmit)="modifierParcours()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">{{ erreurModal() }}</div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" class="${INPUT_CLASS}" />
              @if (formParcours.controls.nom.invalid && formParcours.controls.nom.touched) {
                <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" (click)="fermerModals()">Annuler</app-button>
              <app-button type="submit" [disabled]="formParcours.invalid || enCours()">{{ enCours() ? 'En cours...' : 'Enregistrer' }}</app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal de confirmation générique -->
      @if (confirmation(); as c) {
        <app-modal [title]="c.titre" maxWidth="sm" (close)="confirmation.set(null)">
          <div class="flex flex-col gap-4">
            <p class="text-sm text-ink-muted">{{ c.message }}</p>
            <div class="flex justify-end gap-2">
              <app-button variant="ghost" (click)="confirmation.set(null)">Annuler</app-button>
              <app-button (click)="executerConfirmation()">{{ c.label }}</app-button>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `,
})
export class ParcoursDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly parcoursService = inject(ParcoursService);
  private readonly phaseService = inject(PhaseService);
  private readonly etapeService = inject(EtapeService);
  private readonly programmeService = inject(ProgrammeService);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly emptySet = new Set<string>();

  // Données
  readonly parcours = signal<Parcours | null>(null);
  readonly programme = signal<Programme | null>(null);
  readonly toutesEtapes = signal<Etape[]>([]);
  readonly tousParcours = signal<Parcours[]>([]);
  readonly bibliothequePhases = signal<Phase[]>([]);
  readonly cohortesParPhase = signal<Map<string, Cohorte[]>>(new Map());

  // État UI
  readonly loading = signal(true);
  readonly enCours = signal(false);
  readonly erreurPage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);
  readonly erreurModal = signal<string | null>(null);
  readonly phasesOuvertes = signal<Set<string>>(new Set());
  readonly menuParcours = signal(false);
  readonly menuPhaseId = signal<string | null>(null);
  readonly confirmation = signal<Confirmation | null>(null);

  // Modals
  readonly modalPhase = signal(false);
  readonly modePhase = signal<'nouvelle' | 'existante'>('nouvelle');
  readonly phaseEnEdition = signal<Phase | null>(null);
  readonly modalEtape = signal(false);
  readonly etapeEnEdition = signal<Etape | null>(null);
  readonly phaseCible = signal<Phase | null>(null);
  readonly modalParcours = signal(false);
  readonly modalCohortePhase = signal(false);
  readonly cohortePhaseCourante = signal<{ parcoursId: string; phaseId: string; parcoursNom: string; phaseNom: string } | null>(null);
  readonly creationCohortePhaseEnCours = signal(false);

  // Formulaires (nonNullable : reset() ne met jamais les champs à null)
  readonly formPhase = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });
  readonly formCohortePhase = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    dateDebut: new FormControl('', { nonNullable: true }),
    dateFin: new FormControl('', { nonNullable: true }),
  });
  readonly phaseExistanteId = new FormControl('', { nonNullable: true });
  readonly formEtape = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    ordre: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    obligatoire: new FormControl(true, { nonNullable: true }),
  });
  readonly formParcours = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
  });

  readonly isAdmin = computed(() => this.structureCtx.activeRole() === 'ADMIN_STRUCTURE');

  readonly phases = computed<ParcoursPhase[]>(() =>
    [...(this.parcours()?.phases ?? [])]
      .filter(p => !p.archive)
      .sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
  );

  readonly etapesParPhase = computed(() => {
    const map = new Map<string, Etape[]>();
    for (const e of this.toutesEtapes()) {
      if (e.archive) continue;
      const liste = map.get(e.phaseId) ?? [];
      liste.push(e);
      map.set(e.phaseId, liste);
    }
    map.forEach(l => l.sort((a, b) => a.ordre - b.ordre));
    return map;
  });

  readonly totalEtapes = computed(() =>
    this.phases().reduce((t, ph) => t + (this.etapesParPhase().get(ph.id)?.length ?? 0), 0),
  );

  readonly nbParcoursParPhase = computed(() => {
    const map = new Map<string, number>();
    for (const p of this.tousParcours()) {
      if (p.archive) continue;
      for (const ph of p.phases ?? []) map.set(ph.id, (map.get(ph.id) ?? 0) + 1);
    }
    return map;
  });

  readonly phasesDisponibles = computed(() => {
    const dejaIds = new Set((this.parcours()?.phases ?? []).map(p => p.id));
    return this.bibliothequePhases().filter(p => !p.archive && !dejaIds.has(p.id));
  });

  readonly fil = computed(() => {
    const prog = this.programme();
    const items: { label: string; path?: string }[] = [{ label: 'Programmes', path: '/incubateur/programmes' }];
    if (prog) items.push({ label: prog.nom, path: `/incubateur/programmes/${prog.id}` });
    items.push({ label: this.parcours()?.nom ?? '…' });
    return items;
  });

  ngOnInit(): void {
    const programmeId = this.route.snapshot.paramMap.get('programmeId');
    const parcoursId = this.route.snapshot.paramMap.get('parcoursId');
    if (!programmeId || !parcoursId) {
      this.loading.set(false);
      return;
    }
    this.programmeService.getProgrammeById(programmeId).pipe(
      catchError(() => of(null)),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(p => this.programme.set(p));

    this.charger(parcoursId, false);
  }

  charger(parcoursId: string, silencieux = true): void {
    if (!silencieux) this.loading.set(true);
    forkJoin({
      parcours: this.parcoursService.getParcoursById(parcoursId),
      tous: this.parcoursService.getAllParcours().pipe(catchError(() => of(null))),
      etapes: this.etapeService.getAllEtapes().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ parcours, tous, etapes }) => {
          this.parcours.set(parcours);
          if (tous) this.tousParcours.set(tous);
          if (etapes) this.toutesEtapes.set(etapes);
          this.chargerCohortesParPhase();
          this.erreurPage.set(!tous || !etapes ? "Certaines données n'ont pas pu être chargées (étapes ou partage des phases)." : null);
          this.loading.set(false);
          if (!silencieux) this.toutDeplier();
        },
        error: () => {
          this.loading.set(false);
          this.parcours.set(null);
          this.erreurPage.set('Impossible de charger le parcours.');
        },
      });
  }

  private recharger(): void {
    this.charger(this.parcours()!.id);
  }

  ouvrirCreationCohortePhase(phase: ParcoursPhase): void {
    const parcours = this.parcours();
    if (!parcours) return;

    this.preparerModal();
    this.formCohortePhase.reset({
      nom: '',
      description: '',
      dateDebut: '',
      dateFin: '',
    });
    this.cohortePhaseCourante.set({
      parcoursId: parcours.id,
      phaseId: phase.id,
      parcoursNom: parcours.nom,
      phaseNom: phase.nom,
    });
    this.modalCohortePhase.set(true);
  }

  creerCohorteDepuisPhase(): void {
    if (this.formCohortePhase.invalid) return;

    const cohortePhase = this.cohortePhaseCourante();
    if (!cohortePhase) return;

    const form = this.formCohortePhase.getRawValue();
    if (form.dateDebut && form.dateFin && form.dateFin < form.dateDebut) {
      this.erreurModal.set('La date de fin doit être postérieure à la date de début.');
      return;
    }

    this.creationCohortePhaseEnCours.set(true);
    this.erreurModal.set(null);

    const request: CreateCohorteRequest = {
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      dateDebut: form.dateDebut || undefined,
      dateFin: form.dateFin || undefined,
      parcoursId: cohortePhase.parcoursId,
      phaseId: cohortePhase.phaseId,
      programmeId: this.programme()?.id,
    };

    this.cohorteService.createCohorte(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creationCohortePhaseEnCours.set(false);
          this.modalCohortePhase.set(false);
          this.cohortePhaseCourante.set(null);
          this.successMessage.set('La cohorte a été créée avec succès.');
          this.chargerCohortesParPhase();
        },
        error: (err: HttpErrorResponse) => {
          this.creationCohortePhaseEnCours.set(false);
          this.erreurModal.set(err?.error?.message ?? 'Impossible de créer la cohorte pour cette phase.');
        },
      });
  }

  private chargerCohortesParPhase(): void {
    const phases = this.phases();
    if (phases.length === 0) {
      this.cohortesParPhase.set(new Map());
      return;
    }

    forkJoin(
      phases.map((phase) =>
        this.phaseService.getCohortesByPhase(phase.id).pipe(
          catchError(() => of([] as Cohorte[])),
        ),
      ),
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((listes) => {
        const map = new Map<string, Cohorte[]>();
        phases.forEach((phase, index) => {
          map.set(phase.id, listes[index] ?? []);
        });
        this.cohortesParPhase.set(map);
      });
  }

  // --- Navigation / dépliage ---
  retourProgramme(): void {
    const prog = this.programme();
    this.router.navigate(prog ? ['/incubateur/programmes', prog.id] : ['/incubateur/programmes']);
  }

  togglePhase(id: string): void {
    const s = new Set(this.phasesOuvertes());
    s.has(id) ? s.delete(id) : s.add(id);
    this.phasesOuvertes.set(s);
  }

  toutDeplier(): void {
    this.phasesOuvertes.set(new Set(this.phases().map(p => p.id)));
  }

  fermerMenus(): void {
    this.menuParcours.set(false);
    this.menuPhaseId.set(null);
  }

  fermerModals(): void {
    this.modalPhase.set(false);
    this.phaseEnEdition.set(null);
    this.modalEtape.set(false);
    this.etapeEnEdition.set(null);
    this.phaseCible.set(null);
    this.modalParcours.set(false);
    this.modalCohortePhase.set(false);
    this.cohortePhaseCourante.set(null);
    this.erreurModal.set(null);
    this.creationCohortePhaseEnCours.set(false);
    this.enCours.set(false);
  }

  private preparerModal(): void {
    this.fermerMenus();
    this.erreurModal.set(null);
    this.enCours.set(false);
  }

  // --- Confirmation générique ---
  private confirmer(c: Confirmation): void {
    this.fermerMenus();
    this.confirmation.set(c);
  }

  executerConfirmation(): void {
    const c = this.confirmation();
    this.confirmation.set(null);
    c?.action();
  }

  private erreurAction(message: string): void {
    this.erreurPage.set(message);
  }

  // --- Phases ---
  ouvrirAjoutPhase(): void {
    this.preparerModal();
    this.formPhase.reset();
    this.phaseExistanteId.reset();
    this.modePhase.set('nouvelle');
    this.modalPhase.set(true);
    this.parcoursService.getAllPhases().pipe(
      catchError(() => of([] as Phase[])),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(p => this.bibliothequePhases.set(p));
  }

  creerPhase(): void {
    if (this.formPhase.invalid) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    const { nom, description } = this.formPhase.getRawValue();

    this.phaseService.createPhase({ nom, description: description || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (phase) => this.rattacherPhase(phase.id),
        error: (err) => {
          this.enCours.set(false);
          this.erreurModal.set(err.error?.message || 'Erreur lors de la création de la phase.');
        },
      });
  }

  attacherPhase(): void {
    const id = this.phaseExistanteId.value;
    if (!id) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    this.rattacherPhase(id);
  }

  private rattacherPhase(phaseId: string): void {
    this.parcoursService.ajouterPhase(this.parcours()!.id, phaseId).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fermerModals();
        this.recharger();
        this.phasesOuvertes.set(new Set([...this.phasesOuvertes(), phaseId]));
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || "Impossible d'ajouter la phase au parcours.");
      },
    });
  }

  ouvrirEditionPhase(phase: Phase): void {
    this.preparerModal();
    this.formPhase.reset({ nom: phase.nom, description: phase.description ?? '' });
    this.phaseEnEdition.set(phase);
  }

  modifierPhase(): void {
    const phase = this.phaseEnEdition();
    if (this.formPhase.invalid || !phase) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    const { nom, description } = this.formPhase.getRawValue();

    this.phaseService.updatePhase(phase.id, { nom, description: description || undefined })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fermerModals();
          this.recharger();
        },
        error: (err) => {
          this.enCours.set(false);
          this.erreurModal.set(err.error?.message || 'Erreur lors de la modification.');
        },
      });
  }

  deplacerPhase(index: number, sens: -1 | 1): void {
    const ids = this.phases().map(p => p.id);
    const cible = index + sens;
    if (cible < 0 || cible >= ids.length) return;
    [ids[index], ids[cible]] = [ids[cible], ids[index]];

    this.enCours.set(true);
    this.parcoursService.reorganiserPhases(this.parcours()!.id, ids).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enCours.set(false);
        this.recharger();
      },
      error: () => {
        this.enCours.set(false);
        this.erreurAction("Impossible de réorganiser les phases.");
      },
    });
  }

  demanderRetraitPhase(phase: Phase): void {
    this.confirmer({
      titre: 'Retirer cette phase du parcours ?',
      message: `« ${phase.nom} » ne fera plus partie de ce parcours. La phase et ses étapes ne sont pas supprimées et restent disponibles pour d'autres parcours.`,
      label: 'Retirer',
      action: () =>
        this.parcoursService.retirerPhase(this.parcours()!.id, phase.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.recharger(),
          error: () => this.erreurAction('Impossible de retirer la phase du parcours.'),
        }),
    });
  }

  demanderArchivagePhase(phase: Phase): void {
    const nb = this.nbParcoursParPhase().get(phase.id) ?? 1;
    this.confirmer({
      titre: 'Archiver cette phase ?',
      message:
        nb > 1
          ? `« ${phase.nom} » est utilisée par ${nb} parcours : elle sera archivée dans tous. Pour la retirer de ce parcours seulement, choisissez « Retirer du parcours ».`
          : `« ${phase.nom} » sera archivée.`,
      label: 'Archiver',
      action: () =>
        this.phaseService.archivePhase(phase.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.recharger(),
          error: () => this.erreurAction("Impossible d'archiver la phase."),
        }),
    });
  }

  // --- Étapes ---
  ouvrirCreationEtape(phase: Phase): void {
    this.preparerModal();
    this.formEtape.reset();
    this.etapeEnEdition.set(null);
    this.phaseCible.set(phase);
    this.modalEtape.set(true);
  }

  ouvrirEditionEtape(etape: Etape): void {
    this.preparerModal();
    this.formEtape.reset({
      nom: etape.nom,
      description: etape.description ?? '',
      ordre: etape.ordre,
      obligatoire: etape.obligatoire,
    });
    this.etapeEnEdition.set(etape);
    this.modalEtape.set(true);
  }

  soumettreEtape(): void {
    if (this.formEtape.invalid) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    const { nom, description, ordre, obligatoire } = this.formEtape.getRawValue();
    const enEdition = this.etapeEnEdition();

    if (enEdition) {
      this.etapeService.updateEtape(enEdition.id, { nom, description: description || undefined, ordre, obligatoire })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            this.fermerModals();
            this.recharger();
          },
          error: (err) => {
            this.enCours.set(false);
            this.erreurModal.set(err.error?.message || 'Erreur lors de la modification.');
          },
        });
      return;
    }

    const phase = this.phaseCible();
    if (!phase) return;
    const existantes = this.etapesParPhase().get(phase.id) ?? [];
    const prochainOrdre = existantes.reduce((max, e) => Math.max(max, e.ordre), 0) + 1;

    this.etapeService.createEtape({ nom, description: description || undefined, ordre: prochainOrdre, obligatoire, phaseId: phase.id })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fermerModals();
          this.recharger();
          this.phasesOuvertes.set(new Set([...this.phasesOuvertes(), phase.id]));
        },
        error: (err) => {
          this.enCours.set(false);
          this.erreurModal.set(err.error?.message || "Erreur lors de la création de l'étape.");
        },
      });
  }

  demanderArchivageEtape(etape: Etape): void {
    this.confirmer({
      titre: 'Archiver cette étape ?',
      message: `« ${etape.nom} » ne sera plus affichée dans la phase.`,
      label: 'Archiver',
      action: () =>
        this.etapeService.archiverEtape(etape.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.recharger(),
          error: () => this.erreurAction("Impossible d'archiver l'étape."),
        }),
    });
  }

  // --- Parcours ---
  ouvrirEditionParcours(): void {
    const p = this.parcours();
    if (!p) return;
    this.preparerModal();
    this.formParcours.reset({ nom: p.nom, description: p.description ?? '' });
    this.modalParcours.set(true);
  }

  modifierParcours(): void {
    const p = this.parcours();
    if (this.formParcours.invalid || !p) return;
    this.enCours.set(true);
    this.erreurModal.set(null);
    const { nom, description } = this.formParcours.getRawValue();
    // programmeId conservé pour ne pas détacher le parcours de son programme.
    const request: CreateParcoursRequest = { nom, description: description || undefined, programmeId: p.programmeId };

    this.parcoursService.updateParcours(p.id, request).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.fermerModals();
        this.recharger();
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || 'Erreur lors de la modification.');
      },
    });
  }

  demanderArchivageParcours(): void {
    const p = this.parcours();
    if (!p) return;
    this.confirmer({
      titre: 'Archiver ce parcours ?',
      message: `« ${p.nom} » ne sera plus affiché dans le programme. Ses phases et étapes ne sont pas supprimées.`,
      label: 'Archiver',
      action: () =>
        this.parcoursService.archiverParcours(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: () => this.retourProgramme(),
          error: () => this.erreurAction("Impossible d'archiver le parcours."),
        }),
    });
  }
}