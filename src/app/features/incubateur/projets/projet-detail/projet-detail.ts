import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { SuiviProjetService } from '../../../../core/services/suivi-projet.service';
import { ProgressionService } from '../../../../core/services/progression.service';

import { Projet, ParticipationCohorteResponse, PromouvoirProjetRequest, CloturerAccompagnementRequest } from '../../../../core/models/projet.model';
import { Mission } from '../../../../core/models/mission.model';
import { Cohorte, libelleStade } from '../../../../core/models/cohorte.model';
import { SuiviProjetDTO } from '../../../../core/models/suivi-projet.model';
import { FeuilleRouteProjet } from '../../../../core/models/parcours.model';

import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { EtapeTimelineComponent } from '../../../../shared/components/etape-timeline/etape-timeline.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';

interface ErreurCloture {
  message: string;
  missionsNonValidees: { titre: string; statut: string }[];
  forcable: boolean;
}

interface Promotion409 {
  message: string;
  missionsNonValidees: { titre: string; statut: string }[];
}

type OngletProjet = 'apercu' | 'missions' | 'parcours' | 'reunions';
type FiltreMissions = 'TOUTES' | 'EN_RETARD' | 'A_EVALUER' | 'VALIDEES';
type StatutBadge = 'success' | 'warning' | 'neutral' | 'danger' | 'info';

