import { Component, inject, output, signal, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { MissionService } from '../../../../core/services/mission.service';
import { MissionModeleService } from '../../../../core/services/mission-modele.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { Cohorte } from '../../../../core/models/cohorte.model';
import { CreateCohorteRequest } from '../../../../core/models/cohorte.model';
import { CreateMissionRequest, PrioriteMission } from '../../../../core/models/mission.model';
import { MissionModele } from '../../../../core/models/mission-modele.model';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';

export type WizardStep = 1 | 2 | 3 | 4;
export type MissionSource = 'NOUVELLE' | 'CATALOGUE';

export interface MissionCreeeRecap {
  titre: string;
  description?: string;
  dateEcheance?: string;
  priorite: PrioriteMission;
  depuisModele?: boolean;
  enregistreCommeModele?: boolean;
}

import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../../core/services/translation.service';

@Component({
  selector: 'app-nouvelle-cohorte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    Icon,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    ModalComponent,
    EmptyStateComponent,
    TranslatePipe,
  ],
  template: `
    <app-modal
      [title]="modalTitle()"
      [subtitle]="modalSubtitle()"
      maxWidth="2xl"
      (close)="fermer()"
    >
      <!-- STEP INDICATOR / PROGRESS BAR -->
      <div class="flex items-center justify-between border-b border-line pb-4 mb-5">
        <div class="flex items-center gap-1 sm:gap-2">
          <!-- Étape 1 -->
          <button
            type="button"
            (click)="allerAEtape(1)"
            [disabled]="currentStep() === 4"
            class="flex items-center gap-1.5 cursor-pointer disabled:cursor-default"
          >
            <div
              class="flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
              [class]="currentStep() >= 1 ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted'"
            >
              @if (currentStep() > 1) { ✓ } @else { 1 }
            </div>
            <span class="text-xs font-semibold hidden sm:inline" [class]="currentStep() === 1 ? 'text-ink font-bold' : 'text-ink-muted'">
              Cohorte
            </span>
          </button>

          <span class="text-line mx-0.5 sm:mx-1">›</span>

          <!-- Étape 2 -->
          <button
            type="button"
            (click)="allerAEtape(2)"
            [disabled]="currentStep() < 2 || currentStep() === 4"
            class="flex items-center gap-1.5 cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            <div
              class="flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
              [class]="currentStep() >= 2 ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted'"
            >
              @if (currentStep() > 2) { ✓ } @else { 2 }
            </div>
            <span class="text-xs font-semibold hidden sm:inline" [class]="currentStep() === 2 ? 'text-ink font-bold' : 'text-ink-muted'">
              Entrepreneurs
            </span>
          </button>

          <span class="text-line mx-0.5 sm:mx-1">›</span>

          <!-- Étape 3 -->
          <button
            type="button"
            (click)="allerAEtape(3)"
            [disabled]="currentStep() < 3 || currentStep() === 4"
            class="flex items-center gap-1.5 cursor-pointer disabled:cursor-default disabled:opacity-50"
          >
            <div
              class="flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
              [class]="currentStep() >= 3 ? 'bg-accent text-white' : 'bg-surface-muted text-ink-muted'"
            >
              @if (currentStep() > 3) { ✓ } @else { 3 }
            </div>
            <span class="text-xs font-semibold hidden sm:inline" [class]="currentStep() === 3 ? 'text-ink font-bold' : 'text-ink-muted'">
              Missions
            </span>
          </button>

          <span class="text-line mx-0.5 sm:mx-1">›</span>

          <!-- Étape 4 -->
          <div class="flex items-center gap-1.5">
            <div
              class="flex size-6 sm:size-7 items-center justify-center rounded-full text-xs font-bold transition-colors"
              [class]="currentStep() === 4 ? 'bg-emerald-600 text-white' : 'bg-surface-muted text-ink-muted'"
            >
              4
            </div>
            <span class="text-xs font-semibold hidden sm:inline" [class]="currentStep() === 4 ? 'text-ink font-bold' : 'text-ink-muted'">
              Récapitulatif
            </span>
          </div>
        </div>

        <span class="text-xs font-medium text-ink-muted">Étape {{ currentStep() }} sur 4</span>
      </div>

      <!-- ====================================================================== -->
      <!-- ÉTAPE 1 : CRÉER LA COHORTE -->
      <!-- ====================================================================== -->
      @if (currentStep() === 1) {
        <form [formGroup]="cohorteForm" (ngSubmit)="creerCohorte()" class="flex flex-col gap-4">
          <app-form-field [label]="'cohortes.wizard.etape1.nom' | translate" [required]="true" [error]="getFieldError('nom')">
            <app-input
              formControlName="nom"
              [placeholder]="'cohortes.wizard.etape1.nomPlaceholder' | translate"
              [invalid]="isFieldInvalid('nom')"
            />
          </app-form-field>

          <app-form-field [label]="'cohortes.wizard.etape1.secteur' | translate" [required]="true" [error]="getFieldError('secteur')">
            <app-input
              formControlName="secteur"
              [placeholder]="'cohortes.wizard.etape1.secteurPlaceholder' | translate"
              [invalid]="isFieldInvalid('secteur')"
            />
          </app-form-field>

          <app-form-field [label]="'cohortes.wizard.etape1.dateDebut' | translate" [required]="true" [error]="getFieldError('dateDemarrage')">
            <app-input
              type="date"
              formControlName="dateDemarrage"
              [invalid]="isFieldInvalid('dateDemarrage')"
            />
          </app-form-field>

          @if (erreurCohorte()) {
            <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {{ erreurCohorte() }}
            </div>
          }

          <div class="flex items-center justify-end gap-3 border-t border-line pt-4 mt-2">
            <app-button type="button" variant="ghost" size="sm" (click)="fermer()">
              {{ 'action.annuler' | translate }}
            </app-button>
            <app-button type="submit" size="sm" [disabled]="cohorteForm.invalid || creationEnCours()">
              @if (creationEnCours()) {
                <span>{{ 'cohortes.wizard.etape1.creationEnCours' | translate }}</span>
              } @else {
                <span>{{ 'action.suivant' | translate }} : {{ 'cohortes.wizard.etape2.titre' | translate }} →</span>
              }
            </app-button>
          </div>
        </form>
      }

      <!-- ====================================================================== -->
      <!-- ÉTAPE 2 : AJOUTER LES ENTREPRENEURS -->
      <!-- ====================================================================== -->
      @else if (currentStep() === 2) {
        <div class="flex flex-col gap-5">
          <!-- Bandeau de contexte cohorte active en lecture seule -->
          <div class="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 p-3">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{{ 'cohortes.wizard.etape2.cohorteContexte' | translate }}</span>
              <span class="text-sm font-bold text-ink">{{ createdCohorte()?.nom }}</span>
            </div>
            <button
              type="button"
              (click)="currentStep.set(1)"
              class="text-xs font-semibold text-accent hover:underline cursor-pointer"
            >
              {{ 'cohortes.wizard.etape2.modifier' | translate }}
            </button>
          </div>

          <!-- Zone Multi-Emails (Chip Input) -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-ink-muted">
              {{ 'cohortes.wizard.etape2.champEmail' | translate }} ({{ pendingEmails().length }})
            </label>
            <div class="flex min-h-[44px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-2 transition-all focus-within:border-accent">
              @for (email of pendingEmails(); track email) {
                <span
                  (dblclick)="editerEmail(email)"
                  title="Double-cliquez pour modifier"
                  class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink transition-all hover:border-accent/40"
                >
                  <span class="select-none">{{ email }}</span>
                  <button
                    type="button"
                    (click)="retirerEmail(email); $event.stopPropagation()"
                    class="text-ink-muted hover:text-rose-600 cursor-pointer transition-colors flex items-center justify-center rounded-full p-0.5"
                    title="Supprimer"
                  >
                    <app-icon name="close" class="size-3" />
                  </button>
                </span>
              }

              <input
                type="email"
                [(ngModel)]="emailInputValue"
                (keydown)="onEmailKeyDown($event)"
                [placeholder]="pendingEmails().length === 0 ? ('cohortes.wizard.etape2.emailPlaceholder' | translate) : 'Ajouter un autre email...'"
                class="flex-1 min-w-[200px] border-none bg-transparent px-1 py-1 text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none"
              />
            </div>
            <span class="text-[11px] text-ink-muted">
              Tapez une adresse puis appuyez sur <strong>Entrée</strong> ou <strong>Virgule</strong> pour l'ajouter.
            </span>
          </div>

          <!-- Bouton d'envoi des invitations pour ces emails -->
          @if (pendingEmails().length > 0 || emailInputValue.trim()) {
            <div class="flex justify-end">
              <app-button
                size="sm"
                [disabled]="invitationEnCours()"
                (click)="inviterEntrepreneurs()"
              >
                @if (invitationEnCours()) {
                  <span>{{ 'cohortes.wizard.etape2.envoiEnCours' | translate }}</span>
                } @else {
                  <app-icon name="plus" class="size-3.5 mr-1" />
                  <span>{{ 'cohortes.wizard.etape2.envoyerInvitations' | translate }} ({{ totalPendingCount() }})</span>
                }
              </app-button>
            </div>
          }

          <!-- Feedback invitations réussies -->
          @if (invitedEmails().length > 0) {
            <div class="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-400 flex flex-col gap-1.5">
              <div class="flex items-center gap-2 font-semibold">
                <app-icon name="check" class="size-4 shrink-0" />
                <span>{{ invitedEmails().length }} {{ 'cohortes.wizard.etape2.invitesSucces' | translate }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5 mt-1">
                @for (m of invitedEmails(); track m) {
                  <span class="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                    {{ m }}
                  </span>
                }
              </div>
            </div>
          }

          @if (erreurInvitation()) {
            <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {{ erreurInvitation() }}
            </div>
          }

          <!-- Actions de navigation de l'étape 2 -->
          <div class="flex items-center justify-between border-t border-line pt-4 mt-2">
            <app-button variant="ghost" size="sm" (click)="currentStep.set(1)">
              ← {{ 'action.precedent' | translate }}
            </app-button>

            <div class="flex items-center gap-2">
              <app-button variant="ghost" size="sm" (click)="currentStep.set(3)">
                {{ invitedEmails().length === 0 ? ('action.passer' | translate) : ('action.continuer' | translate) }}
              </app-button>

              <app-button size="sm" (click)="currentStep.set(3)">
                <span>{{ 'action.suivant' | translate }} : {{ 'cohortes.wizard.etape3.titre' | translate }} →</span>
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- ====================================================================== -->
      <!-- ÉTAPE 3 : AJOUTER LES MISSIONS -->
      <!-- ====================================================================== -->
      @else if (currentStep() === 3) {
        <div class="flex flex-col gap-5">
          <!-- Contexte cohorte active -->
          <div class="flex items-center justify-between rounded-xl border border-line bg-surface-muted/40 p-3">
            <div class="flex flex-col">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Cohorte active</span>
              <span class="text-sm font-bold text-ink">{{ createdCohorte()?.nom }}</span>
            </div>
            <span class="text-xs font-semibold text-accent">
              {{ addedMissions().length }} mission(s) configurée(s)
            </span>
          </div>

          <!-- Onglets de choix de source de mission -->
          <div class="flex gap-2 border-b border-line pb-1">
            <button
              type="button"
              (click)="missionSource.set('NOUVELLE')"
              class="border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
              [class]="missionSource() === 'NOUVELLE' ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'"
            >
              {{ 'cohortes.wizard.etape3.optionA' | translate }}
            </button>
            <button
              type="button"
              (click)="missionSource.set('CATALOGUE')"
              class="border-b-2 px-3 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              [class]="missionSource() === 'CATALOGUE' ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'"
            >
              <span>{{ 'cohortes.wizard.etape3.optionB' | translate }}</span>
              <span class="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] text-ink-muted">
                {{ modelesDisponibles().length }}
              </span>
            </button>
          </div>

          <!-- OPTION A : FORMULAIRE NOUVELLE MISSION -->
          @if (missionSource() === 'NOUVELLE') {
            <form [formGroup]="missionForm" (ngSubmit)="ajouterNouvelleMission()" class="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-ink-muted">{{ 'cohortes.wizard.etape3.titreMission' | translate }} *</label>
                <input
                  formControlName="titre"
                  [placeholder]="'cohortes.wizard.etape3.titrePlaceholder' | translate"
                  class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-ink-muted">{{ 'cohortes.wizard.etape3.descriptionMission' | translate }}</label>
                <textarea
                  formControlName="description"
                  rows="2"
                  [placeholder]="'cohortes.wizard.etape3.descriptionPlaceholder' | translate"
                  class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none resize-none"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-ink-muted">{{ 'cohortes.wizard.etape3.dateEcheance' | translate }}</label>
                  <input
                    type="date"
                    formControlName="dateEcheance"
                    class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-ink-muted">{{ 'cohortes.wizard.etape3.priorite' | translate }}</label>
                  <select
                    formControlName="priorite"
                    class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="BASSE">{{ 'mission.priorite.FAIBLE' | translate }}</option>
                    <option value="MOYENNE">{{ 'mission.priorite.MOYENNE' | translate }}</option>
                    <option value="HAUTE">{{ 'mission.priorite.ELEVEE' | translate }}</option>
                    <option value="URGENTE">{{ 'mission.priorite.URGENTE' | translate }}</option>
                  </select>
                </div>
              </div>

              <!-- Option discrète : Enregistrer comme modèle réutilisable -->
              <label class="flex items-center gap-2 text-xs text-ink cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  formControlName="enregistrerCommeModele"
                  class="rounded border-line text-accent focus:ring-accent"
                />
                <span>{{ 'cohortes.wizard.etape3.sauvegarderModele' | translate }}</span>
              </label>

              <div class="flex justify-end pt-2">
                <app-button
                  type="submit"
                  size="sm"
                  [disabled]="missionForm.invalid || missionEnCours()"
                >
                  <app-icon name="plus" class="size-3.5 mr-1" />
                  <span>{{ missionEnCours() ? 'Ajout…' : ('cohortes.wizard.etape3.ajouterMission' | translate) }}</span>
                </app-button>
              </div>
            </form>
          }

          <!-- OPTION B : CATALOGUE DE MISSIONS MODÈLES -->
          @else {
            <div class="flex flex-col gap-3">
              @if (modelesDisponibles().length === 0) {
                <app-empty-state
                  title="Aucune mission modèle dans le catalogue"
                  description="Vous pouvez créer votre première mission depuis l'Option A et cocher 'Enregistrer comme modèle réutilisable'."
                  iconName="missions"
                />
              } @else {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  @for (modele of modelesDisponibles(); track modele.id) {
                    <div
                      (click)="selectionnerModele(modele)"
                      class="flex flex-col justify-between rounded-xl border p-3 cursor-pointer transition-all hover:border-accent"
                      [class]="selectedModele()?.id === modele.id ? 'border-accent bg-accent/5 ring-1 ring-accent' : 'border-line bg-surface'"
                    >
                      <div>
                        <div class="flex items-start justify-between gap-2">
                          <span class="text-xs font-bold text-ink">{{ modele.titre }}</span>
                          <span class="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-surface-muted text-ink-muted">
                            {{ modele.prioriteParDefaut }}
                          </span>
                        </div>
                        <p class="mt-1 text-[11px] text-ink-muted line-clamp-2">
                          {{ modele.description || 'Aucune consigne prédéfinie' }}
                        </p>
                      </div>
                      <span class="mt-2 text-[10px] font-semibold text-accent self-end">
                        {{ selectedModele()?.id === modele.id ? '✓ Sélectionné' : 'Choisir ce modèle' }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Formulaire de confirmation du modèle avec date d'échéance -->
                @if (selectedModele(); as m) {
                  <div class="rounded-xl border border-accent/40 bg-accent/5 p-3 flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold text-ink">Modèle : {{ m.titre }}</span>
                      <button type="button" (click)="selectedModele.set(null)" class="text-xs text-ink-muted hover:text-ink">
                        ✕ Déselectionner
                      </button>
                    </div>

                    <div class="flex flex-col sm:flex-row gap-3 items-end">
                      <div class="flex-1 flex flex-col gap-1 w-full">
                        <label class="text-xs font-semibold text-ink-muted">ÉCHÉANCE PROPRE À CETTE COHORTE *</label>
                        <input
                          type="date"
                          [(ngModel)]="modeleDateEcheance"
                          class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none w-full"
                        />
                      </div>

                      <app-button
                        size="sm"
                        [disabled]="missionEnCours()"
                        (click)="ajouterMissionDepuisModele()"
                      >
                        <app-icon name="plus" class="size-3.5 mr-1" />
                        <span>{{ missionEnCours() ? 'Ajout…' : 'Appliquer ce modèle' }}</span>
                      </app-button>
                    </div>
                  </div>
                }
              }
            </div>
          }

          <!-- Liste des missions déjà configurées dans cette étape -->
          @if (addedMissions().length > 0) {
            <div class="flex flex-col gap-2 pt-2 border-t border-line">
              <span class="text-xs font-bold text-ink">{{ 'cohortes.wizard.etape3.missionsConfigurees' | translate }} ({{ addedMissions().length }}) :</span>
              <div class="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                @for (m of addedMissions(); track m.titre) {
                  <div class="flex items-center justify-between p-3 text-xs gap-3">
                    <div class="flex items-center gap-2 min-w-0">
                      <app-icon name="missions" class="size-4 text-accent shrink-0" />
                      <div class="flex flex-col min-w-0">
                        <span class="font-bold text-ink truncate">{{ m.titre }}</span>
                        <span class="text-[11px] text-ink-muted truncate">
                          Échéance : {{ m.dateEcheance || 'Non définie' }} · Priorité : {{ m.priorite }}
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                      @if (m.depuisModele) {
                        <span class="rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-600">{{ 'cohortes.wizard.etape3.modeleUtilise' | translate }}</span>
                      }
                      @if (m.enregistreCommeModele) {
                        <span class="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-600">+ {{ 'cohortes.wizard.etape3.enregistreModele' | translate }}</span>
                      }
                    </div>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Actions de navigation de l'étape 3 -->
          <div class="flex items-center justify-between border-t border-line pt-4 mt-2">
            <app-button variant="ghost" size="sm" (click)="currentStep.set(2)">
              ← {{ 'action.precedent' | translate }}
            </app-button>

            <div class="flex items-center gap-2">
              <app-button variant="ghost" size="sm" (click)="currentStep.set(4)">
                {{ addedMissions().length === 0 ? ('action.passer' | translate) : ('action.continuer' | translate) }}
              </app-button>

              <app-button size="sm" (click)="currentStep.set(4)">
                <span>{{ 'cohortes.wizard.etape3.finaliser' | translate }} →</span>
              </app-button>
            </div>
          </div>
        </div>
      }

      <!-- ====================================================================== -->
      <!-- ÉTAPE 4 : RÉCAPITULATIF RÉEL -->
      <!-- ====================================================================== -->
      @else if (currentStep() === 4) {
        <div class="flex flex-col gap-6 text-center py-2">
          <!-- Icône de succès -->
          <div class="flex size-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mx-auto border border-emerald-500/20">
            <app-icon name="check" class="size-7" />
          </div>

          <div>
            <h2 class="text-xl font-extrabold text-ink">{{ 'cohortes.wizard.etape4.titre' | translate }}</h2>
            <p class="mt-1 text-xs sm:text-sm text-ink-muted">
              {{ 'cohortes.wizard.etape4.description' | translate }} (<strong>{{ createdCohorte()?.nom }}</strong>)
            </p>
          </div>

          <!-- Grille de métriques réelles (conforme à la section 12) -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            <div class="rounded-xl border border-line bg-surface p-4 flex flex-col justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{{ 'cohortes.wizard.etape4.kpiEntrepreneurs' | translate }}</span>
              <div class="mt-2 text-2xl font-extrabold text-ink">{{ invitedEmails().length }}</div>
              <span class="text-[11px] text-ink-muted mt-1">invitation(s) envoyée(s)</span>
            </div>

            <div class="rounded-xl border border-line bg-surface p-4 flex flex-col justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{{ 'cohortes.wizard.etape4.kpiMissions' | translate }}</span>
              <div class="mt-2 text-2xl font-extrabold text-ink">{{ addedMissions().length }}</div>
              <span class="text-[11px] text-ink-muted mt-1">jalon(s) programmé(s)</span>
            </div>

            <div class="rounded-xl border border-line bg-surface p-4 flex flex-col justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">{{ 'cohortes.wizard.etape4.kpiModeles' | translate }}</span>
              <div class="mt-2 text-2xl font-extrabold text-accent">{{ modelesUtilisesCount() }}</div>
              <span class="text-[11px] text-ink-muted mt-1">depuis le catalogue</span>
            </div>
          </div>

          <!-- Actions finales -->
          <div class="flex items-center justify-center gap-3 border-t border-line pt-5 mt-2">
            <app-button variant="ghost" size="sm" (click)="terminerEtFermer()">
              {{ 'action.terminer' | translate }}
            </app-button>

            <app-button size="sm" (click)="ouvrirLaCohorte()">
              <app-icon name="cohortes" class="size-4 mr-1.5" />
              <span>{{ 'action.ouvrirCohorte' | translate }}</span>
            </app-button>
          </div>
        </div>
      }
    </app-modal>
  `,
})
export class NouvelleCohorte implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cohorteService = inject(CohorteService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly missionService = inject(MissionService);
  private readonly missionModeleService = inject(MissionModeleService);
  private readonly structureContext = inject(StructureContextService);
  private readonly translation = inject(TranslationService);
  private readonly destroyRef = inject(DestroyRef);

  readonly closed = output<void>();
  readonly created = output<void>();

  // État du Wizard
  protected readonly currentStep = signal<WizardStep>(1);
  protected readonly createdCohorte = signal<Cohorte | null>(null);

  // Étape 1
  protected readonly creationEnCours = signal(false);
  protected readonly erreurCohorte = signal<string | null>(null);
  protected readonly cohorteForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(3)]],
    secteur: ['', [Validators.required]],
    dateDemarrage: ['', [Validators.required]],
  });

  // Étape 2 : Entrepreneurs
  protected readonly pendingEmails = signal<string[]>([]);
  protected emailInputValue = '';
  protected readonly invitedEmails = signal<string[]>([]);
  protected readonly invitationEnCours = signal(false);
  protected readonly erreurInvitation = signal<string | null>(null);

  // Étape 3 : Missions
  protected readonly missionSource = signal<MissionSource>('NOUVELLE');
  protected readonly modelesDisponibles = signal<MissionModele[]>([]);
  protected readonly selectedModele = signal<MissionModele | null>(null);
  protected modeleDateEcheance = '';
  protected readonly addedMissions = signal<MissionCreeeRecap[]>([]);
  protected readonly missionEnCours = signal(false);
  protected readonly modelesUtilisesCount = signal(0);

  protected readonly missionForm = this.fb.nonNullable.group({
    titre: ['', [Validators.required]],
    description: [''],
    dateEcheance: [''],
    priorite: ['MOYENNE' as PrioriteMission],
    enregistrerCommeModele: [false],
  });

  ngOnInit(): void {
    // Précharger les modèles du catalogue
    this.missionModeleService
      .getModeles()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (modeles) => this.modelesDisponibles.set(modeles || []),
        error: (err) => console.error('Erreur chargement modèles:', err),
      });
  }

  protected modalTitle(): string {
    switch (this.currentStep()) {
      case 1:
        return this.translation.t('cohortes.wizard.etape1.titre');
      case 2:
        return this.translation.t('cohortes.wizard.etape2.titre');
      case 3:
        return this.translation.t('cohortes.wizard.etape3.titre');
      case 4:
        return this.translation.t('cohortes.wizard.etape4.titre');
    }
  }

  protected modalSubtitle(): string {
    switch (this.currentStep()) {
      case 1:
        return this.translation.t('cohortes.wizard.etape1.description');
      case 2:
        return this.translation.t('cohortes.wizard.etape2.description');
      case 3:
        return this.translation.t('cohortes.wizard.etape3.description');
      case 4:
        return this.translation.t('cohortes.wizard.etape4.description');
    }
  }

  protected allerAEtape(step: WizardStep): void {
    this.currentStep.set(step);
  }

  // --- Étape 1 ---
  protected isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.cohorteForm.get(fieldName);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  protected getFieldError(fieldName: string): string | undefined {
    const control = this.cohorteForm.get(fieldName);
    if (!control || !control.touched || !control.errors) return undefined;
    if (control.errors['required']) return 'Ce champ est obligatoire.';
    if (control.errors['minlength']) return `Minimum ${control.errors['minlength'].requiredLength} caractères requis.`;
    return 'Champ invalide.';
  }

  protected creerCohorte(): void {
    if (this.cohorteForm.invalid) {
      this.cohorteForm.markAllAsTouched();
      return;
    }

    if (this.structureContext.activeRole() !== 'ADMIN_STRUCTURE') {
      this.erreurCohorte.set('Seul un administrateur de structure peut créer une cohorte.');
      return;
    }

    this.creationEnCours.set(true);
    this.erreurCohorte.set(null);

    const { nom, secteur, dateDemarrage } = this.cohorteForm.getRawValue();

    const requestPayload: CreateCohorteRequest = {
      nom: nom.trim(),
      description: secteur.trim(),
      dateDebut: dateDemarrage,
    };

    this.cohorteService.createCohorte(requestPayload).subscribe({
      next: (created) => {
        this.creationEnCours.set(false);
        this.createdCohorte.set(created);
        this.created.emit(); // Notifie le parent que la cohorte est créée en BDD
        this.currentStep.set(2); // Passage immédiat à l'étape 2 sans quitter le wizard
      },
      error: (error) => {
        console.error('Erreur création cohorte :', error);
        this.creationEnCours.set(false);
        this.erreurCohorte.set(error?.error?.message ?? 'Impossible de créer la cohorte.');
      },
    });
  }

  // --- Étape 2 ---
  protected onEmailKeyDown(event: KeyboardEvent): void {
    if (['Enter', ',', ' '].includes(event.key)) {
      event.preventDefault();
      this.ajouterEmailCourant();
    }
  }

  private ajouterEmailCourant(): void {
    const val = this.emailInputValue.trim().toLowerCase();
    if (val && this.validerEmail(val) && !this.pendingEmails().includes(val)) {
      this.pendingEmails.update((list) => [...list, val]);
      this.emailInputValue = '';
    }
  }

  protected editerEmail(email: string): void {
    this.emailInputValue = email;
    this.retirerEmail(email);
  }

  protected retirerEmail(email: string): void {
    this.pendingEmails.update((list) => list.filter((e) => e !== email));
  }

  protected totalPendingCount(): number {
    const aSaisir = this.emailInputValue.trim();
    return this.pendingEmails().length + (aSaisir && this.validerEmail(aSaisir) ? 1 : 0);
  }

  protected inviterEntrepreneurs(): void {
    this.ajouterEmailCourant();
    const emails = this.pendingEmails();
    if (emails.length === 0) return;

    const cohorte = this.createdCohorte();
    if (!cohorte) return;

    this.invitationEnCours.set(true);
    this.erreurInvitation.set(null);

    this.entrepreneurService
      .inviterMultiple({
        emails,
        cohorteId: cohorte.id,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.invitationEnCours.set(false);
          const nouveauxInvites = res.invites ?? [];
          this.invitedEmails.update((list) => [...list, ...nouveauxInvites]);
          this.pendingEmails.set([]);
        },
        error: (err) => {
          this.invitationEnCours.set(false);
          this.erreurInvitation.set(err?.error?.message ?? "Erreur lors de l'envoi des invitations.");
        },
      });
  }

  private validerEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // --- Étape 3 ---
  protected ajouterNouvelleMission(): void {
    if (this.missionForm.invalid) {
      this.missionForm.markAllAsTouched();
      return;
    }

    const cohorte = this.createdCohorte();
    if (!cohorte) return;

    this.missionEnCours.set(true);
    const values = this.missionForm.getRawValue();

    const payload: CreateMissionRequest = {
      titre: values.titre.trim(),
      description: values.description ? values.description.trim() : undefined,
      dateEcheance: values.dateEcheance || undefined,
      priorite: values.priorite,
      cohorteId: cohorte.id,
      enregistrerCommeModele: values.enregistrerCommeModele || undefined,
    };

    this.missionService
      .createMission(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.missionEnCours.set(false);
          this.addedMissions.update((list) => [
            ...list,
            {
              titre: values.titre,
              description: values.description,
              dateEcheance: values.dateEcheance,
              priorite: values.priorite,
              enregistreCommeModele: values.enregistrerCommeModele,
            },
          ]);

          if (values.enregistrerCommeModele) {
            this.modelesUtilisesCount.update((n) => n + 1);
          }

          // Réinitialiser le formulaire pour permettre d'ajouter une autre mission
          this.missionForm.reset({
            titre: '',
            description: '',
            dateEcheance: '',
            priorite: 'MOYENNE',
            enregistrerCommeModele: false,
          });
        },
        error: (err) => {
          console.error('Erreur ajout mission:', err);
          this.missionEnCours.set(false);
        },
      });
  }

  protected selectionnerModele(modele: MissionModele): void {
    this.selectedModele.set(modele);
  }

  protected ajouterMissionDepuisModele(): void {
    const modele = this.selectedModele();
    const cohorte = this.createdCohorte();
    if (!modele || !cohorte) return;

    this.missionEnCours.set(true);

    const payload: CreateMissionRequest = {
      titre: modele.titre,
      description: modele.description,
      dateEcheance: this.modeleDateEcheance || undefined,
      priorite: modele.prioriteParDefaut,
      cohorteId: cohorte.id,
      modeleId: modele.id,
    };

    this.missionService
      .createMission(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.missionEnCours.set(false);
          this.modelesUtilisesCount.update((n) => n + 1);
          this.addedMissions.update((list) => [
            ...list,
            {
              titre: modele.titre,
              description: modele.description,
              dateEcheance: this.modeleDateEcheance,
              priorite: modele.prioriteParDefaut,
              depuisModele: true,
            },
          ]);
          this.selectedModele.set(null);
          this.modeleDateEcheance = '';
        },
        error: (err) => {
          console.error('Erreur ajout mission depuis modèle:', err);
          this.missionEnCours.set(false);
        },
      });
  }

  // --- Étape 4 & Sortie ---
  protected fermer(): void {
    this.closed.emit();
  }

  protected terminerEtFermer(): void {
    this.closed.emit();
    this.router.navigate(['/incubateur/cohortes']);
  }

  protected ouvrirLaCohorte(): void {
    const cohorte = this.createdCohorte();
    this.closed.emit();
    if (cohorte) {
      this.router.navigate(['/incubateur/cohortes'], {
        queryParams: { cohorteId: cohorte.id },
      });
    } else {
      this.router.navigate(['/incubateur/cohortes']);
    }
  }
}