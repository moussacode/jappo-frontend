import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { SuiviProjetService } from '../../../../core/services/suivi-projet.service';
import { ProgressionService } from '../../../../core/services/progression.service';

import { Projet, ParticipationCohorteResponse, PromouvoirProjetRequest } from '../../../../core/models/projet.model';
import { Mission } from '../../../../core/models/mission.model';
import { Cohorte } from '../../../../core/models/cohorte.model';
import { SuiviProjetDTO } from '../../../../core/models/suivi-projet.model';
import { Etape } from '../../../../core/models/parcours.model';

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

interface Promotion409 {
  message: string;
  missionsNonValidees: { titre: string; statut: string }[];
}

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    BadgeComponent, Icon, CardComponent, PageHeaderComponent,
    ButtonComponent, EmptyStateComponent, ModalComponent,
    BreadcrumbComponent,
    LoadingState,
    EtapeTimelineComponent
  ],
  template: `
<div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
  <!-- <app-breadcrumb [items]="breadcrumbItems()" /> -->
  @if (loading()) {
    <app-loading-state message="Chargement du projet..." />
  }

  @if (!loading() && projet(); as p) {
    <app-page-header [title]="p.nom" [subtitle]="soustitre(p)">
      <div class="flex items-center gap-2">
        @if (canPromote()) {
          <app-button variant="secondary" size="sm" (click)="ouvrirPromotion()">
           Promouvoir
          </app-button>
        }
        @if (!p.archive) {
          <app-button variant="ghost" size="sm" (click)="showArchiveModal.set(true)">Archiver</app-button>
        } @else {
          <app-button variant="ghost" size="sm" (click)="restaurer()">Restaurer</app-button>
        }
      </div>
    </app-page-header>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Phase actuelle</p>
        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ p.nomPhase || '—' }}</p>
      </app-card>
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missions validées</p>
        <p class="text-xl font-extrabold text-gray-900 dark:text-white">
          {{ p.nombreMissionsValidees ?? 0 }}<span class="text-sm font-normal text-gray-400">/{{ p.nombreMissionsTotal ?? 0 }}</span>
        </p>
      </app-card>
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Entrepreneur</p>
        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ p.nomEntrepreneur ?? '—' }}</p>
      </app-card>
    </div>

    <!-- Parcours actuel (hiérarchie) -->
    @if (suivi(); as s) {
      @if (s.nomProgramme || s.nomParcours || s.nomPhase || s.nomEtape) {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Parcours actuel</h2>
          </div>

          <app-card padding="md">
            <div class="space-y-3">
              @if (s.nomProgramme) {
                <div class="flex items-center gap-2">
                  <app-icon name="folder" class="size-4 text-accent" />
                  <div>
                    <p class="text-[10px] text-ink-muted uppercase font-semibold">Programme</p>
                    <p class="text-sm font-bold text-ink">{{ s.nomProgramme }}</p>
                  </div>
                </div>
              }
              @if (s.nomParcours) {
                <div class="flex items-center gap-2 ml-6">
                  <app-icon name="documents" class="size-4 text-accent" />
                  <div>
                    <p class="text-[10px] text-ink-muted uppercase font-semibold">Parcours</p>
                    <p class="text-sm font-bold text-ink">{{ s.nomParcours }}</p>
                  </div>
                </div>
              }
              @if (s.nomPhase) {
                <div class="flex items-center gap-2 ml-6">
                  <app-icon name="layers" class="size-4 text-accent" />
                  <div>
                    <p class="text-[10px] text-ink-muted uppercase font-semibold">Phase</p>
                    <p class="text-sm font-bold text-ink">{{ s.nomPhase }}</p>
                  </div>
                </div>
              }
              @if (s.nomEtape) {
                <div class="flex items-center gap-2 ml-6">
                  <app-icon name="check-circle" class="size-4 text-accent" />
                  <div>
                    <p class="text-[10px] text-ink-muted uppercase font-semibold">Étape actuelle</p>
                    <p class="text-sm font-bold text-ink">{{ s.nomEtape }}</p>
                  </div>
                </div>
              }
            </div>
          </app-card>
        </div>
      }
    }

    <!-- Progression d'étapes -->
    @if (etapesProgression().length > 0) {
      <app-etape-timeline
        [etapes]="etapesProgression()"
        [progressionId]="progressionId() ?? ''"
        [peutValider]="peutValiderEtapes()"
        (validation)="onEtapeValidee()"
      />
    }

    <!-- Progression -->
    @if (suivi(); as s) {
      @if (s.statutProgression) {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Progression</h2>
          </div>

          <app-card padding="md">
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm font-bold text-ink">{{ formatStatutProgression(s.statutProgression || '') }}</span>
                <span class="text-sm font-bold text-ink">{{ s.pourcentageAvancement ?? 0 }}%</span>
              </div>
              <!-- Barre de progression -->
              <div class="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2">
                <div class="bg-accent h-2 rounded-full transition-all" [style.width.%]="s.pourcentageAvancement ?? 0"></div>
              </div>
              <div class="flex items-center justify-between text-xs text-ink-muted">
                @if (s.dateDebutProgression) {
                  <span>Début : {{ s.dateDebutProgression | date:'dd/MM/yyyy' }}</span>
                }
                @if (s.dateDerniereMajProgression) {
                  <span>Màj : {{ s.dateDerniereMajProgression | date:'dd/MM/yyyy' }}</span>
                }
                @if (s.dateFinProgression) {
                  <span>Fin : {{ s.dateFinProgression | date:'dd/MM/yyyy' }}</span>
                }
              </div>
            </div>
          </app-card>
        </div>
      }
    }

    <!-- Historique de progression -->
    @if (suivi(); as s) {
      @if (s.historiqueProgression && s.historiqueProgression.length > 0) {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Historique de progression</h2>
          </div>

          <app-card padding="md">
            <div class="space-y-2">
              @for (hist of s.historiqueProgression; track hist.id) {
                <div class="flex items-start gap-3 py-2 border-b border-line/60 last:border-0">
                  <div class="flex flex-col items-center min-w-[80px]">
                    <span class="text-xs text-ink-muted">{{ hist.dateEntree | date:'dd/MM/yyyy' }}</span>
                    <span class="text-[10px] text-ink-muted">{{ hist.dateEntree | date:'HH:mm' }}</span>
                  </div>
                  <div class="flex-1">
                    @if (hist.etapeEntree && hist.etapeSortie) {
                      <p class="text-sm text-ink">
                        <span class="text-ink-muted">Transition :</span>
                        {{ hist.etapeEntree }} → {{ hist.etapeSortie }}
                      </p>
                    }
                    @if (hist.effectuePar) {
                      <p class="text-xs text-ink-muted">Par : {{ hist.effectuePar }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </app-card>
        </div>
      }
    }

    <!-- Section Suivi (KPIs) -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Suivi du projet</h2>
        @if (loadingSuivi()) {
          <span class="text-xs text-ink-muted animate-pulse">Chargement...</span>
        }
      </div>

      @if (!loadingSuivi()) {
        <app-card padding="md">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Missions en cours -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <app-icon name="missions" class="size-4 text-accent" />
                <span class="text-[11px] font-semibold text-ink-muted uppercase">Missions en cours</span>
              </div>
              <p class="text-lg font-bold text-ink">{{ missionsEnCours() }}</p>
            </div>

            <!-- Missions en retard -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <app-icon name="warning" class="size-4 text-rose-600" />
                <span class="text-[11px] font-semibold text-ink-muted uppercase">En retard</span>
              </div>
              <p class="text-lg font-bold text-ink">{{ missionsEnRetard() }}</p>
            </div>

            <!-- Livrables en attente -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <app-icon name="documents" class="size-4 text-amber-600" />
                <span class="text-[11px] font-semibold text-ink-muted uppercase">Livrables en attente</span>
              </div>
              <p class="text-lg font-bold text-ink">{{ livrablesEnAttente() }}</p>
            </div>

            <!-- Livrables validés -->
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <app-icon name="check" class="size-4 text-emerald-600" />
                <span class="text-[11px] font-semibold text-ink-muted uppercase">Livrables validés</span>
              </div>
              <p class="text-lg font-bold text-ink">{{ livrablesValides() }}</p>
            </div>
          </div>
        </app-card>
      }
    </div>

    <!-- Détail missions et livrables -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <!-- Missions détaillées -->
      <app-card padding="md">
        <h3 class="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Missions</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">Total</span>
            <span class="text-sm font-bold text-ink">{{ missionsTotal() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">En cours</span>
            <span class="text-sm font-bold text-ink">{{ missionsEnCours() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">En retard</span>
            <span class="text-sm font-bold text-rose-600">{{ missionsEnRetard() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">Terminées</span>
            <span class="text-sm font-bold text-emerald-600">{{ missionsTerminees() }}</span>
          </div>
        </div>
      </app-card>

      <!-- Livrables détaillés -->
      <app-card padding="md">
        <h3 class="text-xs font-bold uppercase tracking-wider text-ink-muted mb-3">Livrables</h3>
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">Total</span>
            <span class="text-sm font-bold text-ink">{{ livrablesTotal() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">En attente</span>
            <span class="text-sm font-bold text-ink">{{ livrablesEnAttente() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">À corriger</span>
            <span class="text-sm font-bold text-amber-600">{{ livrablesRefuses() }}</span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-ink-muted">Validés</span>
            <span class="text-sm font-bold text-emerald-600">{{ livrablesValides() }}</span>
          </div>
        </div>
      </app-card>
    </div>

    <!-- Prochaines échéances -->
    @if (suivi(); as s) {
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Prochaines échéances</h2>
        </div>

        @if (s.prochainesEcheances && s.prochainesEcheances.length > 0) {
          <app-card padding="md">
            <div class="space-y-2">
              @for (echeance of s.prochainesEcheances; track echeance.missionId) {
                <div class="flex items-center justify-between py-2 border-b border-line/60 last:border-0">
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-ink">{{ echeance.titreMission }}</span>
                    <span class="text-xs text-ink-muted">{{ echeance.dateLimite | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <app-badge [status]="badgePriorite(echeance.priorite)" size="sm">{{ echeance.priorite }}</app-badge>
                </div>
              }
            </div>
          </app-card>
        } @else {
          <app-card padding="md">
            <p class="text-sm text-ink-muted text-center">Aucune échéance à venir</p>
          </app-card>
        }
      </div>
    }

    <!-- Réunions -->
    @if (suivi(); as s) {
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Réunions</h2>
        </div>

        @if (s.derniereReunion || s.prochaineReunion) {
          <app-card padding="md">
            <div class="space-y-4">
              @if (s.derniereReunion) {
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <app-icon name="calendar" class="size-4 text-ink-muted" />
                    <div>
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Dernière réunion</p>
                      <p class="text-sm font-bold text-ink">{{ s.derniereReunion | date:'dd/MM/yyyy à HH:mm' }}</p>
                    </div>
                  </div>
                  @if (s.derniereReunionObjectif) {
                    <div class="ml-6">
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Objectif</p>
                      <p class="text-sm text-ink">{{ s.derniereReunionObjectif }}</p>
                    </div>
                  }
                  @if (s.derniereReunionCompteRendu) {
                    <div class="ml-6">
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Compte rendu</p>
                      <p class="text-sm text-ink">{{ s.derniereReunionCompteRendu }}</p>
                    </div>
                  }
                  @if (s.derniereReunionDecisions) {
                    <div class="ml-6">
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Décisions</p>
                      <p class="text-sm text-ink">{{ s.derniereReunionDecisions }}</p>
                    </div>
                  }
                </div>
              }
              @if (s.prochaineReunion) {
                <div class="space-y-2 border-t border-line/60 pt-4">
                  <div class="flex items-center gap-2">
                    <app-icon name="calendar" class="size-4 text-accent" />
                    <div>
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Prochaine réunion</p>
                      <p class="text-sm font-bold text-ink">{{ s.prochaineReunion | date:'dd/MM/yyyy à HH:mm' }}</p>
                    </div>
                  </div>
                  @if (s.prochaineReunionObjectif) {
                    <div class="ml-6">
                      <p class="text-[10px] text-ink-muted uppercase font-semibold">Objectif</p>
                      <p class="text-sm text-ink">{{ s.prochaineReunionObjectif }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          </app-card>
        } @else {
          <app-card padding="md">
            <p class="text-sm text-ink-muted text-center">Aucune réunion enregistrée</p>
          </app-card>
        }
      </div>
    }

    <!-- Cohorte -->
    @if (suivi(); as s) {
      @if (s.nomCohorte) {
        <div>
          <div class="flex items-center justify-between mb-3">
            <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Cohorte</h2>
          </div>

          <app-card padding="md">
            <div class="flex items-center gap-2">
              <app-icon name="users" class="size-4 text-accent" />
              <p class="text-sm font-bold text-ink">{{ s.nomCohorte }}</p>
            </div>
          </app-card>
        </div>
      }
    }

    <!-- Frise historique -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Historique de parcours</h2>
        @if (!loadingHistorique() && historique().length > 0) {
          <span class="text-xs font-semibold text-ink-muted">{{ historique().length }} phase(s)</span>
        }
      </div>

      @if (loadingHistorique()) {
        <p class="text-xs text-ink-muted animate-pulse">Chargement de l'historique...</p>
      } @else if (historique().length === 0) {
        <p class="text-xs text-ink-muted italic">Aucun historique de parcours enregistré.</p>
      } @else {
        <app-card padding="none" class=" overflow-hidden ">
          <div class="overflow-x-auto p-4 sm:p-5 custom-scrollbar">
            <ol class="flex items-start min-w-max sm:min-w-0">
              @for (part of historiqueInverse(); track part.id; let i = $index; let last = $last) {
                <li
                  class="relative flex-1 pr-6 last:pr-0 min-w-[200px]"
                  [attr.aria-current]="part.active ? 'step' : null"
                >
                  <!-- Ligne de connexion horizontale centrée sur la pastille -->
                  @if (!last) {
                    <div class="absolute left-3.5 top-3.5 h-0.5 w-full bg-line/80 z-0">
                      @if (!part.active) {
                        <div class="absolute inset-0 bg-emerald-500"></div>
                      }
                    </div>
                  }

                  <!-- Pastille numérotée (1, 2, 3...) de gauche à droite -->
                  <div class="relative z-10 flex size-7 items-center justify-center">
                    @if (!part.active) {
                      <span class="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow-2xs">
                        {{ i + 1 }}
                      </span>
                    } @else {
                      <span class="absolute size-7 rounded-full bg-accent/20 motion-reduce:hidden animate-pulse"></span>
                      <span class="relative flex size-7 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent text-xs font-bold shadow-2xs">
                        {{ i + 1 }}
                      </span>
                    }
                  </div>

                  <!-- Contenu de l'étape -->
                  <div class="mt-3 flex flex-col gap-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-muted text-ink-muted border border-line/60">
                        Phase {{ i + 1 }}
                      </span>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-ink-muted truncate">
                        {{ part.nomCohorte }}
                      </p>
                    </div>
                    
                    <p class="text-xs font-bold text-ink leading-tight">
                      {{ part.nomPhase }}
                    </p>

                    <p class="text-[11px] text-ink-muted">
                      {{ part.dateEntree | date:'dd/MM/yyyy' }}
                      @if (part.dateSortie) { → {{ part.dateSortie | date:'dd/MM/yyyy' }} }
                    </p>

                    @if (part.motifSortie) {
                      <p class="text-[11px] font-medium text-ink">
                        Motif : {{ part.motifSortie }}
                      </p>
                    }

                    @if (part.raison) {
                      <p class="text-[11px] text-ink-muted italic bg-surface-muted/50 p-2 rounded-lg border border-line/40 mt-1">
                        « {{ part.raison }} »
                      </p>
                    }

                    <div class="mt-2">
                      @if (part.active) {
                        <app-badge status="info" size="sm" class="w-fit font-bold">En cours</app-badge>
                      } @else {
                        <app-badge status="success" size="sm" class="w-fit font-bold">Terminée</app-badge>
                      }
                    </div>
                  </div>
                </li>
              }
            </ol>
          </div>
        </app-card>
      }
    </div>

    <!-- Missions -->
    <div>
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Missions</h2>
      @if (missionsLoading()) {
        <p class="text-sm text-gray-400 animate-pulse">Chargement des missions du projet...</p>
      } @else if (missionsError()) {
        <div class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {{ missionsError() }}
        </div>
      } @else if (missions().length === 0) {
        <div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
          Aucune mission assignée à ce projet. Les missions créées depuis une étape apparaissent ici lorsqu’elles sont correctement rattachées au bon projet.
        </div>
      } @else {
        <div class="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-gray-100 dark:divide-white/5">
              @for (m of missions(); track m.id) {
                <tr class="hover:bg-gray-50 dark:hover:bg-white/5 align-top">
                  <td class="px-4 py-3">
                    <div class="flex flex-col gap-2">
                      <div class="flex items-center gap-2">
                        @if (estEnRetard(m)) {
                          <app-icon name="warning" class="size-4 text-rose-600" />
                        }
                        <a [routerLink]="['/incubateur/missions', m.id]" class="font-medium text-gray-900 dark:text-white hover:text-indigo-500">{{ m.titre }}</a>
                      </div>
                      @if (m.description) {
                        <p class="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{{ m.description }}</p>
                      }
                      <div class="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                        <span class="rounded-full border border-gray-200 px-2 py-0.5">{{ getMissionSourceLabel(m) }}</span>
                        <span>Livrables: {{ m.nombreLivrablesDeposes ?? 0 }}/{{ m.nombreLivrablesAttendus ?? 0 }}</span>
                      </div>
                    </div>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-400 align-top">{{ m.dateEcheance ?? '—' }}</td>
                  <td class="px-4 py-3 align-top">
                    @if (m.priorite) {
                      <app-badge [status]="badgePriorite(m.priorite)" size="sm">{{ m.priorite }}</app-badge>
                    }
                  </td>
                  <td class="px-4 py-3 text-right align-top">
                    <app-badge [status]="badgeStatut(m.statut)" size="sm">{{ m.statut }}</app-badge>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
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
    <p class="text-sm text-gray-600 dark:text-gray-300">
      Archiver <strong>{{ projet()?.nom }}</strong> ? Il sera masqué des listes principales.
    </p>
    <div class="mt-4 flex justify-end gap-3">
      <app-button variant="ghost" (click)="showArchiveModal.set(false)">Annuler</app-button>
      <app-button variant="primary" (click)="confirmerArchivage()">Archiver</app-button>
    </div>
  </app-modal>
}

<!-- Modale de promotion (remplacement du panneau latéral) -->
@if (promotionOuverte()) {
  <app-modal
    title="Promouvoir ce projet"
    subtitle="Sélectionnez la cohorte cible pour faire avancer le projet."
    maxWidth="md"
    (close)="promotionOuverte.set(false)"
  >
    <div class="space-y-5">
      <div>
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Cohorte cible *</p>
        @if (loadingEligibles()) {
          <p class="text-sm text-gray-400">Chargement...</p>
        } @else if (cohortesEligibles().length === 0) {
          <p class="text-sm text-gray-400 italic">Aucune cohorte éligible.</p>
        } @else {
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            @for (c of cohortesEligibles(); track c.id) {
              <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                [class]="cohorteCibleId() === c.id ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10'">
                <input type="radio" [value]="c.id" [checked]="cohorteCibleId() === c.id" (change)="cohorteCibleId.set(c.id)" class="text-indigo-600"/>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ c.nom }}</p>
                  <p class="text-xs text-gray-500">Phase : {{ c.phase?.nom ?? '—' }}</p>
                </div>
              </label>
            }
          </div>
        }
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Raison</label>
        <textarea [(ngModel)]="raisonPromotion" rows="2" placeholder="Raison optionnelle..."
          class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
      </div>

      @if (promotion409()) {
        <div class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <app-icon name="alert-circle" class="w-4 h-4"/>Missions non validées
          </p>
          <ul class="space-y-1">
            @for (m of promotion409()!.missionsNonValidees; track m.titre) {
              <li class="text-xs text-amber-700 dark:text-amber-400">• {{ m.titre }} — {{ m.statut }}</li>
            }
          </ul>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="forcerPromotion" class="rounded text-amber-500"/>
            <span class="text-sm text-amber-800 dark:text-amber-300 font-medium">Promouvoir quand même</span>
          </label>
        </div>
      }
    </div>

    <div class="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-4">
      <app-button variant="secondary" size="sm" (click)="promotionOuverte.set(false)">Annuler</app-button>
      <app-button variant="primary" size="sm" [disabled]="!cohorteCibleId() || promotionEnCours()" (click)="lancerPromotion()">
        {{ promotionEnCours() ? 'Promotion...' : 'Promouvoir' }}
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

  // Progression étapes
  readonly etapesProgression = signal<Etape[]>([]);
  readonly progressionId = signal<string | undefined>(undefined);
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
        this.chargerProgressionEtapes();
      },
      error: () => this.loading.set(false),
    });
  }

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
      error: (err: HttpErrorResponse) => { this.promotionEnCours.set(false); if (err.status === 409) this.promotion409.set(err.error); else alert('Erreur : ' + (err.error?.message ?? err.message)); },
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

  badgeStatut(statut: string): 'success' | 'warning' | 'neutral' | 'danger' {
    const m: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = { VALIDE: 'success', EN_COURS: 'warning', A_FAIRE: 'neutral', A_REVOIR: 'danger', SOUMIS: 'warning' };
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
  chargerProgressionEtapes(): void {
    const p = this.projet();
    if (!p || !p.phaseId) {
      this.loadingEtapes.set(false);
      return;
    }

    this.loadingEtapes.set(true);

    // Récupérer les progressions du projet
    this.progressionService.getProgressionsByProjetId(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (progressions) => {
        if (progressions.length > 0) {
          const progression = progressions[0];
          this.progressionId.set(progression.id);

          // Utiliser le service pour récupérer les étapes avec leur statut de progression
          this.progressionService.getEtapesProgression(progression.id, p.phaseId!).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (etapes) => {
              this.etapesProgression.set(etapes);
              this.loadingEtapes.set(false);
            },
            error: () => this.loadingEtapes.set(false)
          });
        } else {
          this.loadingEtapes.set(false);
        }
      },
      error: () => this.loadingEtapes.set(false)
    });
  }

  /**
   * Recharger la progression après validation
   */
  onEtapeValidee(): void {
    this.chargerProgressionEtapes();
  }

  /**
   * Vérifier si l'utilisateur peut valider les étapes
   */
  peutValiderEtapes(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }
}