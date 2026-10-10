import {
  Component,
  DestroyRef,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Parcours, Phase } from '../../../../core/models/cohorte.model';
import { MissionModele } from '../../../../core/models/mission-modele.model';
import {
  Etape,
  LivrableAttendu,
  MissionEtape,
  TemplateField,
} from '../../../../core/models/parcours.model';
import { PhaseService } from '../../../../core/services/phase.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { LivrableAttenduService } from '../../../../core/services/livrable-attendu.service';
import {
  CreateMissionEtapeRequest,
  EtapeService,
  UpdateMissionEtapeRequest,
} from '../../../../core/services/etape.service';
import { MissionModeleService } from '../../../../core/services/mission-modele.service';
import { ParcoursService } from '../../../../core/services/parcours.service';

import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { Icon } from '../../../../shared/components/icon/icon';
import {
  BreadcrumbItem,
  PageHeaderComponent,
} from '../../../../shared/components/page-header/page-header.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

@Component({
  selector: 'app-etape-detail',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    EmptyStateComponent,
    Icon,
    ModalComponent,
    PageHeaderComponent,
    FormFieldComponent,
    InputComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
        </div>
      } @else if (error() && !etape()) {
        <app-empty-state
          iconName="alert-circle"
          title="Étape introuvable"
          description="Cette étape n'existe pas ou n'est plus accessible."
        >
          <app-button size="sm" (click)="retourVersParcours()">Retour au parcours</app-button>
        </app-empty-state>
      } @else if (etape(); as etape) {
        <app-page-header
          [title]="etape.nom"
          [subtitle]="etape.description || 'Informations détaillées de l’étape'"
          [breadcrumb]="breadcrumbItems()"
        >
          <app-button variant="secondary" size="sm" (click)="retourVersParcours()">
            <app-icon name="arrow-left" class="size-4" /> Retour
          </app-button>
          @if (canManageMissions()) {
            <app-button size="sm" (click)="ouvrirCreationMission()">
              <app-icon name="plus" class="size-4" /> Ajouter une mission
            </app-button>
          }
        </app-page-header>

        @if (flash()) {
          <div class="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-700">
            {{ flash() }}
          </div>
        }

        <div class="flex flex-wrap items-center gap-2">
          @if (parcours(); as parcoursCourant) {
            <app-badge status="purple" size="sm">{{ parcoursCourant.nom }}</app-badge>
          }
          @if (phase(); as phaseCourante) {
            <app-badge status="info" size="sm">Phase : {{ phaseCourante.nom }}</app-badge>
          }
          <app-badge [status]="etape.obligatoire ? 'info' : 'neutral'" size="sm">
            {{ etape.obligatoire ? 'Obligatoire' : 'Facultative' }}
          </app-badge>
          <app-badge status="primary" size="sm">Étape {{ etape.ordre }}</app-badge>
        </div>

        <div class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <app-card padding="lg">
            <div class="flex flex-col gap-5">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Informations</p>
                <h2 class="mt-2 text-lg font-semibold text-ink">{{ etape.nom }}</h2>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                  <p class="text-[11px] uppercase tracking-wide text-ink-muted">Ordre</p>
                  <p class="mt-2 text-sm font-semibold text-ink">{{ etape.ordre }}</p>
                </div>
                <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                  <p class="text-[11px] uppercase tracking-wide text-ink-muted">Règle</p>
                  <p class="mt-2 text-sm font-semibold text-ink">
                    {{ etape.obligatoire ? 'Obligatoire' : 'Facultative' }}
                  </p>
                </div>
              </div>

              <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-ink-muted">Description</p>
                <p class="mt-2 text-sm leading-6 text-ink-muted">
                  {{ etape.description || 'Aucune description fournie pour cette étape.' }}
                </p>
              </div>

              <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-ink-muted">Phase associée</p>
                <p class="mt-2 text-sm font-semibold text-ink">
                  {{ phase()?.nom || 'Non renseignée' }}
                </p>
              </div>
            </div>
          </app-card>

          <app-card padding="lg">
            <div class="flex flex-col gap-4">
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Synthèse</p>
                <h2 class="mt-2 text-base font-semibold text-ink">Suivi de l’étape</h2>
              </div>

              <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-ink-muted">Nombre de missions</p>
                <p class="mt-2 text-2xl font-bold text-ink">{{ missions().length }}</p>
              </div>

              <div class="rounded-xl border border-line bg-surface-muted/50 p-3">
                <p class="text-[11px] uppercase tracking-wide text-ink-muted">Statut</p>
                <p class="mt-2 text-sm font-medium text-ink">
                  {{ etape.archive ? 'Archivée' : 'Active' }}
                </p>
              </div>

              @if (canManageMissions()) {
                <app-button [fullWidth]="true" size="sm" (click)="ouvrirCreationMission()">
                  <app-icon name="plus" class="size-4" /> Ajouter une mission
                </app-button>
              }
            </div>
          </app-card>
        </div>

        <app-card padding="lg">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-muted">Missions</p>
              <h2 class="mt-1 text-lg font-semibold text-ink">MissionEtape liées</h2>
            </div>
            @if (canManageMissions()) {
              <app-button variant="secondary" size="sm" (click)="ouvrirCreationMission()">
                <app-icon name="plus" class="size-4" /> Ajouter
              </app-button>
            }
          </div>

          @if (missionsLoading()) {
            <div class="mt-5 flex items-center justify-center py-8">
              <div class="h-6 w-6 animate-spin rounded-full border-3 border-accent border-t-transparent"></div>
            </div>
          } @else if (missions().length === 0) {
            <div class="mt-5">
              <app-empty-state
                iconName="folder"
                title="Aucune mission pour cette étape"
                description="Ajoutez une première mission pour structurer le travail attendu des entrepreneurs."
              >
                @if (canManageMissions()) {
                  <app-button size="sm" (click)="ouvrirCreationMission()">
                    <app-icon name="plus" class="size-4" /> Ajouter une mission
                  </app-button>
                }
              </app-empty-state>
            </div>
          } @else {
            <div class="mt-5 grid gap-4">
              @for (mission of missions(); track mission.id) {
                <div class="rounded-2xl border border-line bg-surface-muted/50 p-4 sm:p-5">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0 flex-1">
                      <div class="flex flex-wrap items-center gap-2">
                        <h3 class="text-base font-semibold text-ink">{{ mission.titre }}</h3>
                        <app-badge [status]="mission.obligatoire ? 'info' : 'neutral'" size="sm">
                          {{ mission.obligatoire ? 'Obligatoire' : 'Facultative' }}
                        </app-badge>
                      </div>
                      @if (mission.description) {
                        <p class="mt-2 text-sm leading-6 text-ink-muted">{{ mission.description }}</p>
                      }
                    </div>

                    @if (canManageMissions()) {
                      <div class="flex items-center gap-2">
                        <app-button variant="secondary" size="sm" (click)="ouvrirModificationMission(mission)">
                          <app-icon name="edit-2" class="size-4" /> Modifier
                        </app-button>
                        <app-button variant="ghost" size="sm" (click)="demanderSuppression(mission)">
                          <app-icon name="trash-2" class="size-4" /> Supprimer
                        </app-button>
                      </div>
                    }
                  </div>

                  <div class="mt-4 flex flex-wrap items-center gap-2">
                    <app-badge status="primary" size="sm">Ordre {{ mission.ordre }}</app-badge>
                    @if (mission.livrablesAttenduesCount !== undefined && mission.livrablesAttenduesCount !== null) {
                      <app-badge status="purple" size="sm">
                        {{ mission.livrablesAttenduesCount }} livrable(s) attendu(s)
                      </app-badge>
                    }
                  </div>

                  <div class="mt-5 rounded-xl border border-line bg-surface p-3">
                    <div class="mb-3 flex items-center justify-between gap-3">
                      <h4 class="text-sm font-semibold text-ink">Livrables attendus</h4>
                      @if (canManageMissions()) {
                        <app-button variant="secondary" size="xs" (click)="ouvrirCreationLivrable(mission)">
                          <app-icon name="plus" class="size-3.5" /> Ajouter
                        </app-button>
                      }
                    </div>

                    @if ((livrablesParMission()[mission.id] ?? []).length === 0) {
                      <p class="text-sm text-ink-muted">Aucun livrable attendu configuré pour cette mission.</p>
                    } @else {
                      <div class="space-y-2">
                        @for (livrable of livrablesParMission()[mission.id] ?? []; track livrable.id) {
                          <div class="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div class="min-w-0 flex-1">
                              <div class="flex flex-wrap items-center gap-2">
                                <span class="text-sm font-medium text-ink">{{ livrable.titre }}</span>
                                <app-badge [status]="livrable.obligatoire ? 'info' : 'neutral'" size="sm">
                                  {{ livrable.obligatoire ? 'Obligatoire' : 'Facultatif' }}
                                </app-badge>
                                <app-badge status="primary" size="sm">{{ livrable.type }}</app-badge>
                                @if (livrable.templateType) {
                                  <app-badge status="purple" size="sm">{{ livrable.templateType }}</app-badge>
                                }
                              </div>
                              @if (livrable.description) {
                                <p class="mt-1 text-xs text-ink-muted">{{ livrable.description }}</p>
                              }
                            </div>

                            @if (canManageMissions()) {
                              <div class="flex items-center gap-2">
                                <app-button variant="secondary" size="xs" (click)="ouvrirModificationLivrable(mission, livrable)">
                                  Modifier
                                </app-button>
                                <app-button variant="ghost" size="xs" (click)="demanderSuppressionLivrable(mission, livrable)">
                                  Supprimer
                                </app-button>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </app-card>
      }

      @if (missionModalOpen()) {
        <app-modal
          [title]="missionEnEdition() ? 'Modifier la mission' : 'Ajouter une mission'"
          [subtitle]="etape()?.nom || 'Mission liée à une étape'"
          maxWidth="lg"
          (close)="fermerMissionModal()"
        >
          <form [formGroup]="missionForm" (ngSubmit)="soumettreMission()" class="flex flex-col gap-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <app-form-field label="Titre" [required]="true" [error]="missionForm.controls.titre.touched && missionForm.controls.titre.invalid ? 'Le titre est obligatoire.' : undefined">
                  <app-input
                  formControlName="titre"
                  [invalid]="missionForm.controls.titre.touched && missionForm.controls.titre.invalid"
                  placeholder="Ex : Valider le modèle économique"
                />
                </app-form-field>
              </div>

              <div class="sm:col-span-2">
                <label class="mb-1.5 block text-xs font-semibold text-ink">Description</label>
                <textarea
                  formControlName="description"
                  rows="4"
                  class="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
                  placeholder="Décrivez le livrable attendu..."
                ></textarea>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold text-ink">Ordre <span class="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="1"
                  formControlName="ordre"
                  class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div class="flex flex-col justify-end gap-2">
                <label class="mb-1.5 block text-xs font-semibold text-ink">Type</label>
                <label class="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink">
                  <input type="checkbox" formControlName="obligatoire" class="accent-accent h-4 w-4" />
                  <span>Obligatoire</span>
                </label>
              </div>
            </div>

            @if (modeles().length > 0) {
              <div>
                <label class="mb-1.5 block text-xs font-semibold text-ink">Modèle de mission</label>
                <select
                  formControlName="modeleId"
                  class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                >
                  <option value="">Aucun modèle</option>
                  @for (modele of modeles(); track modele.id) {
                    <option [value]="modele.id">{{ modele.titre }}</option>
                  }
                </select>
              </div>
            }

            @if (missionFormError()) {
              <div class="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-medium text-rose-600">
                {{ missionFormError() }}
              </div>
            }

            <div class="flex justify-end gap-2 border-t border-line pt-4">
              <app-button type="button" variant="ghost" size="sm" (click)="fermerMissionModal()">
                Annuler
              </app-button>
              <app-button type="submit" size="sm" [disabled]="submitting() || missionForm.invalid">
                {{ submitting() ? (missionEnEdition() ? 'Enregistrement...' : 'Création...') : (missionEnEdition() ? 'Enregistrer' : 'Créer la mission') }}
              </app-button>
            </div>
          </form>
        </app-modal>
      }

      @if (deleteTarget(); as missionToDelete) {
        <app-modal title="Supprimer la mission" [subtitle]="missionToDelete.titre" maxWidth="sm" (close)="deleteTarget.set(null)">
          <div class="flex flex-col gap-4">
            <p class="text-sm text-ink-muted">
              Confirmez-vous la suppression de cette mission ? Cette action est irréversible.
            </p>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" size="sm" (click)="deleteTarget.set(null)">
                Annuler
              </app-button>
              <app-button type="button" variant="ghost" size="sm" [disabled]="submitting()" (click)="confirmerSuppression(missionToDelete)">
                {{ submitting() ? 'Suppression...' : 'Supprimer' }}
              </app-button>
            </div>
          </div>
        </app-modal>
      }

      @if (livrableModalOpen()) {
        <app-modal
          [title]="livrableEnEdition() ? 'Modifier le livrable attendu' : 'Ajouter un livrable attendu'"
          [subtitle]="selectedMissionForLivrables()?.titre || 'Mission'"
          maxWidth="lg"
          (close)="fermerLivrableModal()"
        >
          <form [formGroup]="livrableForm" (ngSubmit)="soumettreLivrable()" class="flex flex-col gap-5">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="sm:col-span-2">
                <app-form-field label="Titre du livrable" [required]="true" [error]="livrableForm.controls.titre.touched && livrableForm.controls.titre.invalid ? 'Le titre est obligatoire.' : undefined">
                  <app-input
                  formControlName="titre"
                  [invalid]="livrableForm.controls.titre.touched && livrableForm.controls.titre.invalid"
                  placeholder="Ex : Business Model Canvas"
                />
                </app-form-field>
              </div>

              <div class="sm:col-span-2">
                <label class="mb-1.5 block text-xs font-semibold text-ink">Description</label>
                <textarea
                  formControlName="description"
                  rows="3"
                  class="w-full resize-y rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
                  placeholder="Précisez le contenu attendu."
                ></textarea>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold text-ink">Type</label>
                <select
                  formControlName="type"
                  class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                >
                  <option value="FICHIER">Fichier</option>
                  <option value="LIEN">Lien</option>
                  <option value="TEXTE">Texte</option>
                  <option value="TEMPLATE">Template</option>
                </select>
              </div>

              <div>
                <label class="mb-1.5 block text-xs font-semibold text-ink">Ordre</label>
                <input
                  type="number"
                  min="1"
                  formControlName="ordre"
                  class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink">
                  <input type="checkbox" formControlName="obligatoire" class="accent-accent h-4 w-4" />
                  <span>Obligatoire</span>
                </label>
              </div>

              @if (livrableForm.value.type === 'TEMPLATE') {
                <div class="sm:col-span-2">
                  <label class="mb-1.5 block text-xs font-semibold text-ink">Type de template</label>
                  <input
                    type="text"
                    formControlName="templateType"
                    (input)="initialiserChampsBmcSiNecessaire($any($event.target).value)"
                    class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
                    placeholder="Ex : BMC, BUSINESS_PLAN"
                  />
                  @if (livrableForm.controls.templateType.value.trim().toUpperCase() === 'BMC') {
                    <div class="mt-3 space-y-2">
                      <p class="text-[11px] text-ink-muted">Configurez les rubriques que l’entrepreneur devra remplir.</p>
                      @for (champ of livrableForm.controls.templateFields.value; track champ.id; let index = $index) {
                        <div class="flex gap-2">
                          <input
                            type="text"
                            [value]="champ.label"
                            (input)="modifierChampTemplate(index, $any($event.target).value)"
                            maxlength="120"
                            class="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                            placeholder="Nom de la rubrique"
                          />
                          <button type="button" (click)="supprimerChampTemplate(index)" class="rounded-lg px-3 text-xs text-danger-600 hover:bg-danger-50">Retirer</button>
                        </div>
                      }
                      <button type="button" (click)="ajouterChampTemplate()" class="text-xs font-semibold text-accent hover:underline">
                        Ajouter une rubrique
                      </button>
                    </div>
                  } @else {
                    <p class="mt-1 text-[11px] text-ink-muted">Saisissez « BMC » pour configurer un modèle Business Model Canvas interactif.</p>
                  }
                </div>
              }
            </div>

            @if (livrableFormError()) {
              <div class="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs font-medium text-rose-600">
                {{ livrableFormError() }}
              </div>
            }

            <div class="flex justify-end gap-2 border-t border-line pt-4">
              <app-button type="button" variant="ghost" size="sm" (click)="fermerLivrableModal()">
                Annuler
              </app-button>
              <app-button type="submit" size="sm" [disabled]="submitting() || livrableForm.invalid">
                {{ submitting() ? (livrableEnEdition() ? 'Enregistrement...' : 'Ajout...') : (livrableEnEdition() ? 'Enregistrer' : 'Ajouter') }}
              </app-button>
            </div>
          </form>
        </app-modal>
      }

      @if (livrableDeleteTarget(); as livrableToDelete) {
        <app-modal title="Supprimer le livrable attendu" [subtitle]="livrableToDelete.titre" maxWidth="sm" (close)="livrableDeleteTarget.set(null)">
          <div class="flex flex-col gap-4">
            <p class="text-sm text-ink-muted">
              Confirmez-vous la suppression de ce livrable attendu ?
            </p>
            <div class="flex justify-end gap-2">
              <app-button type="button" variant="ghost" size="sm" (click)="livrableDeleteTarget.set(null)">
                Annuler
              </app-button>
              <app-button type="button" variant="ghost" size="sm" [disabled]="submitting()" (click)="confirmerSuppressionLivrable(livrableToDelete)">
                {{ submitting() ? 'Suppression...' : 'Supprimer' }}
              </app-button>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `,
})
export class EtapeDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly etapeService = inject(EtapeService);
  private readonly livrableAttenduService = inject(LivrableAttenduService);
  private readonly phaseService = inject(PhaseService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly missionModeleService = inject(MissionModeleService);
  private readonly structureContext = inject(StructureContextService);

  readonly etape = signal<Etape | null>(null);
  readonly phase = signal<Phase | null>(null);
  readonly parcours = signal<Parcours | null>(null);
  readonly missions = signal<MissionEtape[]>([]);
  readonly modeles = signal<MissionModele[]>([]);
  readonly loading = signal(false);
  readonly missionsLoading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly flash = signal<string | null>(null);
  readonly missionModalOpen = signal(false);
  readonly deleteTarget = signal<MissionEtape | null>(null);
  readonly missionEnEdition = signal<MissionEtape | null>(null);
  readonly missionFormError = signal<string | null>(null);
  readonly livrableModalOpen = signal(false);
  readonly livrableDeleteTarget = signal<LivrableAttendu | null>(null);
  readonly livrableEnEdition = signal<LivrableAttendu | null>(null);
  readonly selectedMissionForLivrables = signal<MissionEtape | null>(null);
  readonly livrableFormError = signal<string | null>(null);
  readonly livrablesParMission = signal<Record<string, LivrableAttendu[]>>({});
  readonly programmeId = signal<string | null>(null);
  readonly parcoursId = signal<string | null>(null);

  readonly canManageMissions = computed(
    () =>
      this.structureContext.activeRole() === 'ADMIN_STRUCTURE' ||
      this.structureContext.activeRole() === 'COACH',
  );

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: 'Programmes', path: '/incubateur/programmes' }];

    const currentProgrammeId = this.programmeId();
    const currentParcoursId = this.parcoursId();

    if (currentProgrammeId && currentParcoursId) {
      items.push({
        label: 'Parcours',
        path: `/incubateur/programmes/${currentProgrammeId}/parcours/${currentParcoursId}`,
      });
    }

    items.push({ label: this.etape()?.nom || 'Étape' });
    return items;
  });

  readonly missionForm = new FormGroup({
    titre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(120)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    ordre: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    obligatoire: new FormControl(true, { nonNullable: true }),
    modeleId: new FormControl<string | null>(null),
  });

  readonly livrableForm = new FormGroup({
    titre: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    description: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(2000)] }),
    type: new FormControl<'FICHIER' | 'LIEN' | 'TEXTE' | 'TEMPLATE'>('FICHIER', { nonNullable: true }),
    ordre: new FormControl(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    obligatoire: new FormControl(true, { nonNullable: true }),
    templateType: new FormControl('', { nonNullable: true }),
    templateFields: new FormControl<TemplateField[]>([], { nonNullable: true }),
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const etapeId = params.get('id');
        if (!etapeId) {
          this.error.set('Étape introuvable.');
          return;
        }

        this.loadEtape(etapeId);
      });

    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const nextParcoursId = params.get('parcoursId');
        const nextProgrammeId = params.get('programmeId');

        this.parcoursId.set(nextParcoursId);
        this.programmeId.set(nextProgrammeId);

        if (nextParcoursId) {
          this.parcoursService
            .getParcoursById(nextParcoursId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (parcours) => this.parcours.set(parcours),
              error: () => this.parcours.set(null),
            });
        } else {
          this.parcours.set(null);
        }
      });

    this.loadModeles();
  }

  private loadModeles(): void {
    this.missionModeleService
      .getModeles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (modeles) => this.modeles.set(modeles),
        error: () => this.modeles.set([]),
      });
  }

  private loadEtape(etapeId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.flash.set(null);

    forkJoin({
      etape: this.etapeService.getEtapeById(etapeId),
      missions: this.etapeService.getMissionsByEtapeId(etapeId),
    })
      .pipe(
        catchError(() => {
          this.error.set('Impossible de charger l’étape et ses missions.');
          this.loading.set(false);
          return of({ etape: null as Etape | null, missions: [] as MissionEtape[] });
        }),
      )
      .subscribe({
        next: ({ etape, missions }) => {
          const missionsTriees = (missions ?? []).sort((a, b) => a.ordre - b.ordre);
          this.etape.set(etape ?? null);
          this.missions.set(missionsTriees);
          this.livrablesParMission.set({});

          missionsTriees.forEach((mission) => this.loadLivrablesForMission(mission));

          if (etape?.phaseId) {
            this.phaseService
              .getPhaseById(etape.phaseId)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: (phase) => this.phase.set(phase),
                error: () => this.phase.set(null),
              });
          } else {
            this.phase.set(null);
          }

          this.loading.set(false);
        },
      });
  }

  private loadLivrablesForMission(mission: MissionEtape): void {
    const etape = this.etape();
    if (!etape) {
      return;
    }

    this.livrableAttenduService
      .getLivrablesByMissionEtape(etape.id, mission.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (livrables) => {
          const sortedLivrables = [...livrables].sort((a, b) => (a.ordre ?? 999) - (b.ordre ?? 999));
          this.livrablesParMission.update((current) => ({
            ...current,
            [mission.id]: sortedLivrables,
          }));

          this.missions.update((current) =>
            current.map((m) => (m.id === mission.id ? { ...m, livrablesAttenduesCount: sortedLivrables.length } : m)),
          );
        },
        error: () => {
          this.livrablesParMission.update((current) => ({
            ...current,
            [mission.id]: [],
          }));

          this.missions.update((current) =>
            current.map((m) => (m.id === mission.id ? { ...m, livrablesAttenduesCount: 0 } : m)),
          );
        },
      });
  }

  ouvrirCreationMission(): void {
    if (!this.etape()) {
      return;
    }

    this.missionEnEdition.set(null);
    this.missionFormError.set(null);
    this.missionForm.reset({
      titre: '',
      description: '',
      ordre: this.missions().length + 1,
      obligatoire: true,
      modeleId: null,
    });
    this.missionModalOpen.set(true);
  }

  ouvrirModificationMission(mission: MissionEtape): void {
    if (!this.etape()) {
      return;
    }

    this.missionEnEdition.set(mission);
    this.missionFormError.set(null);
    this.missionForm.reset({
      titre: mission.titre,
      description: mission.description ?? '',
      ordre: mission.ordre,
      obligatoire: mission.obligatoire,
      modeleId: mission.modeleId ?? null,
    });
    this.missionModalOpen.set(true);
  }

  fermerMissionModal(): void {
    this.missionModalOpen.set(false);
    this.missionEnEdition.set(null);
    this.missionFormError.set(null);
    this.missionForm.reset({
      titre: '',
      description: '',
      ordre: this.missions().length + 1,
      obligatoire: true,
      modeleId: null,
    });
  }

  soumettreMission(): void {
    const etape = this.etape();
    if (!etape || this.missionForm.invalid) {
      this.missionForm.markAllAsTouched();
      this.missionFormError.set('Veuillez corriger les informations avant de continuer.');
      return;
    }

    const payload: CreateMissionEtapeRequest | UpdateMissionEtapeRequest = {
      titre: this.missionForm.value.titre?.trim() ?? '',
      description: this.missionForm.value.description?.trim() || undefined,
      ordre: Number(this.missionForm.value.ordre ?? this.missions().length + 1),
      obligatoire: Boolean(this.missionForm.value.obligatoire),
      modeleId: this.missionForm.value.modeleId || undefined,
    };

    this.submitting.set(true);
    this.missionFormError.set(null);

    const request$ = this.missionEnEdition()
      ? this.etapeService.updateMission(etape.id, this.missionEnEdition()!.id, payload)
      : this.etapeService.createMission(etape.id, payload as CreateMissionEtapeRequest);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.flash.set(
            this.missionEnEdition() ? 'Mission modifiée avec succès.' : 'Mission créée avec succès.',
          );
          this.fermerMissionModal();
          this.loadEtape(etape.id);
          this.submitting.set(false);
        },
        error: () => {
          this.missionFormError.set('La mission n’a pas pu être enregistrée. Vérifiez les informations puis réessayez.');
          this.submitting.set(false);
        },
      });
  }

  demanderSuppression(mission: MissionEtape): void {
    this.deleteTarget.set(mission);
  }

  confirmerSuppression(mission: MissionEtape): void {
    const etape = this.etape();
    if (!etape) {
      return;
    }

    this.submitting.set(true);
    this.etapeService
      .deleteMission(etape.id, mission.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.deleteTarget.set(null);
          this.flash.set('Mission supprimée avec succès.');
          this.loadEtape(etape.id);
          this.submitting.set(false);
        },
        error: () => {
          this.flash.set(null);
          this.missionFormError.set('La suppression a échoué. Veuillez réessayer.');
          this.submitting.set(false);
        },
      });
  }

  ouvrirCreationLivrable(mission: MissionEtape): void {
    if (!this.etape() || !this.canManageMissions()) {
      return;
    }

    const ordre = this.calculerOrdreLivrable(mission);
    this.selectedMissionForLivrables.set(mission);
    this.livrableEnEdition.set(null);
    this.livrableFormError.set(null);
    this.livrableForm.reset({
      titre: '',
      description: '',
      type: 'FICHIER',
      ordre,
      obligatoire: true,
      templateType: '',
      templateFields: [],
    });
    this.livrableModalOpen.set(true);
  }

  ouvrirModificationLivrable(mission: MissionEtape, livrable: LivrableAttendu): void {
    if (!this.etape() || !this.canManageMissions()) {
      return;
    }

    this.selectedMissionForLivrables.set(mission);
    this.livrableEnEdition.set(livrable);
    this.livrableFormError.set(null);
    this.livrableForm.reset({
      titre: livrable.titre,
      description: livrable.description ?? '',
      type: livrable.type,
      ordre: livrable.ordre ?? this.calculerOrdreLivrable(mission),
      obligatoire: livrable.obligatoire,
      templateType: livrable.templateType ?? '',
      templateFields: livrable.templateFields ?? [],
    });
    this.livrableModalOpen.set(true);
  }

  fermerLivrableModal(): void {
    this.livrableModalOpen.set(false);
    this.livrableEnEdition.set(null);
    this.selectedMissionForLivrables.set(null);
    this.livrableFormError.set(null);
    this.livrableForm.reset({
      titre: '',
      description: '',
      type: 'FICHIER',
      ordre: 1,
      obligatoire: true,
      templateType: '',
      templateFields: [],
    });
  }

  initialiserChampsBmcSiNecessaire(templateTypeValue = this.livrableForm.controls.templateType.value): void {
    const { type, templateFields } = this.livrableForm.getRawValue();
    if (type !== 'TEMPLATE' || templateTypeValue.trim().toUpperCase() !== 'BMC') {
      if (templateFields.length > 0) {
        this.livrableForm.controls.templateFields.setValue([]);
      }
      return;
    }
    if (templateFields.length > 0) {
      return;
    }
    this.livrableForm.controls.templateFields.setValue([
      { id: 'valuePropositions', label: 'Propositions de valeur' },
      { id: 'customerSegments', label: 'Segments de clientèle' },
      { id: 'channels', label: 'Canaux' },
      { id: 'customerRelationships', label: 'Relations clients' },
      { id: 'revenueStreams', label: 'Sources de revenus' },
      { id: 'keyResources', label: 'Ressources clés' },
      { id: 'keyActivities', label: 'Activités clés' },
      { id: 'keyPartners', label: 'Partenaires clés' },
      { id: 'costStructure', label: 'Structure des coûts' },
    ]);
  }

  modifierChampTemplate(index: number, label: string): void {
    const fields = [...this.livrableForm.controls.templateFields.value];
    fields[index] = { ...fields[index], label };
    this.livrableForm.controls.templateFields.setValue(fields);
  }

  ajouterChampTemplate(): void {
    this.livrableForm.controls.templateFields.setValue([
      ...this.livrableForm.controls.templateFields.value,
      { id: crypto.randomUUID(), label: '' },
    ]);
  }

  supprimerChampTemplate(index: number): void {
    this.livrableForm.controls.templateFields.setValue(
      this.livrableForm.controls.templateFields.value.filter((_, fieldIndex) => fieldIndex !== index),
    );
  }

  demanderSuppressionLivrable(mission: MissionEtape, livrable: LivrableAttendu): void {
    if (!this.canManageMissions()) {
      return;
    }
    this.selectedMissionForLivrables.set(mission);
    this.livrableDeleteTarget.set(livrable);
  }

  confirmerSuppressionLivrable(livrable: LivrableAttendu): void {
    const etape = this.etape();
    const mission = this.selectedMissionForLivrables();
    if (!etape || !mission) {
      return;
    }

    this.submitting.set(true);
    this.livrableFormError.set(null);

    this.livrableAttenduService
      .deleteLivrableAttendu(etape.id, mission.id, livrable.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.livrableDeleteTarget.set(null);
          this.flash.set('Livrable supprimé avec succès.');
          this.loadLivrablesForMission(mission);
          this.submitting.set(false);
        },
        error: () => {
          this.flash.set(null);
          this.livrableFormError.set('La suppression du livrable a échoué. Veuillez réessayer.');
          this.submitting.set(false);
        },
      });
  }

  soumettreLivrable(): void {
    const etape = this.etape();
    const mission = this.selectedMissionForLivrables();

    if (!etape || !mission || this.livrableForm.invalid) {
      this.livrableForm.markAllAsTouched();
      this.livrableFormError.set('Veuillez corriger les informations avant de continuer.');
      return;
    }

    const payload = {
      titre: this.livrableForm.value.titre?.trim() ?? '',
      description: this.livrableForm.value.description?.trim() || undefined,
      ordre: Number(this.livrableForm.value.ordre ?? 1),
      obligatoire: Boolean(this.livrableForm.value.obligatoire),
      type: (this.livrableForm.value.type ?? 'FICHIER') as LivrableAttendu['type'],
      templateType:
        this.livrableForm.value.type === 'TEMPLATE'
          ? this.livrableForm.value.templateType?.trim() || undefined
          : undefined,
      templateFields:
        this.livrableForm.value.type === 'TEMPLATE'
          && this.livrableForm.value.templateType?.trim().toUpperCase() === 'BMC'
          ? this.livrableForm.value.templateFields ?? []
          : undefined,
    };

    this.submitting.set(true);
    this.livrableFormError.set(null);

    const request$ = this.livrableEnEdition()
      ? this.livrableAttenduService.updateLivrableAttendu(
          etape.id,
          mission.id,
          this.livrableEnEdition()!.id,
          payload,
        )
      : this.livrableAttenduService.createLivrableAttendu(etape.id, mission.id, payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.flash.set(
            this.livrableEnEdition() ? 'Livrable modifié avec succès.' : 'Livrable ajouté avec succès.',
          );
          this.fermerLivrableModal();
          this.loadLivrablesForMission(mission);
          this.submitting.set(false);
        },
        error: () => {
          this.livrableFormError.set('Le livrable n’a pas pu être enregistré. Vérifiez les informations puis réessayez.');
          this.submitting.set(false);
        },
      });
  }

  private calculerOrdreLivrable(mission: MissionEtape): number {
    const livrables = this.livrablesParMission()[mission.id] ?? [];
    const maxOrdre = livrables.reduce((max, livrable) => Math.max(max, livrable.ordre ?? 0), 0);
    return maxOrdre + 1;
  }

  retourVersParcours(): void {
    const currentProgrammeId = this.programmeId();
    const currentParcoursId = this.parcoursId();

    if (currentProgrammeId && currentParcoursId) {
      this.router.navigate([
        '/incubateur/programmes',
        currentProgrammeId,
        'parcours',
        currentParcoursId,
      ]);
      return;
    }

    if (currentProgrammeId) {
      this.router.navigate(['/incubateur/programmes', currentProgrammeId]);
      return;
    }

    this.router.navigate(['/incubateur/programmes']);
  }
}