/** Anneau de progression (SVG) : rayon et circonférence. */
const ANNEAU_RAYON = 52;
const ANNEAU_CIRCONFERENCE = 2 * Math.PI * ANNEAU_RAYON;

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe, NgTemplateOutlet,
    BadgeComponent, Icon, CardComponent, PageHeaderComponent,
    ButtonComponent, EmptyStateComponent, ModalComponent,
    BreadcrumbComponent,
    LoadingState,
    EtapeTimelineComponent,
    AvatarComponent,
    TabFilterComponent,
    FormFieldComponent,
  ],
  template: `
<div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

  @if (loading()) {
    <app-loading-state message="Chargement du projet..." />
  }

  @if (!loading() && projet(); as p) {

    <!-- ─── EN-TÊTE ─── -->
    <app-breadcrumb [items]="breadcrumbItems()" />

    <app-page-header [title]="p.nom" [subtitle]="soustitre(p)">
      <div class="flex flex-wrap items-center gap-2">
        @if (p.archive) {
          <app-badge status="warning" size="sm">Archivé</app-badge>
        }
        @if (libelleStade(p.stade); as stade) {
          <app-badge status="info" size="sm">{{ stade }}</app-badge>
        }
        @if (p.statut === 'DIPLOME') {
          <app-badge status="success" size="sm">Diplômé</app-badge>
        } @else if (p.statut === 'ABANDONNE') {
          <app-badge status="danger" size="sm">Abandonné</app-badge>
        }
        @if (canPromote() && estActif(p)) {
          <app-button variant="secondary" size="sm" (click)="ouvrirPromotion()">
            <app-icon name="arrow-right" class="mr-1.5 size-4" />
            Promouvoir
          </app-button>
          <app-button variant="secondary" size="sm" (click)="ouvrirCloture()">
            <app-icon name="check" class="mr-1.5 size-4" />
            Clôturer l'accompagnement
          </app-button>
        }
        @if (!p.archive) {
          <app-button variant="ghost" size="sm" (click)="showArchiveModal.set(true)">Archiver</app-button>
        } @else {
          <app-button variant="ghost" size="sm" (click)="restaurer()">Restaurer</app-button>
        }
      </div>
    </app-page-header>

    <!-- ─── SYNTHÈSE : anneau d'avancement + chiffres clés ─── -->
    <app-card padding="lg">
      @if (loadingSuivi()) {
        <app-loading-state message="Chargement du suivi du projet..." />
      } @else {
        <div class="flex flex-col gap-6 md:flex-row md:items-center">

          <!-- Anneau -->
          <div class="flex items-center gap-5 md:flex-col md:gap-3 md:border-r md:border-line md:pr-8">
            <div
              class="relative size-28 shrink-0"
              role="img"
              [attr.aria-label]="'Avancement du projet : ' + avancement() + ' pour cent'"
            >
              <svg viewBox="0 0 120 120" class="size-full -rotate-90">
                <circle cx="60" cy="60" [attr.r]="rayon" fill="none" stroke-width="10" class="stroke-line" />
                <circle
                  cx="60" cy="60" [attr.r]="rayon" fill="none" stroke-width="10" stroke-linecap="round"
                  class="stroke-accent transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
                  [attr.stroke-dasharray]="circonference"
                  [attr.stroke-dashoffset]="anneauDecalage()"
                />
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-2xl font-bold tracking-tight text-ink">{{ avancement() }}%</span>
                <span class="text-[11px] text-ink-muted">avancement</span>
              </div>
            </div>
            @if (suivi()?.statutProgression; as sp) {
              <app-badge [status]="badgeStatutProgression(sp)" size="sm">{{ formatStatutProgression(sp) }}</app-badge>
            }
          </div>

          <!-- Chiffres clés -->
          <div class="grid flex-1 grid-cols-2 gap-5 lg:grid-cols-4">
            <ng-container *ngTemplateOutlet="tuile; context: {
              icone: 'check', libelle: 'Missions validées',
              valeur: (p.nombreMissionsValidees ?? 0) + '/' + (p.nombreMissionsTotal ?? 0), alerte: false }" />
            <ng-container *ngTemplateOutlet="tuile; context: {
              icone: 'missions', libelle: 'Missions en cours', valeur: missionsEnCours(), alerte: false }" />
            <ng-container *ngTemplateOutlet="tuile; context: {
              icone: 'warning', libelle: 'Missions en retard', valeur: missionsEnRetard(), alerte: missionsEnRetard() > 0 }" />
            <ng-container *ngTemplateOutlet="tuile; context: {
              icone: 'documents', libelle: 'Livrables à évaluer', valeur: livrablesEnAttente(), alerte: false }" />
          </div>
        </div>
      }
    </app-card>

    <!-- À traiter -->
    @if (!loadingSuivi() && (missionsEnRetard() > 0 || livrablesEnAttente() > 0)) {
      <div role="status" class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning/40 bg-warning/10 px-4 py-3">
        <div class="flex min-w-0 items-center gap-2.5 text-sm text-ink">
          <app-icon name="warning" class="size-4 shrink-0 text-warning" />
          <p>
            <span class="font-semibold">À traiter :</span>
            @if (missionsEnRetard() > 0) {
              {{ missionsEnRetard() }} mission(s) en retard
            }
            @if (missionsEnRetard() > 0 && livrablesEnAttente() > 0) { · }
            @if (livrablesEnAttente() > 0) {
              {{ livrablesEnAttente() }} livrable(s) à évaluer
            }
          </p>
        </div>
        <app-button variant="secondary" size="xs" (click)="allerAuxMissions()">Voir les missions</app-button>
      </div>
    }

    <!-- ─── ONGLETS ─── -->
    <app-tab-filter
      [options]="optionsOnglets()"
      [value]="ongletActif()"
      (valueChange)="onOngletChange($event)"
      class="w-full sm:w-fit"
    />

    <!-- ─── ONGLET : VUE D'ENSEMBLE ─── -->
    @if (ongletActif() === 'apercu') {
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

        <!-- Colonne principale : feuille de route -->
        <section class="flex min-w-0 flex-col gap-3 lg:col-span-2" aria-label="Feuille de route">
          <h2 class="text-base font-semibold text-ink">Feuille de route</h2>
          @if (loadingEtapes()) {
            <app-loading-state message="Chargement de la feuille de route..." />
          } @else if (feuilleRoute(); as route) {
            <app-etape-timeline
              [feuilleRoute]="route"
              [peutValider]="peutValiderEtapes()"
              (validation)="onEtapeValidee()"
            />
          } @else {
            <app-empty-state
              icon="folder"
              title="Aucune feuille de route"
              description="Ce projet n'a pas encore de parcours associé."
            />
          }
        </section>

        <!-- Colonne latérale -->
        <aside class="flex min-w-0 flex-col gap-4" aria-label="Informations du projet">

          <!-- Fiche projet -->
          <app-card padding="md">
            <h2 class="mb-4 text-sm font-semibold text-ink">Fiche projet</h2>
            <dl class="flex flex-col gap-4 text-sm">
              <div class="flex items-center gap-3">
                <app-avatar [initials]="initiales(p.nomEntrepreneur || p.nom)" size="md" />
                <div class="min-w-0">
                  <dt class="text-xs text-ink-muted">Entrepreneur</dt>
                  <dd class="truncate font-medium text-ink">{{ p.nomEntrepreneur ?? '—' }}</dd>
                </div>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Cohorte</dt>
                <dd class="font-medium text-ink">
                  @if (p.cohorteId && p.nomCohorte) {
                    <a [routerLink]="['/incubateur/cohortes', p.cohorteId]"
                       class="text-accent hover:text-accent-strong hover:underline">{{ p.nomCohorte }}</a>
                  } @else {
                    {{ suivi()?.nomCohorte ?? '—' }}
                  }
                </dd>
              </div>
              <div>
                <dt class="text-xs text-ink-muted">Phase actuelle</dt>
                <dd class="font-medium text-ink">{{ p.nomPhase || '—' }}</dd>
              </div>
              @if (suivi(); as s) {
                @if (s.dateDebutProgression || s.dateDerniereMajProgression || s.dateFinProgression) {
                  <div class="grid grid-cols-1 gap-3 border-t border-line pt-4">
                    @if (s.dateDebutProgression) {
                      <div class="flex items-center justify-between gap-2">
                        <dt class="text-xs text-ink-muted">Début</dt>
                        <dd class="text-xs font-medium text-ink">{{ s.dateDebutProgression | date:'dd/MM/yyyy' }}</dd>
                      </div>
                    }
                    @if (s.dateDerniereMajProgression) {
                      <div class="flex items-center justify-between gap-2">
                        <dt class="text-xs text-ink-muted">Dernière mise à jour</dt>
                        <dd class="text-xs font-medium text-ink">{{ s.dateDerniereMajProgression | date:'dd/MM/yyyy' }}</dd>
                      </div>
                    }
                    @if (s.dateFinProgression) {
                      <div class="flex items-center justify-between gap-2">
                        <dt class="text-xs text-ink-muted">Fin</dt>
                        <dd class="text-xs font-medium text-ink">{{ s.dateFinProgression | date:'dd/MM/yyyy' }}</dd>
                      </div>
                    }
                  </div>
                }
              }
            </dl>
          </app-card>

          <!-- Prochaines échéances -->
          <app-card padding="md">
            <h2 class="mb-3 text-sm font-semibold text-ink">Prochaines échéances</h2>
            @if (suivi()?.prochainesEcheances?.length) {
              <ul class="flex flex-col divide-y divide-line">
                @for (echeance of suivi()!.prochainesEcheances; track echeance.missionId) {
                  <li class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium text-ink">{{ echeance.titreMission }}</p>
                      <p class="text-xs text-ink-muted">{{ echeance.dateLimite | date:'dd/MM/yyyy' }}</p>
                    </div>
                    <app-badge [status]="badgePriorite(echeance.priorite)" size="sm">{{ libellePriorite(echeance.priorite) }}</app-badge>
                  </li>
                }
              </ul>
            } @else {
              <p class="text-sm text-ink-muted">Aucune échéance à venir.</p>
            }
          </app-card>

          <!-- Prochaine réunion -->
          <app-card padding="md">
            <h2 class="mb-3 text-sm font-semibold text-ink">Prochaine réunion</h2>
            @if (suivi()?.prochaineReunion; as prochaine) {
              <div class="flex items-start gap-3">
                <span class="flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                  <app-icon name="calendar" class="size-4" />
                </span>
                <div class="min-w-0">
                  <p class="text-sm font-medium text-ink">{{ prochaine | date:'dd/MM/yyyy à HH:mm' }}</p>
                  @if (suivi()?.prochaineReunionObjectif; as objectif) {
                    <p class="mt-0.5 text-xs text-ink-muted">{{ objectif }}</p>
                  }
                </div>
              </div>
            } @else {
              <p class="text-sm text-ink-muted">Aucune réunion planifiée.</p>
            }
          </app-card>
        </aside>
      </div>
    }

    <!-- ─── ONGLET : MISSIONS ─── -->
    @if (ongletActif() === 'missions') {
      <section class="flex flex-col gap-4" aria-label="Missions du projet">

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-base font-semibold text-ink">Missions</h2>
            <p class="text-xs text-ink-muted">
              {{ missionsTotal() }} au total · Livrables : {{ livrablesTotal() }} déposé(s) sur {{ livrablesAttendusTotal() }} attendu(s)
              · {{ livrablesRefuses() }} à corriger · {{ livrablesValides() }} validé(s)
            </p>
          </div>
          <app-tab-filter
            [options]="optionsFiltreMissions()"
            [value]="filtreMissions()"
            (valueChange)="onFiltreMissionsChange($event)"
          />
        </div>

        @if (missionsLoading()) {
          <app-loading-state message="Chargement des missions du projet..." />
        } @else if (missionsError()) {
          <div role="alert" class="flex items-center gap-2 rounded-card border border-danger/40 bg-danger/10 p-4 text-sm text-danger">
            <app-icon name="warning" class="size-4 shrink-0" />
            <span>{{ missionsError() }}</span>
          </div>
        } @else if (missions().length === 0) {
          <app-empty-state
            icon="missions"
            title="Aucune mission assignée"
            description="Les missions créées depuis une étape apparaissent ici lorsqu’elles sont correctement rattachées au projet."
          />
        } @else if (missionsFiltrees().length === 0) {
          <p class="rounded-card border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-ink-muted">
            Aucune mission ne correspond à ce filtre.
          </p>
        } @else {
          <app-card padding="none" class="overflow-hidden">
            <ul class="divide-y divide-line">
              @for (m of missionsFiltrees(); track m.id) {
                <li class="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-subtle sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-button"
                      [class]="estEnRetard(m) ? 'bg-danger/10 text-danger' : 'bg-surface-subtle text-ink-muted'"
                    >
                      <app-icon [name]="estEnRetard(m) ? 'warning' : 'missions'" class="size-4" />
                    </span>
                    <div class="min-w-0">
                      <a [routerLink]="['/incubateur/missions', m.id]"
                         class="font-medium text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-input">{{ m.titre }}</a>
                      @if (m.description) {
                        <p class="mt-0.5 line-clamp-2 text-xs text-ink-muted">{{ m.description }}</p>
                      }
                      <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted">
                        <app-badge status="neutral" size="sm">{{ getMissionSourceLabel(m) }}</app-badge>
                        <span>Livrables : {{ m.nombreLivrablesDeposes ?? 0 }}/{{ m.nombreLivrablesAttendus ?? 0 }}</span>
                        @if (m.dateEcheance) {
                          <span [class]="estEnRetard(m) ? 'font-medium text-danger' : ''">
                            Échéance : {{ m.dateEcheance | date:'dd/MM/yyyy' }}
                            @if (estEnRetard(m)) { · {{ joursDeRetard(m) }} j de retard }
                          </span>
                        }
                      </div>
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center gap-2 sm:justify-end">
                    @if (m.priorite) {
                      <app-badge [status]="badgePriorite(m.priorite)" size="sm">{{ libellePriorite(m.priorite) }}</app-badge>
                    }
                    <app-badge [status]="badgeStatut(m.statut)" size="sm">{{ libelleStatutMission(m.statut) }}</app-badge>
                  </div>
                </li>
              }
            </ul>
          </app-card>
        }
      </section>
    }

    <!-- ─── ONGLET : PARCOURS ─── -->
    @if (ongletActif() === 'parcours') {
      <div class="flex flex-col gap-8">

        <!-- Historique de parcours (phases) -->
        <section class="flex flex-col gap-3" aria-label="Historique de parcours">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-base font-semibold text-ink">Historique de parcours</h2>
            @if (!loadingHistorique() && historique().length > 0) {
              <span class="text-xs font-medium text-ink-muted">{{ historique().length }} phase(s)</span>
            }
          </div>

          @if (loadingHistorique()) {
            <app-loading-state message="Chargement de l'historique..." />
          } @else if (historique().length === 0) {
            <app-empty-state icon="folder" title="Aucun historique" description="Aucun historique de parcours enregistré." />
          } @else {
            <app-card padding="none" class="overflow-hidden">
              <div class="custom-scrollbar overflow-x-auto p-5">
                <ol class="flex min-w-max items-start sm:min-w-0">
                  @for (part of historiqueInverse(); track part.id; let i = $index; let last = $last) {
                    <li
                      class="relative min-w-[200px] flex-1 pr-6 last:pr-0"
                      [attr.aria-current]="part.active ? 'step' : null"
                    >
                      @if (!last) {
                        <div class="absolute left-3.5 top-3.5 z-0 h-0.5 w-full bg-line">
                          @if (!part.active) {
                            <div class="absolute inset-0 bg-success"></div>
                          }
                        </div>
                      }

                      <div class="relative z-10 flex size-7 items-center justify-center">
                        @if (!part.active) {
                          <span class="flex size-7 items-center justify-center rounded-pill bg-success text-white">
                            <app-icon name="check" class="size-4" />
                          </span>
                        } @else {
                          <span class="absolute size-7 animate-pulse rounded-pill bg-accent-soft motion-reduce:hidden"></span>
                          <span class="relative flex size-7 items-center justify-center rounded-pill border-2 border-accent bg-surface text-xs font-bold text-accent">
                            {{ i + 1 }}
                          </span>
                        }
                      </div>

                      <div class="mt-3 flex flex-col gap-1">
                        <p class="truncate text-[11px] font-semibold uppercase tracking-wide text-ink-muted">{{ part.nomCohorte }}</p>
                        <p class="text-sm font-semibold leading-tight text-ink">{{ part.nomPhase }}</p>
                        <p class="text-xs text-ink-muted">
                          {{ part.dateEntree | date:'dd/MM/yyyy' }}
                          @if (part.dateSortie) { → {{ part.dateSortie | date:'dd/MM/yyyy' }} }
                        </p>
                        @if (part.motifSortie) {
                          <p class="text-xs font-medium text-ink">Motif : {{ libelleMotifSortie(part.motifSortie) }}</p>
                        }
                        @if (part.raison) {
                          <p class="mt-1 rounded-button border border-line bg-surface-muted p-2 text-xs italic text-ink-muted">
                            « {{ part.raison }} »
                          </p>
                        }
                        <div class="mt-2">
                          @if (part.active) {
                            <app-badge status="info" size="sm">En cours</app-badge>
                          } @else {
                            <app-badge status="success" size="sm">Terminée</app-badge>
                          }
                        </div>
                      </div>
                    </li>
                  }
                </ol>
              </div>
            </app-card>
          }
        </section>

        <!-- Journal de progression -->
        @if (suivi()?.historiqueProgression?.length) {
          <section class="flex flex-col gap-3" aria-label="Journal de progression">
            <h2 class="text-base font-semibold text-ink">Journal de progression</h2>
            <app-card padding="md">
              <ol class="relative flex flex-col gap-5 border-l border-line pl-6">
                @for (hist of suivi()!.historiqueProgression; track hist.id) {
                  <li class="relative">
                    <span class="absolute -left-[29px] top-1.5 size-2.5 rounded-pill border-2 border-surface bg-accent"></span>
                    <p class="text-xs text-ink-muted">
                      {{ hist.dateEntree | date:'dd/MM/yyyy' }} · {{ hist.dateEntree | date:'HH:mm' }}
                    </p>
                    @if (hist.etapeEntree && hist.etapeSortie) {
                      <p class="mt-0.5 text-sm text-ink">
                        <span class="text-ink-muted">Transition :</span>
                        {{ hist.etapeEntree }} → {{ hist.etapeSortie }}
                      </p>
                    }
                    @if (hist.effectuePar) {
                      <p class="text-xs text-ink-muted">Par {{ hist.effectuePar }}</p>
                    }
                  </li>
                }
              </ol>
            </app-card>
          </section>
        }
      </div>
    }

    <!-- ─── ONGLET : RÉUNIONS ─── -->
    @if (ongletActif() === 'reunions') {
      <section class="flex flex-col gap-4" aria-label="Réunions du projet">
        <h2 class="text-base font-semibold text-ink">Réunions</h2>

        @if (suivi(); as s) {
          @if (s.derniereReunion || s.prochaineReunion) {
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">

              @if (s.prochaineReunion) {
                <app-card padding="md">
                  <div class="flex items-start gap-3">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                      <app-icon name="calendar" class="size-4" />
                    </span>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Prochaine réunion</p>
                      <p class="mt-0.5 text-sm font-semibold text-ink">{{ s.prochaineReunion | date:'dd/MM/yyyy à HH:mm' }}</p>
                    </div>
                  </div>
                  @if (s.prochaineReunionObjectif) {
                    <div class="mt-4 border-t border-line pt-4">
                      <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Objectif</p>
                      <p class="mt-1 text-sm text-ink">{{ s.prochaineReunionObjectif }}</p>
                    </div>
                  }
                </app-card>
              }

              @if (s.derniereReunion) {
                <app-card padding="md">
                  <div class="flex items-start gap-3">
                    <span class="flex size-9 shrink-0 items-center justify-center rounded-button bg-surface-subtle text-ink-muted">
                      <app-icon name="calendar" class="size-4" />
                    </span>
                    <div class="min-w-0">
                      <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Dernière réunion</p>
                      <p class="mt-0.5 text-sm font-semibold text-ink">{{ s.derniereReunion | date:'dd/MM/yyyy à HH:mm' }}</p>
                    </div>
                  </div>
                  <div class="mt-4 flex flex-col gap-3 border-t border-line pt-4">
                    @if (s.derniereReunionObjectif) {
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Objectif</p>
                        <p class="mt-1 text-sm text-ink">{{ s.derniereReunionObjectif }}</p>
                      </div>
                    }
                    @if (s.derniereReunionCompteRendu) {
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Compte rendu</p>
                        <p class="mt-1 whitespace-pre-wrap text-sm text-ink">{{ s.derniereReunionCompteRendu }}</p>
                      </div>
                    }
                    @if (s.derniereReunionDecisions) {
                      <div>
                        <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Décisions</p>
                        <p class="mt-1 whitespace-pre-wrap text-sm text-ink">{{ s.derniereReunionDecisions }}</p>
                      </div>
                    }
                  </div>
                </app-card>
              }
            </div>
          } @else {
            <app-empty-state icon="calendar" title="Aucune réunion" description="Aucune réunion enregistrée pour ce projet." />
          }
        } @else {
          <app-empty-state icon="calendar" title="Aucune réunion" description="Aucune réunion enregistrée pour ce projet." />
        }
      </section>
    }

    <!-- Tuile de chiffre clé (synthèse) -->
    <ng-template #tuile let-icone="icone" let-libelle="libelle" let-valeur="valeur" let-alerte="alerte">
      <div class="flex flex-col gap-3">
        <span
          class="flex size-9 items-center justify-center rounded-button"
          [class]="alerte ? 'bg-danger/10 text-danger' : 'bg-accent-soft text-accent'"
        >
          <app-icon [name]="icone" class="size-4" />
        </span>
        <div>
          <p class="text-2xl font-bold tracking-tight" [class]="alerte ? 'text-danger' : 'text-ink'">{{ valeur }}</p>
          <p class="text-xs text-ink-muted">{{ libelle }}</p>
        </div>
      </div>
    </ng-template>
  }

  @if (!loading() && !projet()) {
    <app-empty-state icon="folder" title="Projet introuvable" description="Ce projet n'existe pas ou a été supprimé.">
      <app-button variant="secondary" routerLink="/incubateur/projets">Retour</app-button>
    </app-empty-state>
  }
</div>

<!-- Modale archivage -->
@if (showArchiveModal()) {
  <app-modal title="Archiver le projet" maxWidth="md" (close)="showArchiveModal.set(false)">
    <p class="text-sm text-ink-muted">
      Archiver <strong class="text-ink">{{ projet()?.nom }}</strong> ? Il sera masqué des listes principales.
    </p>
    <div class="mt-4 flex justify-end gap-3">
      <app-button variant="ghost" (click)="showArchiveModal.set(false)">Annuler</app-button>
      <app-button variant="primary" [disabled]="isArchiving()" (click)="confirmerArchivage()">
        {{ isArchiving() ? 'Archivage...' : 'Archiver' }}
      </app-button>
    </div>
  </app-modal>
}

<!-- Modale de promotion -->
@if (promotionOuverte()) {
  <app-modal
    title="Promouvoir ce projet"
    subtitle="Sélectionnez la cohorte cible pour faire avancer le projet."
    maxWidth="md"
    (close)="promotionOuverte.set(false)"
  >
    <div class="flex flex-col gap-5">
      <fieldset>
        <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Cohorte cible *</legend>
        @if (loadingEligibles()) {
          <p class="text-sm text-ink-muted">Chargement...</p>
        } @else if (cohortesEligibles().length === 0) {
          <p class="text-sm italic text-ink-muted">Aucune cohorte éligible.</p>
        } @else {
          <div class="flex max-h-60 flex-col gap-2 overflow-y-auto pr-1">
            @for (c of cohortesEligibles(); track c.id) {
              <label
                class="flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent"
                [class]="cohorteCibleId() === c.id ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'"
              >
                <input type="radio" name="cohorte-cible" [value]="c.id" [checked]="cohorteCibleId() === c.id"
                  (change)="cohorteCibleId.set(c.id)" class="size-4 accent-accent" />
                <div>
                  <p class="text-sm font-medium text-ink">{{ c.nom }}</p>
                  <p class="text-xs text-ink-muted">Phase : {{ c.phase?.nom ?? '—' }}</p>
                </div>
              </label>
            }
          </div>
        }
      </fieldset>

      <app-form-field label="Raison">
        <textarea
          [(ngModel)]="raisonPromotion"
          rows="2"
          placeholder="Raison optionnelle..."
          class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        ></textarea>
      </app-form-field>

      @if (promotion409()) {
        <div role="alert" class="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
          <p class="flex items-center gap-2 text-sm font-semibold text-ink">
            <app-icon name="alert-circle" class="size-4 text-warning" />Missions non validées
          </p>
          <ul class="flex flex-col gap-1">
            @for (m of promotion409()!.missionsNonValidees; track m.titre) {
              <li class="flex items-center gap-1.5 text-xs text-ink">
                <span class="size-1.5 shrink-0 rounded-pill bg-warning" aria-hidden="true"></span>
                {{ m.titre }} — {{ m.statut }}
              </li>
            }
          </ul>
          <label class="flex cursor-pointer items-center gap-2">
            <input type="checkbox" [(ngModel)]="forcerPromotion" class="size-4 rounded border-input-border accent-accent" />
            <span class="text-sm font-medium text-ink">Promouvoir quand même</span>
          </label>
          @if (forcerPromotion) {
            <p class="text-xs text-ink-muted">Une raison est obligatoire ci-dessus.</p>
          }
        </div>
      }
    </div>

    <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
      <app-button variant="secondary" size="sm" (click)="promotionOuverte.set(false)">Annuler</app-button>
      <app-button variant="primary" size="sm" [disabled]="!cohorteCibleId() || promotionEnCours()" (click)="lancerPromotion()">
        {{ promotionEnCours() ? 'Promotion...' : 'Promouvoir' }}
      </app-button>
    </div>
  </app-modal>
}

<!-- Modale de clôture de l'accompagnement -->
@if (clotureOuverte()) {
  <app-modal
    title="Clôturer l'accompagnement"
    subtitle="Le passage vers la phase suivante se fait par promotion. La clôture marque la fin du parcours ou un abandon."
    maxWidth="md"
    (close)="clotureOuverte.set(false)"
  >
    <div class="flex flex-col gap-5">
      <fieldset>
        <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Issue *</legend>
        <div class="flex flex-col gap-2">
          @for (option of optionsIssue; track option.value) {
            <label
              class="flex cursor-pointer items-start gap-3 rounded-card border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent"
              [class]="issueCloture() === option.value ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'"
            >
              <input type="radio" name="issue-cloture" [value]="option.value" [checked]="issueCloture() === option.value"
                (change)="choisirIssue(option.value)" class="mt-0.5 size-4 accent-accent" />
              <span>
                <span class="block text-sm font-medium text-ink">{{ option.label }}</span>
                <span class="block text-xs text-ink-muted">{{ option.aide }}</span>
              </span>
            </label>
          }
        </div>
      </fieldset>

      <app-form-field [label]="motifObligatoire() ? 'Motif *' : 'Motif'">
        <textarea
          [ngModel]="motifCloture()"
          (ngModelChange)="motifCloture.set($event)"
          rows="3"
          [attr.aria-required]="motifObligatoire()"
          [placeholder]="issueCloture() === 'ABANDONNE' ? 'Ex : le porteur a rejoint un emploi salarié' : 'Ex : premier contrat signé, levée réalisée…'"
          class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        ></textarea>
      </app-form-field>

      @if (erreurCloture(); as erreur) {
        <div role="alert" class="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning/10 p-4">
          <p class="flex items-start gap-2 text-sm font-semibold text-ink">
            <app-icon name="alert-circle" class="mt-0.5 size-4 shrink-0 text-warning" />{{ erreur.message }}
          </p>
          @if (erreur.missionsNonValidees.length) {
            <ul class="flex flex-col gap-1">
              @for (m of erreur.missionsNonValidees; track m.titre) {
                <li class="flex items-center gap-1.5 text-xs text-ink">
                  <span class="size-1.5 shrink-0 rounded-pill bg-warning" aria-hidden="true"></span>
                  {{ m.titre }} — {{ m.statut }}
                </li>
              }
            </ul>
          }
          @if (erreur.forcable) {
            <label class="flex cursor-pointer items-center gap-2">
              <input type="checkbox" [checked]="forcerCloture()" (change)="forcerCloture.set(!forcerCloture())"
                class="size-4 rounded border-input-border accent-accent" />
              <span class="text-sm font-medium text-ink">Diplômer quand même (motif obligatoire)</span>
            </label>
          }
        </div>
      }
    </div>

    <div class="mt-6 flex justify-end gap-3 border-t border-line pt-4">
      <app-button variant="secondary" size="sm" (click)="clotureOuverte.set(false)">Annuler</app-button>
      <app-button
        variant="primary"
        size="sm"
        [disabled]="clotureEnCours() || (motifObligatoire() && !motifCloture().trim())"
        (click)="confirmerCloture()"
      >
        {{ clotureEnCours() ? 'Clôture...' : (issueCloture() === 'ABANDONNE' ? "Déclarer l'abandon" : 'Diplômer le projet') }}
      </app-button>
    </div>
  </app-modal>
}
  `,
})
export class ProjetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly suiviProjetService = inject(SuiviProjetService);
  private readonly progressionService = inject(ProgressionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly projet = signal<Projet | undefined>(undefined);
  readonly missions = signal<Mission[]>([]);
  readonly missionsLoading = signal(false);
  readonly missionsError = signal<string | null>(null);
  readonly historique = signal<ParticipationCohorteResponse[]>([]);
  readonly suivi = signal<SuiviProjetDTO | undefined>(undefined);
  readonly loadingSuivi = signal(false);

  // Navigation (onglets + filtre des missions)
  readonly ongletActif = signal<OngletProjet>('apercu');
  readonly filtreMissions = signal<FiltreMissions>('TOUTES');

  // Progression étapes
  readonly feuilleRoute = signal<FeuilleRouteProjet | null>(null);
  readonly loadingEtapes = signal(false);

  // Computed pour inverser l'ordre de l'historique (le plus ancien en premier, le plus récent en dernier)
  readonly historiqueInverse = computed(() => [...this.historique()].reverse());

  // Computed pour les KPIs de suivi (à partir du vrai suivi API)
  readonly missionsEnCours = computed(() => this.suivi()?.missionsEnCours ?? 0);
  readonly missionsEnRetard = computed(() => this.suivi()?.missionsEnRetard ?? 0);
  readonly missionsTerminees = computed(() => this.suivi()?.missionsTerminees ?? 0);
  readonly missionsTotal = computed(() => this.suivi()?.missionsTotal ?? 0);
  readonly livrablesEnAttente = computed(() => this.suivi()?.livrablesEnAttente ?? 0);
  readonly livrablesValides = computed(() => this.suivi()?.livrablesValides ?? 0);
  readonly livrablesRefuses = computed(() => this.suivi()?.livrablesRefuses ?? 0);
  readonly livrablesTotal = computed(() => this.suivi()?.livrablesTotal ?? 0);
  readonly livrablesAttendusTotal = computed(() => this.suivi()?.livrablesAttendusTotal ?? 0);

  // Anneau d'avancement : valeur du suivi, sinon ratio missions validées / total
  readonly rayon = ANNEAU_RAYON;
  readonly circonference = ANNEAU_CIRCONFERENCE;
  readonly avancement = computed(() => {
    const pourcentage = this.suivi()?.pourcentageAvancement;
    if (pourcentage !== undefined && pourcentage !== null) return pourcentage;
    const p = this.projet();
    const total = p?.nombreMissionsTotal ?? 0;
    return total > 0 ? Math.round(((p?.nombreMissionsValidees ?? 0) / total) * 100) : 0;
  });
  readonly anneauDecalage = computed(() => {
    const valeur = Math.min(100, Math.max(0, this.avancement()));
    return ANNEAU_CIRCONFERENCE * (1 - valeur / 100);
  });

  readonly optionsOnglets = computed<TabOption[]>(() => [
    { label: "Vue d'ensemble", value: 'apercu' },
    { label: 'Missions', value: 'missions', count: this.missions().length },
    { label: 'Parcours', value: 'parcours' },
    { label: 'Réunions', value: 'reunions' },
  ]);

  readonly missionsFiltrees = computed(() => {
    const filtre = this.filtreMissions();
    return this.missions().filter(m => this.correspondAuFiltre(m, filtre));
  });

  readonly optionsFiltreMissions = computed<TabOption[]>(() => {
    const liste = this.missions();
    const compter = (f: FiltreMissions) => liste.filter(m => this.correspondAuFiltre(m, f)).length;
    return [
      { label: 'Toutes', value: 'TOUTES', count: liste.length },
      { label: 'En retard', value: 'EN_RETARD', count: compter('EN_RETARD') },
      { label: 'À évaluer', value: 'A_EVALUER', count: compter('A_EVALUER') },
      { label: 'Validées', value: 'VALIDEES', count: compter('VALIDEES') },
    ];
  });

  readonly cohortesEligibles = signal<Cohorte[]>([]);
  readonly loading = signal(true);
  readonly loadingHistorique = signal(false);
  readonly loadingEligibles = signal(false);
  readonly isArchiving = signal(false);
  readonly showArchiveModal = signal(false);
  readonly promotionOuverte = signal(false);
  readonly promotionEnCours = signal(false);
  readonly cohorteCibleId = signal('');
  raisonPromotion = '';
  forcerPromotion = false;
  readonly promotion409 = signal<Promotion409 | null>(null);

  // Clôture de l'accompagnement
  readonly clotureOuverte = signal(false);
  readonly clotureEnCours = signal(false);
  readonly issueCloture = signal<CloturerAccompagnementRequest['issue']>('DIPLOME');
  readonly motifCloture = signal('');
  readonly forcerCloture = signal(false);
  readonly erreurCloture = signal<ErreurCloture | null>(null);
  readonly motifObligatoire = computed(() => this.issueCloture() === 'ABANDONNE' || this.forcerCloture());
  readonly optionsIssue: { value: CloturerAccompagnementRequest['issue']; label: string; aide: string }[] = [
    { value: 'DIPLOME', label: 'Diplômé', aide: 'Fin du parcours : le projet est dans la dernière phase et ses missions obligatoires sont validées.' },
    { value: 'ABANDONNE', label: 'Abandon', aide: "Arrêt de l'accompagnement, quelle que soit la phase. Motif obligatoire." },
  ];
  readonly libelleStade = libelleStade;

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const p = this.projet();
    const items: BreadcrumbItem[] = [{ label: 'Projets', url: '/incubateur/projets' }];
    if (p?.cohorteId && p.nomCohorte) items.push({ label: p.nomCohorte, url: `/incubateur/cohortes/${p.cohorteId}` });
    if (p) items.push({ label: p.nom });
    return items;
  });

  canPromote(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }

  soustitre(p: Projet): string {
    const parts: string[] = [];
    if (p.nomParcours) parts.push(p.nomParcours);
    if (p.nomPhase) parts.push(`Phase : ${p.nomPhase}`);
    else if (p.nomCohorte) parts.push(`Cohorte : ${p.nomCohorte}`);
    return parts.join(' · ');
  }

  initiales(nom: string | undefined | null): string {
    return nom ? nom.substring(0, 2).toUpperCase() : 'PR';
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.projetService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.projet.set(p); this.loading.set(false);
        this.missionsLoading.set(true);
        this.missionsError.set(null);
        this.missionService.getByProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (m) => {
            this.missions.set(m ?? []);
            this.missionsLoading.set(false);
          },
          error: () => {
            this.missions.set([]);
            this.missionsError.set("Les missions du projet n'ont pas pu être chargées.");
            this.missionsLoading.set(false);
          }
        });
        this.loadingHistorique.set(true);
        this.projetService.getHistorique(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: h => { this.historique.set(h); this.loadingHistorique.set(false); }, error: () => this.loadingHistorique.set(false) });
        // Charger le vrai suivi depuis l'API
        this.loadingSuivi.set(true);
        this.suiviProjetService.getSuiviProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (s) => { this.suivi.set(s); this.loadingSuivi.set(false); },
          error: () => this.loadingSuivi.set(false)
        });
        // Charger la progression d'étapes
        this.chargerProgressionEtapes(p.id);
      },
      error: () => this.loading.set(false),
    });
  }

  // --- NAVIGATION ---

  onOngletChange(value: string): void {
    this.ongletActif.set(value as OngletProjet);
  }

  onFiltreMissionsChange(value: string): void {
    this.filtreMissions.set(value as FiltreMissions);
  }

  allerAuxMissions(): void {
    this.ongletActif.set('missions');
    this.filtreMissions.set(this.missionsEnRetard() > 0 ? 'EN_RETARD' : 'A_EVALUER');
  }

  private correspondAuFiltre(m: Mission, filtre: FiltreMissions): boolean {
    switch (filtre) {
      case 'EN_RETARD': return this.estEnRetard(m);
      case 'A_EVALUER': return m.statut === 'SOUMIS';
      case 'VALIDEES': return m.statut === 'VALIDE';
      default: return true;
    }
  }

  // --- CLÔTURE DE L'ACCOMPAGNEMENT ---

  estActif(p: Projet): boolean {
    return !p.archive && (p.statut ?? 'ACTIF') === 'ACTIF';
  }

  ouvrirCloture(): void {
    this.issueCloture.set('DIPLOME');
    this.motifCloture.set('');
    this.forcerCloture.set(false);
    this.erreurCloture.set(null);
    this.clotureOuverte.set(true);
  }

  choisirIssue(issue: CloturerAccompagnementRequest['issue']): void {
    this.issueCloture.set(issue);
    this.forcerCloture.set(false);
    this.erreurCloture.set(null);
  }

  confirmerCloture(): void {
    const p = this.projet(); if (!p) return;
    const motif = this.motifCloture().trim();
    if (this.motifObligatoire() && !motif) return;
    this.clotureEnCours.set(true);
    const req: CloturerAccompagnementRequest = {
      issue: this.issueCloture(),
      motif: motif || undefined,
      forcer: this.issueCloture() === 'DIPLOME' && this.forcerCloture(),
    };
    this.projetService.cloturerAccompagnement(p.id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (updated) => {
        this.projet.set(updated);
        this.clotureEnCours.set(false);
        this.clotureOuverte.set(false);
        this.projetService.getHistorique(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.historique.set(h));
        this.suiviProjetService.getSuiviProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(s => this.suivi.set(s));
      },
      error: (err: HttpErrorResponse) => {
        this.clotureEnCours.set(false);
        this.erreurCloture.set({
          message: err.error?.message ?? 'La clôture a échoué.',
          missionsNonValidees: err.error?.missionsNonValidees ?? [],
          // Seul un diplôme bloqué par la phase ou les missions (409) peut être forcé.
          forcable: err.status === 409 && this.issueCloture() === 'DIPLOME' && !this.forcerCloture(),
        });
      },
    });
  }

  libelleMotifSortie(motif: string): string {
    const libelles: Record<string, string> = { PROMU: 'Promu', RETIRE: 'Retiré', TERMINE: 'Parcours terminé' };
    return libelles[motif] ?? motif;
  }

  // --- PROMOTION / ARCHIVAGE ---

  ouvrirPromotion(): void {
    const p = this.projet(); if (!p) return;
    this.promotion409.set(null); this.cohorteCibleId.set(''); this.raisonPromotion = ''; this.forcerPromotion = false;
    this.promotionOuverte.set(true); this.loadingEligibles.set(true);
    this.projetService.getCohortesEligibles(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: c => { this.cohortesEligibles.set(c); this.loadingEligibles.set(false); }, error: () => this.loadingEligibles.set(false) });
  }

  lancerPromotion(): void {
    const p = this.projet(); if (!p || !this.cohorteCibleId()) return;
    if (this.forcerPromotion && !this.raisonPromotion.trim()) { alert('Raison obligatoire.'); return; }
    this.promotionEnCours.set(true); this.promotion409.set(null);
    const req: PromouvoirProjetRequest = { cohorteCibleId: this.cohorteCibleId(), raison: this.raisonPromotion.trim() || undefined, forcer: this.forcerPromotion };
    this.projetService.promouvoir(p.id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => { this.projet.set(updated); this.promotionEnCours.set(false); this.promotionOuverte.set(false); this.projetService.getHistorique(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.historique.set(h)); },
      error: (err: HttpErrorResponse) => { this.promotionEnCours.set(false); if (err.status === 409 && err.error?.missionsNonValidees) this.promotion409.set(err.error); else alert('Erreur : ' + (err.error?.message ?? err.message)); },
    });
  }

  confirmerArchivage(): void {
    const p = this.projet(); if (!p) return;
    this.isArchiving.set(true);
    this.projetService.archiverProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.isArchiving.set(false); this.showArchiveModal.set(false); this.router.navigate(['/incubateur/projets']); }, error: () => { this.isArchiving.set(false); alert('Erreur lors de l\'archivage.'); } });
  }

  restaurer(): void {
    const p = this.projet(); if (!p) return;
    this.projetService.restaurerProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.projet.update(x => x ? { ...x, archive: false } : x), error: () => alert('Erreur restauration.') });
  }

  // --- LIBELLÉS ET VARIANTES DE BADGES ---

  badgePriorite(priorite?: string): 'success' | 'warning' | 'neutral' | 'danger' {
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

  libellePriorite(priorite?: string): string {
    const labels: Record<string, string> = { URGENTE: 'Urgente', HAUTE: 'Haute', MOYENNE: 'Moyenne', BASSE: 'Basse' };
    return priorite ? labels[priorite] ?? priorite : '';
  }

  badgeStatut(statut: string): 'success' | 'warning' | 'neutral' | 'danger' {
    const m: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = { VALIDE: 'success', EN_COURS: 'warning', A_FAIRE: 'neutral', A_REVOIR: 'danger', SOUMIS: 'warning' };
    return m[statut] ?? 'neutral';
  }

  libelleStatutMission(statut: string): string {
    const labels: Record<string, string> = {
      A_FAIRE: 'À faire',
      EN_COURS: 'En cours',
      SOUMIS: 'Soumise',
      VALIDE: 'Validée',
      A_REVOIR: 'À revoir',
    };
    return labels[statut] ?? statut;
  }

  badgeStatutProgression(statut: string): StatutBadge {
    const m: Record<string, StatutBadge> = { EN_COURS: 'info', EN_PAUSE: 'warning', TERMINE: 'success', ABANDONNE: 'danger' };
    return m[statut] ?? 'neutral';
  }

  getMissionSourceLabel(m: Mission): 'Mission d’étape' | 'Mission de cohorte' | 'Mission' {
    if (m.missionEtapeId) return 'Mission d’étape';
    if (m.missionCohorteId) return 'Mission de cohorte';
    return 'Mission';
  }

  estEnRetard(m: Mission): boolean {
    if (m.statut === 'VALIDE') return false;
    if (!m.dateEcheance) return false;
    return new Date(m.dateEcheance) < new Date();
  }

  joursDeRetard(m: Mission): number {
    if (!m.dateEcheance) return 0;
    const ecart = new Date().getTime() - new Date(m.dateEcheance).getTime();
    return Math.max(0, Math.floor(ecart / 86_400_000));
  }

  formatStatutProgression(statut: string | undefined): string {
    if (!statut) return '';
    switch (statut) {
      case 'EN_COURS':
        return 'En cours';
      case 'EN_PAUSE':
        return 'En pause';
      case 'TERMINE':
        return 'Terminé';
      case 'ABANDONNE':
        return 'Abandonné';
      default:
        return statut;
    }
  }

  /**
   * Charger la progression d'étapes pour le projet
   */
  chargerProgressionEtapes(projetId = this.projet()?.id): void {
    if (!projetId) {
      this.loadingEtapes.set(false);
      this.feuilleRoute.set(null);
      return;
    }

    this.loadingEtapes.set(true);
    this.progressionService.getFeuilleRouteProjet(projetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (route) => {
          this.feuilleRoute.set(route);
          this.loadingEtapes.set(false);
        },
        error: () => {
          this.feuilleRoute.set(null);
          this.loadingEtapes.set(false);
        }
    });
  }

  /**
   * Recharger la progression après validation
   */
  onEtapeValidee(): void {
    this.chargerProgressionEtapes();
    const projetId = this.projet()?.id;
    if (projetId) {
      this.suiviProjetService.getSuiviProjet(projetId).pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: (suivi) => this.suivi.set(suivi) });
    }
  }

  /**
   * Vérifier si l'utilisateur peut valider les étapes
   */
  peutValiderEtapes(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }

}