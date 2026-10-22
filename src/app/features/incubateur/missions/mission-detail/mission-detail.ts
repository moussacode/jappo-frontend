import { Component, inject, signal, computed, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { LivrableAttenduMission, Mission, StatutMission } from '../../../../core/models/mission.model';
import { LivrableResponse, StatutLivrable } from '../../../../core/models/livrable.model';
import { TemplateField } from '../../../../core/models/parcours.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';
import { STATUT_LIVRABLE_CONFIG } from '../../../../core/constants/statut-livrable.constant';

// Design System Partagé
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import {
  BMC_DEFAULT_FIELDS,
  BmcCanvasComponent,
} from '../../../../shared/components/bmc-canvas/bmc-canvas.component';
import { downloadCsv } from '../../../../core/utils/csv-export';

interface CorrectionFormState {
  motif: string;
  pointsACorriger: string;
  ressourceRecommandee: string;
  dateEcheance: string;
  note?: number;
}

@Component({
  selector: 'app-mission-detail-incubateur',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    BadgeComponent,
    ButtonComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    LoadingState,
    EmptyStateComponent,
    BreadcrumbComponent,
    FormFieldComponent,
    InputComponent,
    BmcCanvasComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      <!-- Fil d'Ariane contextuel -->
      <app-breadcrumb [items]="breadcrumbItems()" />

      @if (mission(); as m) {

        <!-- En-tête -->
        <app-page-header [title]="m.titre" [subtitle]="sousTitre(m)">
          <div class="flex flex-wrap items-center gap-2">
            <app-badge [status]="statutBadge(m.statut).status" size="md">
              {{ statutBadge(m.statut).label }}
            </app-badge>

            @if (!isEditMode()) {
              @if (!hasSubmittedLivrables()) {
                <app-button type="button" variant="secondary" size="sm" (click)="ouvrirEditMode()">
                  <app-icon name="edit" class="mr-1.5 size-4" />
                  Modifier
                </app-button>
              } @else {
                <span class="flex items-center gap-1.5 text-xs text-ink-muted">
                  <app-icon name="lock" class="size-3.5" />
                  Édition verrouillée (livrables soumis)
                </span>
              }
            }
          </div>
        </app-page-header>

        <!-- Erreur d'action (validation, correction, sauvegarde) -->
        @if (erreur()) {
          <div role="alert" class="flex items-center justify-between gap-3 rounded-card border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <span class="flex items-center gap-2">
              <app-icon name="warning" class="size-4 shrink-0" />
              {{ erreur() }}
            </span>
            <button type="button" (click)="erreur.set(null)"
              class="shrink-0 rounded-input text-xs font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">
              Fermer
            </button>
          </div>
        }

        <!-- Formulaire de modification de mission -->
        @if (isEditMode()) {
          <app-card padding="lg">
            <div class="mb-4 flex items-center justify-between border-b border-line pb-3">
              <h2 class="text-base font-semibold text-ink">Modifier la mission</h2>
            </div>

            <div class="flex flex-col gap-4">
              <app-form-field label="Titre" [required]="true">
                <app-input [(ngModel)]="editForm().titre" name="titre" placeholder="Titre de la mission" />
              </app-form-field>

              <app-form-field label="Description">
                <textarea
                  [(ngModel)]="editForm().description"
                  rows="3"
                  class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                ></textarea>
              </app-form-field>

              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <app-form-field label="Priorité">
                  <select
                    [(ngModel)]="editForm().priorite"
                    class="w-full rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="HAUTE">Haute</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="BASSE">Basse</option>
                  </select>
                </app-form-field>

                <app-form-field label="Date d'échéance">
                  <app-input type="date" [(ngModel)]="editForm().dateEcheance" name="dateEcheance" />
                </app-form-field>
              </div>
            </div>

            <div class="mt-5 flex items-center justify-end gap-2 border-t border-line pt-4">
              <app-button type="button" variant="ghost" size="sm" (click)="fermerEditMode()">Annuler</app-button>
              <app-button type="button" size="sm" [disabled]="traitement()" (click)="sauvegarderMission()">
                {{ traitement() ? 'Sauvegarde...' : 'Sauvegarder' }}
              </app-button>
            </div>
          </app-card>
        }

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <!-- ─── COLONNE PRINCIPALE : revue des livrables ─── -->
          <div class="flex min-w-0 flex-col gap-8 lg:col-span-2">

            <section class="flex flex-col gap-4" aria-label="Livrables à évaluer">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 class="text-base font-semibold text-ink">Livrables à évaluer ({{ livrables().length }})</h2>
                  <p class="text-xs text-ink-muted">Chaque livrable regroupe sa version actuelle et son historique de corrections.</p>
                </div>
                @if (livrables().length > 0) {
                  <app-button variant="secondary" size="sm" (click)="exporterLivrables()">
                    Exporter CSV
                  </app-button>
                }
              </div>

              @for (l of livrablesTries(); track l.id) {
                <article
                  class="overflow-hidden rounded-card border bg-surface"
                  [class]="l.statut === 'EN_ATTENTE' ? 'border-warning/50' : 'border-line'"
                >

                  <!-- En-tête du livrable -->
                  <div class="flex flex-col gap-4 p-5">
                    <div class="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div class="flex min-w-0 items-center gap-3">
                        <span class="flex size-10 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                          <app-icon [name]="l.typePiece === 'LIEN' ? 'link' : 'missions'" class="size-4" />
                        </span>
                        <div class="min-w-0">
                          <div class="flex flex-wrap items-center gap-2">
                            <h3 class="truncate text-sm font-semibold text-ink">{{ l.nom || 'Livrable' }}</h3>
                            <app-badge status="neutral" size="sm">Version {{ l.numeroVersion || 1 }}</app-badge>
                          </div>
                          <div class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted">
                            <span>Déposée le {{ l.dateDepot ? (l.dateDepot | date:'dd MMMM yyyy à HH:mm') : 'Récemment' }}</span>
                            <span aria-hidden="true">•</span>
                            @if (l.typePiece === 'TEXTE') {
                              <span>Réponse texte</span>
                            } @else if (l.typePiece === 'TEMPLATE') {
                              <span>Réponse au template</span>
                            } @else {
                              <button
                                type="button"
                                (click)="ouvrirLivrable(l)"
                                class="inline-flex cursor-pointer items-center gap-1 rounded-input font-medium text-accent hover:text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                Voir le document actuel
                                <app-icon name="arrow-right" class="size-3" />
                              </button>
                            }
                          </div>
                        </div>
                      </div>

                      <div class="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-auto">
                        <app-badge [status]="statutBadgeLivrable(l.statut).status">
                          {{ statutBadgeLivrable(l.statut).label }}
                        </app-badge>

                        @if (l.historique && l.historique.length > 1) {
                          <button
                            type="button"
                            (click)="toggleHistorique(l.id)"
                            [attr.aria-expanded]="isHistoriqueOpen(l.id)"
                            class="inline-flex cursor-pointer items-center gap-1.5 rounded-button border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            <app-icon name="clock" class="size-3.5" />
                            Historique ({{ l.historique.length }})
                            <app-icon [name]="isHistoriqueOpen(l.id) ? 'chevron-up' : 'chevron-down'" class="size-3" />
                          </button>
                        }
                      </div>
                    </div>

                    <!-- Contenu déposé -->
                    @if (l.typePiece === 'TEXTE') {
                      <pre class="whitespace-pre-wrap break-words rounded-card border border-line bg-surface-muted p-3 font-sans text-sm text-ink">{{ l.url }}</pre>
                    }
                    @if (l.typePiece === 'TEMPLATE' && attenduPourLivrable(l); as attendu) {
                      @if (attendu.templateType?.toUpperCase() === 'BMC') {
                        <app-bmc-canvas
                          [fields]="champsTemplate(attendu)"
                          [values]="reponsesTemplate(l.contenu)"
                        />
                      } @else {
                        <div class="flex flex-col gap-3 rounded-card border border-line bg-surface-muted p-3">
                          @for (champ of champsTemplate(attendu); track champ.id) {
                            <div>
                              <p class="text-xs font-semibold text-ink-muted">{{ champ.label }}</p>
                              <p class="mt-1 whitespace-pre-wrap text-sm text-ink">{{ reponseTemplate(l.contenu, champ.id) }}</p>
                            </div>
                          }
                        </div>
                      }
                    }

                    <!-- Bandeau d'état / prochaine action -->
                    @if (l.statut === 'EN_ATTENTE') {
                      <div class="flex items-start gap-2.5 rounded-card border border-warning/40 bg-warning/10 p-3.5 text-sm text-ink">
                        <app-icon name="clock" class="mt-0.5 size-4 shrink-0 text-warning" />
                        <p class="leading-relaxed">
                          <span class="font-semibold">Action requise du coach :</span>
                          cette version attend votre évaluation. Examinez le document, puis validez le livrable ou demandez des modifications précises.
                        </p>
                      </div>
                    } @else if (l.statut === 'A_CORRIGER') {
                      <div class="flex flex-col gap-2 rounded-card border border-warning/40 bg-warning/10 p-4 text-sm">
                        <p class="flex items-center gap-2 font-semibold text-ink">
                          <app-icon name="warning" class="size-4 text-warning" />
                          Correction demandée — en attente du dépôt de la Version {{ (l.numeroVersion || 1) + 1 }}
                        </p>

                        @if (l.motifRefus) {
                          <p class="text-ink"><span class="font-semibold text-ink-muted">Motif : </span>{{ l.motifRefus }}</p>
                        }

                        @if (l.pointsACorriger) {
                          <div class="flex flex-col gap-1 text-ink">
                            <span class="font-semibold text-ink-muted">Points à modifier :</span>
                            <div class="whitespace-pre-line rounded-button border border-line bg-surface p-2.5">{{ l.pointsACorriger }}</div>
                          </div>
                        }

                        @if (l.ressourceRecommandee) {
                          <p class="text-ink"><span class="font-semibold text-ink-muted">Ressource conseillée : </span>
                            <span class="font-medium text-accent">{{ l.ressourceRecommandee }}</span></p>
                        }

                        @if (l.dateEcheanceCorrection) {
                          <p class="text-xs text-ink-muted">
                            Échéance de retour souhaitée :
                            <span class="font-semibold text-ink">{{ l.dateEcheanceCorrection | date:'dd/MM/yyyy' }}</span>
                          </p>
                        }
                      </div>
                    }

                    @if (validationSuccessId() === l.id) {
                      <div role="status" class="flex items-center gap-2 rounded-card border border-success/40 bg-success/10 p-3.5 text-sm text-ink">
                        <app-icon name="check" class="size-4 text-success" />
                        <span class="font-semibold">Livrable validé avec succès !</span>
                      </div>
                    }

                    @if (l.statut === 'VALIDE' && l.note !== undefined && l.note !== null) {
                      <p class="text-sm text-ink-muted">
                        Note attribuée : <span class="font-semibold text-ink">{{ l.note }}/20</span>
                      </p>
                    }
                  </div>

                  <!-- Évaluation (statut = EN_ATTENTE) -->
                  @if (l.statut === 'EN_ATTENTE') {
                    <div class="flex flex-col gap-4 border-t border-line bg-surface-muted p-5">

                      @if (!isFormCorrectionOpen(l.id)) {
                        <div class="flex flex-wrap items-center justify-between gap-3">
                          <p class="text-sm text-ink-muted">Décision pour la Version {{ l.numeroVersion || 1 }} :</p>
                          <div class="flex flex-wrap items-center gap-2">
                            <app-button type="button" variant="secondary" size="sm" (click)="ouvrirFormCorrection(l.id)">
                              <app-icon name="edit" class="mr-1.5 size-4" />
                              Demander une correction
                            </app-button>
                            <app-button type="button" size="sm" [disabled]="traitement()" (click)="validerLivrable(l.id)">
                              <app-icon name="check" class="mr-1.5 size-4" />
                              {{ traitement() ? 'Validation...' : 'Valider ce livrable' }}
                            </app-button>
                          </div>
                        </div>
                      } @else {
                        <!-- Demande de correction structurée -->
                        <div class="flex flex-col gap-4 rounded-card border border-line bg-surface p-4">
                          <div class="flex items-center justify-between border-b border-line pb-3">
                            <h4 class="text-sm font-semibold text-ink">
                              Demande de correction
                              <span class="font-normal text-ink-muted">(Version {{ l.numeroVersion || 1 }})</span>
                            </h4>
                          </div>

                          <app-form-field label="Motif de la demande" [required]="true">
                            <app-input
                              [(ngModel)]="correctionForms[l.id].motif"
                              placeholder="Ex : L'étude de marché doit être approfondie..."
                            />
                          </app-form-field>

                          <app-form-field label="Points à modifier / checklist attendue" [required]="true">
                            <textarea
                              [(ngModel)]="correctionForms[l.id].pointsACorriger"
                              rows="3"
                              placeholder="• Ajouter au moins 3 concurrents directs&#10;• Citer les sources chiffrées&#10;• Revoir la segmentation de la clientèle cible"
                              class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                            ></textarea>
                            <p class="mt-1 text-xs text-ink-muted">Indiquez clairement ce que l'entrepreneur doit rectifier avant le redépôt.</p>
                          </app-form-field>

                          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <app-form-field label="Ressource / guide conseillé (optionnel)">
                              <app-input
                                [(ngModel)]="correctionForms[l.id].ressourceRecommandee"
                                placeholder="Ex : Guide — Réaliser une étude de marché"
                              />
                            </app-form-field>

                            <app-form-field label="Échéance de correction (optionnel)">
                              <app-input type="date" [(ngModel)]="correctionForms[l.id].dateEcheance" />
                            </app-form-field>
                          </div>

                          <div class="flex items-center justify-end gap-2 border-t border-line pt-4">
                            <app-button type="button" variant="ghost" size="sm" (click)="fermerFormCorrection(l.id)">Annuler</app-button>
                            <app-button
                              type="button"
                              size="sm"
                              [disabled]="traitement() || !isCorrectionFormValid(l.id)"
                              (click)="envoyerDemandeCorrection(l.id)"
                            >
                              {{ traitement() ? 'Envoi...' : 'Envoyer les consignes de correction' }}
                            </app-button>
                          </div>
                        </div>
                      }
                    </div>
                  }

                  <!-- Historique des versions (dépliable) -->
                  @if (isHistoriqueOpen(l.id) && l.historique && l.historique.length > 0) {
                    <div class="flex flex-col gap-3 border-t border-line bg-surface-muted p-5">
                      <h4 class="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        Historique des versions ({{ l.historique.length }})
                      </h4>

                      <ul class="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
                        @for (v of l.historique; track v.id) {
                          <li class="flex flex-col gap-2.5 p-4">
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <div class="flex flex-wrap items-center gap-2.5">
                                <app-badge status="neutral" size="sm">V{{ v.numeroVersion }}</app-badge>
                                <span class="text-sm font-medium text-ink">{{ v.nom }}</span>
                                <span class="text-xs text-ink-muted">· {{ v.dateDepot | date:'dd/MM/yyyy à HH:mm' }}</span>
                              </div>

                              <div class="flex items-center gap-2">
                                <app-badge [status]="statutBadgeLivrable(v.statut).status" size="sm">
                                  {{ statutBadgeLivrable(v.statut).label }}
                                </app-badge>

                                @if (v.typePiece !== 'TEXTE' && v.typePiece !== 'TEMPLATE') {
                                  <button
                                    type="button"
                                    (click)="ouvrirLivrableParUrl(v.url)"
                                    class="rounded-input text-xs font-medium text-accent hover:text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                                  >
                                    Ouvrir ↗
                                  </button>
                                }
                              </div>
                            </div>

                            @if (v.commentaireEntrepreneur) {
                              <p class="rounded-button border border-line bg-surface-muted p-2 text-xs italic text-ink-muted">
                                Note entrepreneur : « {{ v.commentaireEntrepreneur }} »
                              </p>
                            }
                            @if (v.typePiece === 'TEXTE') {
                              <pre class="whitespace-pre-wrap break-words rounded-card border border-line bg-surface-muted p-3 font-sans text-sm text-ink">{{ v.url }}</pre>
                            }
                            @if (v.typePiece === 'TEMPLATE' && attenduPourLivrable(l); as attendu) {
                              @if (attendu.templateType?.toUpperCase() === 'BMC') {
                                <app-bmc-canvas
                                  [fields]="champsTemplate(attendu)"
                                  [values]="reponsesTemplate(v.contenu)"
                                />
                              } @else {
                                <div class="flex flex-col gap-2 rounded-card border border-line bg-surface-muted p-3">
                                  @for (champ of champsTemplate(attendu); track champ.id) {
                                    <div>
                                      <p class="text-xs font-semibold text-ink-muted">{{ champ.label }}</p>
                                      <p class="mt-1 whitespace-pre-wrap text-sm text-ink">{{ reponseTemplate(v.contenu, champ.id) }}</p>
                                    </div>
                                  }
                                </div>
                              }
                            }

                            @if (v.motifRefus || v.commentaireCoach) {
                              <div class="flex flex-col gap-1 border-l-2 border-accent/40 py-1 pl-3 text-xs text-ink-muted">
                                @if (v.motifRefus) {
                                  <p><strong class="text-ink">Motif :</strong> {{ v.motifRefus }}</p>
                                }
                                @if (v.pointsACorriger) {
                                  <p class="whitespace-pre-line"><strong class="text-ink">Consignes :</strong> {{ v.pointsACorriger }}</p>
                                }
                                @if (v.commentaireCoach && !v.motifRefus) {
                                  <p><em>« {{ v.commentaireCoach }} »</em></p>
                                }
                              </div>
                            }
                          </li>
                        }
                      </ul>
                    </div>
                  }
                </article>
              } @empty {
                <app-empty-state
                  iconName="missions"
                  title="Aucun livrable soumis"
                  description="L'entrepreneur n'a pas encore versé de document pour cette mission."
                />
              }
            </section>

            <!-- Livrables attendus -->
            <section class="flex flex-col gap-3" aria-label="Livrables attendus">
              <div class="flex items-center justify-between gap-3">
                <h2 class="text-base font-semibold text-ink">Livrables attendus</h2>
                <app-badge status="neutral" size="sm">{{ nbAttendus() }}</app-badge>
              </div>
              @if (m.livrablesAttendus?.length) {
                <app-card padding="md">
                  <ul class="divide-y divide-line">
                    @for (attendu of m.livrablesAttendus; track attendu.id) {
                      <li class="flex flex-col gap-3 py-3 first:pt-0 last:pb-0">
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <p class="text-sm font-semibold text-ink">{{ attendu.titre }}</p>
                            @if (attendu.description) {
                              <p class="mt-0.5 text-xs text-ink-muted">{{ attendu.description }}</p>
                            }
                          </div>
                          <app-badge [status]="attendu.obligatoire ? 'warning' : 'neutral'" size="sm">
                            {{ attendu.obligatoire ? 'Obligatoire' : 'Optionnel' }}
                          </app-badge>
                        </div>
                        @if (attendu.type === 'TEMPLATE' && attendu.templateType?.toUpperCase() === 'BMC') {
                          <app-bmc-canvas [fields]="champsTemplate(attendu)" />
                        }
                      </li>
                    }
                  </ul>
                </app-card>
              } @else {
                <p class="text-sm text-ink-muted">Aucun livrable attendu n’est défini pour cette mission.</p>
              }
            </section>
          </div>

          <!-- ─── COLONNE LATÉRALE : synthèse + consignes ─── -->
          <aside class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-6 lg:self-start" aria-label="Synthèse de la mission">

            <!-- Avancement de la revue -->
            <app-card padding="md">
              <h2 class="mb-3 text-sm font-semibold text-ink">Avancement de la revue</h2>
              <p class="text-3xl font-bold tracking-tight text-ink">
                {{ nbValides() }}<span class="text-lg font-medium text-ink-faint">/{{ nbAttendus() || livrables().length }}</span>
              </p>
              <p class="text-xs text-ink-muted">livrable(s) validé(s)</p>
              <div
                class="mt-3 h-2 overflow-hidden rounded-pill bg-line"
                role="progressbar"
                aria-label="Livrables validés"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="pourcentageValides()"
              >
                <div class="h-full rounded-pill bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                     [style.width.%]="pourcentageValides()"></div>
              </div>
              <dl class="mt-4 flex flex-col gap-2 text-sm">
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-ink-muted">À évaluer</dt>
                  <dd><app-badge [status]="nbAEvaluer() > 0 ? 'warning' : 'neutral'" size="sm">{{ nbAEvaluer() }}</app-badge></dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-ink-muted">À corriger</dt>
                  <dd><app-badge status="neutral" size="sm">{{ nbACorriger() }}</app-badge></dd>
                </div>
                <div class="flex items-center justify-between gap-2">
                  <dt class="text-ink-muted">Déposés</dt>
                  <dd class="font-semibold text-ink">{{ livrables().length }}{{ nbAttendus() ? ' / ' + nbAttendus() : '' }}</dd>
                </div>
              </dl>
            </app-card>

            <!-- Consignes -->
            <app-card padding="md">
              <h2 class="mb-3 text-sm font-semibold text-ink">Consignes & attentes</h2>
              <p class="whitespace-pre-line text-sm leading-relaxed text-ink">
                {{ m.description || 'Aucune consigne détaillée pour cette mission.' }}
              </p>
              <dl class="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
                @if (m.dateEcheance) {
                  <div class="flex items-center justify-between gap-2">
                    <dt class="flex items-center gap-1.5 text-ink-muted">
                      <app-icon name="calendar" class="size-3.5" /> Échéance
                    </dt>
                    <dd class="font-medium text-ink">{{ m.dateEcheance | date:'dd/MM/yyyy' }}</dd>
                  </div>
                }
                @if (m.priorite) {
                  <div class="flex items-center justify-between gap-2">
                    <dt class="text-ink-muted">Priorité</dt>
                    <dd class="font-medium text-ink">{{ libellePriorite(m.priorite) }}</dd>
                  </div>
                }
              </dl>
            </app-card>
          </aside>
        </div>

      } @else if (isLoading()) {
        <app-loading-state message="Chargement des détails de la mission..." />
      } @else {
        <app-empty-state
          iconName="missions"
          title="Mission introuvable"
          description="La mission demandée n'existe pas ou a été supprimée."
        >
          <a routerLink="/incubateur/missions"
             class="rounded-input text-sm font-medium text-accent hover:text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Retourner à la liste des missions
          </a>
        </app-empty-state>
      }

    </div>
  `,
})
export class MissionDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly mission = signal<Mission | undefined>(undefined);

  /**
   * Les livrables viennent directement du signal partagé du LivrableService.
   * Ils se mettent à jour automatiquement via WebSocket.
   */
  protected readonly livrables = this.livrableService.livrables;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly traitement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly validationSuccessId = signal<string | null>(null);
  private validationSuccessTimer: ReturnType<typeof setTimeout> | undefined;

  // Gestion du formulaire de modification de mission
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editForm = signal({
    titre: '',
    description: '',
    priorite: '',
    dateEcheance: ''
  });

  // Gestion des formulaires de correction structurée
  protected correctionForms: Record<string, CorrectionFormState> = {};
  protected readonly formsOuverts = signal<Record<string, boolean>>({});

  // Gestion des tiroirs historiques dépliés
  protected readonly historiquesOuverts = signal<Record<string, boolean>>({});

  // Vérifier si des livrables ont été soumis (empêche la modification de mission)
  protected readonly hasSubmittedLivrables = computed(() => {
    return this.livrables().length > 0;
  });

  // Livrables à évaluer en premier, puis le reste dans l'ordre d'origine
  protected readonly livrablesTries = computed(() => {
    const liste = this.livrables();
    return [
      ...liste.filter((l) => l.statut === 'EN_ATTENTE'),
      ...liste.filter((l) => l.statut !== 'EN_ATTENTE'),
    ];
  });

  // Synthèse de la revue
  protected readonly nbAttendus = computed(() => this.mission()?.livrablesAttendus?.length ?? 0);
  protected readonly nbAEvaluer = computed(() => this.livrables().filter((l) => l.statut === 'EN_ATTENTE').length);
  protected readonly nbACorriger = computed(() => this.livrables().filter((l) => l.statut === 'A_CORRIGER').length);
  protected readonly nbValides = computed(() => this.livrables().filter((l) => l.statut === 'VALIDE').length);
  protected readonly pourcentageValides = computed(() => {
    const total = this.nbAttendus() || this.livrables().length;
    return total > 0 ? Math.min(100, Math.round((this.nbValides() / total) * 100)) : 0;
  });

  protected readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const m = this.mission();
    const items: BreadcrumbItem[] = [
      { label: 'Missions', url: '/incubateur/missions' },
    ];

    if (!m) return items;

    if (m.cohorteId && m.nomCohorte) {
      items.push({
        label: m.nomCohorte,
        url: '/incubateur/cohortes',
        queryParams: { cohorteId: m.cohorteId },
      });
    }

    if (m.entrepreneurId && m.nomEntrepreneur) {
      items.push({
        label: m.nomEntrepreneur,
        url: `/incubateur/entrepreneurs/${m.entrepreneurId}`,
      });
    }

    if (m.projetId && m.nomProjet) {
      items.push({
        label: m.nomProjet,
        url: `/incubateur/projets/${m.projetId}`,
      });
    }

    items.push({
      label: m.titre,
    });

    return items;
  });

  ngOnInit(): void {
    if (!this.missionId) {
      this.isLoading.set(false);
      return;
    }

    // Déclare la mission active dans LivrableService :
    // - charge les livrables initiaux
    // - active l'écoute WebSocket pour cette mission
    this.livrableService.setActiveMission(this.missionId);

    this.chargerMission();
  }

  ngOnDestroy(): void {
    if (this.validationSuccessTimer) {
      clearTimeout(this.validationSuccessTimer);
    }
    // Libère le contexte mission pour éviter les mises à jour parasites
    this.livrableService.clearActiveMission();
  }

  protected sousTitre(m: Mission): string {
    const parts: string[] = [`Startup : ${m.nomProjet || 'Non assigné'}`];
    if (m.nomEntrepreneur) parts.push(`Porteur : ${m.nomEntrepreneur}`);
    if (m.nomCohorte) parts.push(`Cohorte : ${m.nomCohorte}`);
    return parts.join(' · ');
  }

  protected libellePriorite(priorite: string): string {
    const labels: Record<string, string> = { URGENTE: 'Urgente', HAUTE: 'Haute', MOYENNE: 'Moyenne', BASSE: 'Basse' };
    return labels[priorite] ?? priorite;
  }

  ouvrirLivrable(l: LivrableResponse): void {
    this.livrableService.ouvrirFichier(l.url);
  }

  ouvrirLivrableParUrl(url: string): void {
    this.livrableService.ouvrirFichier(url);
  }

  protected attenduPourLivrable(livrable: LivrableResponse): LivrableAttenduMission | undefined {
    return this.mission()?.livrablesAttendus?.find(
      (attendu) => attendu.id === livrable.livrableAttenduId,
    );
  }

  protected champsTemplate(attendu: LivrableAttenduMission): TemplateField[] {
    return attendu.templateFields?.length
      ? attendu.templateFields
      : attendu.templateType?.toUpperCase() === 'BMC'
        ? BMC_DEFAULT_FIELDS
        : [];
  }

  protected reponsesTemplate(contenu: string | null | undefined): Record<string, string> {
    if (!contenu) return {};
    try {
      const answers: unknown = JSON.parse(contenu);
      if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return {};
      return Object.fromEntries(
        Object.entries(answers).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    } catch {
      return {};
    }
  }

  protected exporterLivrables(): void {
    const rows = this.livrables().flatMap((livrable) => {
      const attendu = this.attenduPourLivrable(livrable);
      const versions = [
        ...(livrable.historique ?? []),
        {
          id: livrable.id,
          numeroVersion: livrable.numeroVersion ?? 1,
          nom: livrable.nom,
          url: livrable.url,
          contenu: livrable.contenu,
          typePiece: livrable.typePiece,
          statut: livrable.statut,
          note: livrable.note,
          commentaireCoach: livrable.commentaireCoach,
          motifRefus: livrable.motifRefus,
          pointsACorriger: livrable.pointsACorriger,
          dateDepot: livrable.dateDepot,
          dateEvaluation: livrable.dateEvaluation,
          commentaireEntrepreneur: undefined,
        },
      ];
      const uniqueVersions = [...new Map(
        versions.map((version) => [version.numeroVersion, version]),
      ).values()].sort((a, b) => a.numeroVersion - b.numeroVersion);

      return uniqueVersions.map((version) => [
        livrable.nomProjet,
        attendu?.titre,
        version.nom,
        version.numeroVersion,
        version.typePiece,
        this.statutBadgeLivrable(version.statut).label,
        version.dateDepot,
        version.dateEvaluation,
        version.note,
        version.typePiece === 'TEMPLATE'
          ? this.contenuTemplatePourExport(version.contenu, attendu)
          : version.typePiece === 'TEXTE'
            ? version.url
            : '',
        version.typePiece === 'LIEN' || version.typePiece === 'FICHIER' ? version.url : '',
        version.commentaireEntrepreneur,
        version.commentaireCoach ?? version.motifRefus,
        version.pointsACorriger,
      ]);
    });

    downloadCsv(
      `livrables-${this.mission()?.titre ?? 'mission'}-${new Date().toISOString().slice(0, 10)}`,
      [
        'Projet',
        'Livrable attendu',
        'Nom du dépôt',
        'Version',
        'Type',
        'Statut',
        'Date de dépôt',
        'Date d’évaluation',
        'Note',
        'Réponse / contenu',
        'Lien du fichier',
        'Note de l’entrepreneur',
        'Commentaire du coach',
        'Points à corriger',
      ],
      rows,
    );
  }

  private contenuTemplatePourExport(
    contenu: string | null | undefined,
    attendu: LivrableAttenduMission | undefined,
  ): string {
    const reponses = this.reponsesTemplate(contenu);
    const champs = attendu ? this.champsTemplate(attendu) : [];
    return champs
      .map((champ) => `${champ.label}: ${reponses[champ.id] ?? ''}`)
      .join('\n');
  }

  protected reponseTemplate(contenu: string | null | undefined, champId: string): string {
    if (!contenu) return '';
    try {
      const answers: unknown = JSON.parse(contenu);
      if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return '';
      const value = (answers as Record<string, unknown>)[champId];
      return typeof value === 'string' ? value : '';
    } catch {
      return '';
    }
  }

  private chargerMission(): void {
    this.isLoading.set(true);

    this.missionService
      .getById(this.missionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (m) => {
          this.mission.set(m);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement mission:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_CONFIG[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  protected statutBadgeLivrable(statut: string) {
    return STATUT_LIVRABLE_CONFIG[statut as StatutLivrable] ?? { status: 'neutral' as const, label: statut };
  }

  // Contrôles formulaire de correction
  protected isFormCorrectionOpen(livrableId: string): boolean {
    return !!this.formsOuverts()[livrableId];
  }

  protected ouvrirFormCorrection(livrableId: string): void {
    if (!this.correctionForms[livrableId]) {
      this.correctionForms[livrableId] = {
        motif: '',
        pointsACorriger: '',
        ressourceRecommandee: '',
        dateEcheance: '',
      };
    }
    this.formsOuverts.update((prev) => ({ ...prev, [livrableId]: true }));
  }

  protected fermerFormCorrection(livrableId: string): void {
    this.formsOuverts.update((prev) => ({ ...prev, [livrableId]: false }));
  }

  protected isCorrectionFormValid(livrableId: string): boolean {
    const form = this.correctionForms[livrableId];
    return !!(form && form.motif.trim() && form.pointsACorriger.trim());
  }

  // ── Modification de mission ───────────────────────────────────────────────────

  protected ouvrirEditMode(): void {
    const m = this.mission();
    if (!m) return;

    this.editForm.set({
      titre: m.titre || '',
      description: m.description || '',
      priorite: m.priorite || '',
      dateEcheance: m.dateEcheance || ''
    });
    this.isEditMode.set(true);
  }

  protected fermerEditMode(): void {
    this.isEditMode.set(false);
  }

  protected sauvegarderMission(): void {
    const m = this.mission();
    if (!m) return;

    const form = this.editForm();
    const changements: Partial<Pick<Mission, 'titre' | 'description' | 'dateEcheance' | 'priorite'>> = {};

    if (form.titre !== m.titre) changements.titre = form.titre;
    if (form.description !== m.description) changements.description = form.description;
    if (form.priorite !== m.priorite) changements.priorite = form.priorite as any;
    if (form.dateEcheance !== m.dateEcheance) changements.dateEcheance = form.dateEcheance as any;

    if (Object.keys(changements).length === 0) {
      this.fermerEditMode();
      return;
    }

    this.traitement.set(true);
    this.erreur.set(null);

    this.missionService
      .updateMissionDetails(m.id, changements)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.mission.set(updated);
          this.traitement.set(false);
          this.isEditMode.set(false);
        },
        error: (err) => {
          console.error('Erreur modification mission:', err);
          this.traitement.set(false);
          this.erreur.set('Impossible de modifier la mission. Réessayez.');
        },
      });
  }

  // Validation
  protected validerLivrable(livrableId: string): void {
    this.traitement.set(true);
    this.erreur.set(null);

    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'VALIDE',
        commentaireCoach: 'Livrable validé par le coach.',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.validationSuccessId.set(livrableId);
          if (this.validationSuccessTimer) {
            clearTimeout(this.validationSuccessTimer);
          }
          this.validationSuccessTimer = setTimeout(() => {
            this.validationSuccessId.set(null);
            this.validationSuccessTimer = undefined;
          }, 5000);
          // Le WebSocket enverra LIVRABLE_VALIDE → rafraîchissement automatique via signal
          // On recharge quand même par sécurité pour la cohérence immédiate (avant l'event WS)
          this.livrableService.rechargerLivrablesMissionActive();
        },
        error: (err) => {
          console.error('Erreur validation livrable:', err);
          this.traitement.set(false);
          this.erreur.set('Impossible de valider le livrable. Réessayez.');
        },
      });
  }

  // Demande de correction
  protected envoyerDemandeCorrection(livrableId: string): void {
    const form = this.correctionForms[livrableId];
    if (!form || !form.motif.trim() || !form.pointsACorriger.trim()) return;

    this.traitement.set(true);
    this.erreur.set(null);

    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'A_CORRIGER',
        motifRefus: form.motif.trim(),
        pointsACorriger: form.pointsACorriger.trim(),
        ressourceRecommandee: form.ressourceRecommandee.trim() || undefined,
        dateEcheanceCorrection: form.dateEcheance.trim() || undefined,
        commentaireCoach: form.motif.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.fermerFormCorrection(livrableId);
          // Le WebSocket enverra LIVRABLE_REJETE → rafraîchissement automatique via signal
          this.livrableService.rechargerLivrablesMissionActive();
        },
        error: (err) => {
          console.error('Erreur demande de correction:', err);
          this.traitement.set(false);
          this.erreur.set("Impossible d'envoyer la demande de correction. Réessayez.");
        },
      });
  }

  // Historique
  protected toggleHistorique(livrableId: string): void {
    this.historiquesOuverts.update((prev) => ({
      ...prev,
      [livrableId]: !prev[livrableId],
    }));
  }

  protected isHistoriqueOpen(livrableId: string): boolean {
    return !!this.historiquesOuverts()[livrableId];
  }
}