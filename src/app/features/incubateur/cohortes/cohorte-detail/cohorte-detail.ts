import {
  Component, inject, signal, computed, DestroyRef, OnInit
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { RessourceService } from '../../../../core/services/ressource.service';
import { MeetingService } from '../../../../core/services/meeting.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { Cohorte } from '../../../../core/models/cohorte.model';
import { Projet, PromouvoirProjetRequest, PromotionGroupeeRequest, PromotionGroupeeResultat } from '../../../../core/models/projet.model';
import { LivrableAttenduMission, Mission, MissionCohorteResponse } from '../../../../core/models/mission.model';
import { Etape, FeuilleRouteProjet, MissionEtape, StatutFeuilleRoute } from '../../../../core/models/parcours.model';
import { LivrableResponse } from '../../../../core/models/livrable.model';
import { EtapeService } from '../../../../core/services/etape.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { ProgressionService } from '../../../../core/services/progression.service';
import { Ressource } from '../../../../core/models/ressource.model';
import { Meeting } from '../../../../core/models/meeting.model';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { BreadcrumbComponent } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';

type OngletId = 'projets' | 'missions' | 'ressources' | 'reunions';
type BadgeVariant = 'primary' | 'warning' | 'success' | 'danger' | 'info' | 'neutral' | 'purple' | 'pink';

interface MissionNonValidee { titre: string; statut: string; }
interface Promotion409 {
  message: string;
  missionsNonValidees: MissionNonValidee[];
}

type FiltreSuivi = 'TOUS' | 'NON_SOUMIS' | 'SOUMIS' | 'A_CORRIGER' | 'VALIDE' | 'EN_RETARD';

interface MissionPourSuivi {
  id: string;
  titre: string;
  description?: string | null;
  dateEcheance?: string | null;
  etapeId?: string | null;
  attendus: LivrableAttenduMission[];
  suivis: Mission[];
}

interface LigneSuivi {
  projet: Projet;
  mission?: Mission;
}

@Component({
  selector: 'app-cohorte-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    Icon, ButtonComponent, BadgeComponent, PageHeaderComponent, BreadcrumbComponent,
    EmptyStateComponent, CardComponent, ModalComponent, FormFieldComponent,
    LoadingState, ErrorState
],
  template: `
<div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

  <!-- Chargement -->
  @if (chargement()) {
    <app-loading-state title="Chargement de la cohorte..." />
  }

  <!-- Cohorte introuvable / erreur de chargement -->
  @if (!chargement() && !cohorte()) {
    <app-empty-state
      iconName="users"
      title="Cohorte introuvable"
      description="Cette cohorte n'existe pas ou n'a pas pu être chargée."
    >
      <a routerLink="/incubateur/cohortes"
         class="text-sm font-medium text-accent hover:text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-input">
        Retour aux cohortes
      </a>
    </app-empty-state>
  }

  @if (!chargement() && cohorte()) {

    <!-- En-tête -->
    <header class="flex flex-col gap-3">
      <app-breadcrumb [items]="[{ label: 'Cohortes', url: '/incubateur/cohortes' }, { label: cohorte()!.nom }]" />

      <app-page-header [title]="cohorte()!.nom">
        @if (isAdminOrCoach()) {
          <app-button variant="secondary" size="sm" [routerLink]="['/incubateur/cohortes', cohorte()!.id, 'rapport']">
            <app-icon name="bar-chart" class="mr-1 h-4 w-4" />
            Rapport
          </app-button>
        }
        @if (isAdmin()) {
          <app-button variant="secondary" size="sm" (click)="ouvrirInvitation()">
            <app-icon name="plus" class="mr-1 h-4 w-4" />
            Inviter des entrepreneurs
          </app-button>
        }
      </app-page-header>

      <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-muted">
        <app-badge status="primary">{{ cohorte()!.phase?.nom ?? 'Phase inconnue' }}</app-badge>
        <span>{{ projets().length }} projet(s)</span>
        @if (cohorte()?.coachs && cohorte()!.coachs!.length > 0) {
          <span aria-hidden="true" class="text-ink-faint">·</span>
          <span>
            Coach{{ cohorte()!.coachs!.length > 1 ? 's' : '' }} :
            <span class="font-medium text-ink">{{ getCoachNames() }}</span>
          </span>
        }
      </div>
    </header>

    <!-- Onglets -->
    <div class="border-b border-line">
      <nav class="-mb-px flex gap-1 overflow-x-auto" role="tablist" aria-label="Sections de la cohorte">
        @for (onglet of onglets; track onglet.id) {
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="ongletActif() === onglet.id"
            (click)="changerOnglet(onglet.id)"
            class="whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            [class]="ongletActif() === onglet.id
              ? 'border-accent text-accent'
              : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink'"
          >
            {{ onglet.label }}
          </button>
        }
      </nav>
    </div>

    <!-- ─── ONGLET PROJETS ─── -->
    @if (ongletActif() === 'projets') {
      <section class="flex flex-col gap-4" aria-label="Projets de la cohorte">

        @if (chargementProjets()) {
          <app-loading-state title="Chargement des projets..." />
        } @else if (projets().length === 0) {
          <app-empty-state
            iconName="users"
            title="Aucun projet dans cette cohorte"
            description="Invitez des entrepreneurs pour créer des projets."
          />
        } @else {
          <!-- Barre de sélection / promotion -->
          @if (isAdminOrCoach() && selectionnes().size > 0) {
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-accent/30 bg-accent-soft px-4 py-3">
              <p class="text-sm font-medium text-ink">{{ selectionnes().size }} projet(s) sélectionné(s)</p>
              <app-button variant="primary" size="sm" (click)="ouvrirPromotion()">
                Promouvoir la sélection ({{ selectionnes().size }})
              </app-button>
            </div>
          }

          <!-- Tableau projets -->
          <app-card padding="none">
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="border-b border-line bg-surface-subtle">
                  <tr>
                    <th scope="col" class="w-10 px-4 py-3">
                      <input type="checkbox"
                        aria-label="Sélectionner tous les projets"
                        [checked]="tousSelectionnes()"
                        (change)="toggleTousSelectionnes($event)"
                        class="size-4 rounded border-input-border accent-accent" />
                    </th>
                    <th scope="col" class="px-4 py-3 text-left font-medium text-ink-muted">Projet</th>
                    <th scope="col" class="hidden px-4 py-3 text-left font-medium text-ink-muted sm:table-cell">Entrepreneur</th>
                    <th scope="col" class="hidden px-4 py-3 text-left font-medium text-ink-muted md:table-cell">Score</th>
                    <th scope="col" class="px-4 py-3 text-left font-medium text-ink-muted">Missions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (p of projets(); track p.id) {
                    <tr class="transition-colors hover:bg-surface-subtle">
                      <td class="px-4 py-3">
                        <input type="checkbox"
                          [attr.aria-label]="'Sélectionner ' + p.nom"
                          [checked]="selectionnes().has(p.id)"
                          (change)="toggleSelection(p.id)"
                          class="size-4 rounded border-input-border accent-accent" />
                      </td>
                      <td class="px-4 py-3">
                        <a [routerLink]="['/incubateur/projets', p.id]"
                           class="font-medium text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-input">
                          {{ p.nom }}
                        </a>
                      </td>
                      <td class="hidden px-4 py-3 text-ink-muted sm:table-cell">{{ p.nomEntrepreneur ?? '—' }}</td>
                      <td class="hidden px-4 py-3 md:table-cell">
                        <span class="font-mono text-xs text-ink">{{ p.scoreMaturite ?? '—' }}</span>
                      </td>
                      <td class="px-4 py-3">
                        @if ((p.nombreMissionsTotal ?? 0) > 0) {
                          @if (p.nombreMissionsValidees === p.nombreMissionsTotal) {
                            <app-badge status="success">{{ p.nombreMissionsValidees ?? 0 }}/{{ p.nombreMissionsTotal }}</app-badge>
                          } @else {
                            <span class="text-xs text-ink-muted">{{ p.nombreMissionsValidees ?? 0 }}/{{ p.nombreMissionsTotal }}</span>
                          }
                        } @else {
                          <span class="text-xs text-ink-faint">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </app-card>
        }
      </section>
    }

    <!-- ─── ONGLET MISSIONS ─── -->
    @if (ongletActif() === 'missions') {
      <section class="flex flex-col gap-4" aria-label="Suivi des missions">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <h2 class="text-base font-semibold text-ink">Suivi par phase et étape</h2>
            <p class="text-xs text-ink-muted">
              {{ cohorte()!.phase?.nom ?? 'Phase non définie' }} · missions et remises des projets de cette cohorte
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <label class="text-xs text-ink-muted" for="filtre-suivi">Filtrer les entrepreneurs</label>
            <select id="filtre-suivi" [ngModel]="filtreSuivi()" (ngModelChange)="filtreSuivi.set($event)"
              class="rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <option value="TOUS">Tous les statuts</option>
              <option value="NON_SOUMIS">Non soumis</option>
              <option value="SOUMIS">Soumis / à évaluer</option>
              <option value="A_CORRIGER">À corriger</option>
              <option value="VALIDE">Validé</option>
              <option value="EN_RETARD">En retard</option>
            </select>
            <a [routerLink]="['/incubateur/missions']" [queryParams]="{cohorteId: cohorteId()}"
               class="text-sm font-medium text-accent hover:text-accent-strong hover:underline">
              Toutes les missions →
            </a>
          </div>
        </div>

        @if (chargementMissions()) {
          <app-loading-state title="Chargement du suivi des missions..." />
        } @else if (erreurSuiviMissions()) {
          <app-error-state [description]="erreurSuiviMissions()!" (retry)="chargerMissions()" />
        } @else if (etapesSuivi().length === 0 && missionsSansEtape().length === 0) {
          <app-empty-state iconName="check-circle" title="Aucune mission dans cette phase" description="Aucune mission n’est encore associée aux étapes ou à cette cohorte." />
        } @else {

          <!-- Accès à la phase -->
          <app-card variant="muted" padding="md">
            <div class="flex flex-col gap-3">
              <div>
                <h3 class="text-sm font-semibold text-ink">Accès à la phase pour les projets</h3>
                <p class="mt-1 text-xs text-ink-muted">
                  États calculés par la progression de chaque projet ; aucun accès n’est modifié depuis cet écran.
                </p>
              </div>
              <div class="flex flex-wrap gap-2">
                @for (s of statutsPhase; track s.statut) {
                  <app-badge [status]="s.variant">{{ nombreStatutPhase(s.statut) }} {{ s.label }}</app-badge>
                }
              </div>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                @for (projet of projets(); track projet.id) {
                  <div class="rounded-button border border-line bg-surface px-3 py-2">
                    <div class="flex items-center justify-between gap-2">
                      <span class="truncate text-xs font-medium text-ink">{{ projet.nom }}</span>
                      <app-badge [status]="varianteAcces(statutPhaseProjet(projet.id))">
                        {{ libelleAcces(statutPhaseProjet(projet.id)) }}
                      </app-badge>
                    </div>
                    @if (motifPhaseProjet(projet.id)) {
                      <p class="mt-1 text-[11px] text-ink-muted">{{ motifPhaseProjet(projet.id) }}</p>
                    }
                  </div>
                } @empty {
                  <p class="text-xs text-ink-muted">Aucun projet actif dans cette cohorte.</p>
                }
              </div>
            </div>
          </app-card>

          <!-- Étapes -->
          @for (etape of etapesSuivi(); track etape.id) {
            <details class="overflow-hidden rounded-card border border-line bg-surface" open>
              <summary class="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                <span class="min-w-0">
                  <span class="block truncate text-sm font-semibold text-ink">{{ etape.ordre }}. {{ etape.nom }}</span>
                  @if (etape.description) {
                    <span class="mt-0.5 block text-xs text-ink-muted">{{ etape.description }}</span>
                  }
                </span>
                <span class="shrink-0 text-xs text-ink-muted">
                  {{ nombreStatutEtape(etape.id, 'ACCESSIBLE') + nombreStatutEtape(etape.id, 'ACTIVE') }} accessible(s) ·
                  {{ nombreStatutEtape(etape.id, 'A_ACTIVER') }} à activer ·
                  {{ nombreStatutEtape(etape.id, 'VERROUILLEE') }} verrouillée(s) ·
                  {{ nombreStatutEtape(etape.id, 'VALIDEE') }} validée(s) ·
                  {{ nombreStatutEtape(etape.id, 'ARCHIVEE') }} archivée(s)
                </span>
              </summary>

              <div class="space-y-2 border-t border-line p-3">
                <!-- État de l'étape par projet -->
                <details class="rounded-button border border-line bg-surface-muted">
                  <summary class="cursor-pointer px-3 py-2 text-xs font-medium text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    Voir l’état de l’étape par projet
                  </summary>
                  <div class="grid gap-2 border-t border-line p-3 sm:grid-cols-2 lg:grid-cols-3">
                    @for (projet of projets(); track projet.id) {
                      <div class="flex flex-col gap-1 rounded-button border border-line bg-surface px-3 py-2">
                        <div class="flex items-center justify-between gap-2">
                          <span class="truncate text-xs font-medium text-ink">{{ projet.nom }}</span>
                          <app-badge [status]="varianteAcces(statutEtapeProjet(projet.id, etape.id))">
                            {{ libelleAcces(statutEtapeProjet(projet.id, etape.id)) }}
                          </app-badge>
                        </div>
                        @if (motifEtapeProjet(projet.id, etape.id)) {
                          <p class="text-[11px] text-ink-muted">{{ motifEtapeProjet(projet.id, etape.id) }}</p>
                        }
                      </div>
                    } @empty {
                      <p class="text-xs text-ink-muted">Aucun projet actif dans cette cohorte.</p>
                    }
                  </div>
                </details>

                <!-- Missions de l'étape -->
                @for (mission of missionsPourEtape(etape.id); track mission.id) {
                  <details class="rounded-button border border-line" (toggle)="chargerRemisesMission($event, mission)">
                    <summary class="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-3 py-3 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-ink">{{ mission.titre }}</span>
                        <span class="mt-0.5 block text-xs text-ink-muted">
                          {{ mission.suivis.length }}/{{ projets().length }} projet(s) · {{ nombreStatutMission(mission, 'SOUMIS') }} soumis ·
                          {{ nombreStatutMission(mission, 'A_CORRIGER') }} à corriger · {{ nombreStatutMission(mission, 'VALIDE') }} validé(s) ·
                          {{ nombreStatutMission(mission, 'NON_SOUMIS') }} non soumis · {{ nombreStatutMission(mission, 'EN_RETARD') }} en retard
                        </span>
                      </span>
                      <span class="shrink-0 text-xs font-medium text-accent">Ouvrir le suivi</span>
                    </summary>

                    <div class="border-t border-line p-3">
                      @if (chargementRemises().has(mission.id)) {
                        <app-loading-state title="Chargement des remises..." />
                      } @else if (erreursRemises()[mission.id]) {
                        <p role="alert" class="text-sm text-danger">{{ erreursRemises()[mission.id] }}</p>
                      } @else {
                        <div class="space-y-2">
                          @for (ligne of lignesSuivi(mission); track ligne.projet.id) {
                            @if (afficherLigneSuivi(ligne, mission)) {
                              <article class="rounded-button bg-surface-muted p-3">
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div class="min-w-0">
                                    <a [routerLink]="['/incubateur/projets', ligne.projet.id]"
                                       class="font-medium text-ink hover:text-accent">
                                      {{ ligne.projet.nom }}
                                    </a>
                                    <p class="text-xs text-ink-muted">{{ ligne.projet.nomEntrepreneur || 'Entrepreneur non renseigné' }}</p>
                                  </div>
                                  <div class="flex flex-wrap items-center gap-2 text-xs">
                                    <app-badge [status]="varianteStatutSuivi(ligne, mission)">
                                      {{ libelleStatutSuivi(ligne, mission) }}
                                    </app-badge>
                                    <span class="text-ink-muted">
                                      {{ nombreRemises(ligne) }}/{{ nombreAttendus(mission) }} livrable(s)
                                    </span>
                                    @if (ligne.mission) {
                                      <a [routerLink]="['/incubateur/missions', ligne.mission.id]"
                                         class="font-medium text-accent hover:text-accent-strong hover:underline">
                                        Ouvrir pour corriger
                                      </a>
                                    }
                                  </div>
                                </div>

                                @if (remisesParMission()[ligne.mission?.id ?? '']?.length) {
                                  <div class="mt-3 space-y-2 border-t border-line pt-2">
                                    @for (livrable of remisesParMission()[ligne.mission?.id ?? '']; track livrable.id) {
                                      <div class="flex flex-col gap-1 text-xs sm:flex-row sm:items-center sm:justify-between">
                                        <span class="text-ink">
                                          {{ livrable.livrableAttenduId ? nomAttendu(mission, livrable.livrableAttenduId) : livrable.nom }}
                                          <span class="text-ink-faint">· {{ livrable.typePiece }} · v{{ livrable.numeroVersion ?? 1 }}</span>
                                        </span>
                                        <span class="flex items-center gap-3">
                                          <app-badge [status]="varianteStatutLivrable(livrable.statut)">
                                            {{ libelleStatutLivrable(livrable.statut) }}
                                          </app-badge>
                                          @if (livrable.typePiece === 'TEMPLATE') {
                                            <span class="text-ink-muted">Réponse BMC</span>
                                          } @else {
                                            <a [href]="livrable.url" target="_blank" rel="noopener noreferrer"
                                               class="font-medium text-accent hover:text-accent-strong hover:underline">
                                              Consulter
                                            </a>
                                          }
                                        </span>
                                      </div>
                                      @if (livrable.typePiece === 'TEMPLATE' && attenduPourRemise(mission, livrable.livrableAttenduId); as attendu) {
                                        <div class="space-y-2 rounded-button border border-line bg-surface p-3">
                                          @for (champ of attendu.templateFields ?? []; track champ.id) {
                                            <div>
                                              <p class="text-[11px] font-semibold text-ink-muted">{{ champ.label }}</p>
                                              <p class="mt-1 whitespace-pre-wrap text-xs text-ink">{{ reponseTemplate(livrable.contenu, champ.id) }}</p>
                                            </div>
                                          }
                                        </div>
                                      }
                                    }
                                  </div>
                                }
                              </article>
                            }
                          } @empty {
                            <p class="py-2 text-sm text-ink-muted">Aucun entrepreneur ne correspond à ce filtre.</p>
                          }
                        </div>
                      }
                    </div>
                  </details>
                } @empty {
                  <p class="py-2 text-sm text-ink-muted">Aucune mission associée à cette étape.</p>
                }
              </div>
            </details>
          }

          <!-- Missions sans étape -->
          @if (missionsSansEtape().length > 0) {
            <details class="overflow-hidden rounded-card border border-dashed border-line-strong bg-surface">
              <summary class="cursor-pointer px-4 py-3 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                Missions sans étape ({{ missionsSansEtape().length }})
              </summary>
              <div class="space-y-2 border-t border-line p-3">
                @for (mission of missionsSansEtape(); track mission.id) {
                  <details class="rounded-button border border-line" (toggle)="chargerRemisesMission($event, mission)">
                    <summary class="cursor-pointer px-3 py-3 text-sm font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                      {{ mission.titre }} · {{ mission.suivis.length }} suivi(s)
                    </summary>
                    <div class="p-3 text-xs text-ink-muted">Ouvrez le suivi de cette mission pour consulter les remises par projet.</div>
                  </details>
                }
              </div>
            </details>
          }
        }
      </section>
    }

    <!-- ─── ONGLET RESSOURCES ─── -->
    @if (ongletActif() === 'ressources') {
      <section class="flex flex-col gap-4" aria-label="Ressources de la cohorte">
        @if (chargementRessources()) {
          <app-loading-state title="Chargement des ressources..." />
        } @else if (ressources().length === 0) {
          <app-empty-state iconName="book-open" title="Aucune ressource" description="Aucune ressource associée à cette cohorte." />
        } @else {
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            @for (r of ressources(); track r.id) {
              <app-card>
                <div class="flex items-start gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                    <app-icon [name]="r.type === 'LIEN' ? 'external-link' : 'file'" class="h-4 w-4" />
                  </div>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink">{{ r.titre }}</p>
                    @if (isResourceFile(r)) {
                      <button
                        type="button"
                        (click)="openResourceFile(r)"
                        [disabled]="openingResourceId() === r.id"
                        class="block truncate text-left text-xs text-accent hover:text-accent-strong hover:underline"
                      >{{ openingResourceId() === r.id ? 'Ouverture…' : (r.nomFichier || r.titre) }}</button>
                    } @else if (safeResourceUrl(r.url); as resourceUrl) {
                      <a [href]="resourceUrl" target="_blank" rel="noopener noreferrer"
                         class="block truncate text-xs text-accent hover:text-accent-strong hover:underline">{{ r.url }}</a>
                    }
                  </div>
                </div>
              </app-card>
            }
          </div>
        }
      </section>
    }

    <!-- ─── ONGLET RÉUNIONS ─── -->
    @if (ongletActif() === 'reunions') {
      <section class="flex flex-col gap-4" aria-label="Réunions de la cohorte">
        @if (isAdminOrCoach()) {
          <div class="flex justify-end">
            <app-button variant="primary" size="sm" (click)="planifierReunion()">
              <app-icon name="calendar" class="mr-1 h-4 w-4" />
              Planifier une réunion
            </app-button>
          </div>
        }
        @if (chargementReunions()) {
          <app-loading-state title="Chargement des réunions..." />
        } @else if (reunions().length === 0) {
          <app-empty-state iconName="calendar" title="Aucune réunion" description="Planifiez une réunion pour cette cohorte." />
        } @else {
          <div class="grid grid-cols-1 gap-3">
            @for (r of reunions(); track r.id) {
              <app-card>
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink">{{ r.title }}</p>
                    <p class="mt-0.5 text-xs text-ink-muted">
                      {{ r.scheduledAt | date:'dd/MM/yyyy HH:mm' }} · {{ r.durationMinutes }} min
                    </p>
                  </div>
                  <a [routerLink]="['/incubateur/reunions', r.id]"
                     class="shrink-0 text-xs font-medium text-accent hover:text-accent-strong hover:underline">Rejoindre</a>
                </div>
              </app-card>
            }
          </div>
        }
      </section>
    }

  }<!-- fin if cohorte -->

  <!-- ─── MODALE INVITATION ─── -->
  @if (invitationOuverte()) {
    <app-modal
      title="Inviter des entrepreneurs"
      subtitle="Saisissez les adresses e-mail séparées par des virgules ou une par ligne."
      (close)="invitationOuverte.set(false)"
    >
      <app-form-field label="Adresses e-mail" [required]="true">
        <textarea
          id="emails-invitation"
          [(ngModel)]="emailsInvitation"
          rows="4"
          placeholder="fatou@example.com&#10;cheikh@example.com"
          class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        ></textarea>
      </app-form-field>
      <div class="mt-4 flex justify-end gap-3">
        <app-button variant="secondary" (click)="invitationOuverte.set(false)">Annuler</app-button>
        <app-button variant="primary" [disabled]="invitationEnCours()" (click)="envoyerInvitations()">Envoyer</app-button>
      </div>
    </app-modal>
  }

  <!-- ─── PANNEAU PROMOTION ─── -->
  @if (promotionOuverte()) {
    <div class="fixed inset-0 z-50 flex items-start justify-end"
         role="dialog" aria-modal="true" aria-labelledby="promotion-titre"
         (keydown.escape)="promotionOuverte.set(false)">
      <div class="fixed inset-0 bg-ink/40 backdrop-blur-sm" (click)="promotionOuverte.set(false)"></div>
      <div class="relative z-10 flex h-full w-full max-w-lg flex-col overflow-y-auto border-l border-line bg-surface shadow-subtle">

        <div class="sticky top-0 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
          <h2 id="promotion-titre" class="text-base font-semibold text-ink">Promouvoir la sélection</h2>
          <button type="button" (click)="promotionOuverte.set(false)" aria-label="Fermer"
            class="rounded-button p-2 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <app-icon name="x" class="h-5 w-5" />
          </button>
        </div>

        <div class="flex-1 space-y-6 px-6 py-6">

          <!-- Projets sélectionnés -->
          <div>
            <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Projets à promouvoir</p>
            <ul class="space-y-1">
              @for (id of selectionnes(); track id) {
                @if (projetParId(id); as p) {
                  <li class="flex items-center gap-2 text-sm text-ink">
                    <app-icon name="check" class="h-4 w-4 shrink-0 text-accent" />
                    {{ p.nom }}
                  </li>
                }
              }
            </ul>
          </div>

          <!-- Cohorte cible -->
          <fieldset>
            <legend class="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">Cohorte cible *</legend>
            @if (chargementEligibles()) {
              <p class="text-sm text-ink-muted">Chargement...</p>
            } @else if (cohortesEligibles().length === 0) {
              <p class="text-sm italic text-ink-muted">Aucune cohorte éligible (phase d'ordre supérieur).</p>
              <a routerLink="/incubateur/cohortes"
                 class="mt-1 inline-block text-xs font-medium text-accent hover:text-accent-strong hover:underline">
                + Créer une nouvelle cohorte
              </a>
            } @else {
              <div class="space-y-2">
                @for (c of cohortesEligibles(); track c.id) {
                  <label class="flex cursor-pointer items-center gap-3 rounded-card border p-3 transition-colors focus-within:ring-2 focus-within:ring-accent"
                    [class]="cohorteCibleId() === c.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-line hover:border-line-strong'">
                    <input type="radio" name="cohorte-cible" [value]="c.id" [checked]="cohorteCibleId() === c.id"
                      (change)="cohorteCibleId.set(c.id)" class="size-4 accent-accent" />
                    <div>
                      <p class="text-sm font-medium text-ink">{{ c.nom }}</p>
                      <p class="text-xs text-ink-muted">Phase : {{ c.phase?.nom ?? '—' }} (ordre {{ c.phase?.ordre ?? '?' }})</p>
                    </div>
                  </label>
                }
              </div>
            }
          </fieldset>

          <!-- Raison -->
          <app-form-field label="Raison" [required]="forcer()">
            <textarea
              id="raison-promotion"
              [(ngModel)]="raisonPromotion"
              rows="2"
              placeholder="Raison de la promotion..."
              class="w-full resize-none rounded-input border border-input-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            ></textarea>
          </app-form-field>

          <!-- Erreur 409 : missions non validées -->
          @if (promotion409()) {
            <div role="alert" class="space-y-3 rounded-card border border-warning/40 bg-warning/10 p-4">
              <div class="flex items-center gap-2">
                <app-icon name="alert-circle" class="h-5 w-5 shrink-0 text-warning" />
                <p class="text-sm font-semibold text-ink">Missions non validées</p>
              </div>
              <ul class="space-y-1">
                @for (m of promotion409()!.missionsNonValidees; track m.titre) {
                  <li class="flex items-center gap-1.5 text-xs text-ink">
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full bg-warning" aria-hidden="true"></span>
                    {{ m.titre }} — {{ m.statut }}
                  </li>
                }
              </ul>
              <label class="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  [ngModel]="forcerPromotion()"
                  (ngModelChange)="forcerPromotion.set($event)"
                  class="size-4 rounded border-input-border accent-accent"
                />
                <span class="text-sm font-medium text-ink">Promouvoir quand même</span>
              </label>
              @if (forcerPromotion()) {
                <p class="text-xs text-ink-muted">Une raison est obligatoire ci-dessus.</p>
              }
            </div>
          }

          <!-- Résultats -->
          @if (resultatsPromotion().length > 0) {
            <div class="space-y-2" aria-live="polite">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Résultats</p>
              @for (r of resultatsPromotion(); track r.projetId) {
                <div class="flex items-center gap-2 rounded-button border border-line bg-surface-muted p-2 text-sm">
                  <app-badge [status]="r.succes ? 'success' : 'danger'">{{ r.succes ? 'Promu' : 'Échec' }}</app-badge>
                  <span class="font-medium text-ink">{{ r.nomProjet }}</span>
                  <span class="ml-auto text-xs text-ink-muted">{{ r.message }}</span>
                </div>
              }
            </div>
          }

        </div>

        <div class="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-surface px-6 py-4">
          <app-button variant="secondary" (click)="promotionOuverte.set(false)">Annuler</app-button>
          <app-button
            variant="primary"
            [disabled]="!cohorteCibleId() || (forcerPromotion() && !raisonPromotion.trim()) || promotionEnCours()"
            (click)="lancerPromotion()"
          >
            {{ forcerPromotion() ? 'Forcer la promotion' : 'Promouvoir' }}
          </app-button>
        </div>

      </div>
    </div>
  }

</div>
  `,
})
export class CohorteDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly ressourceService = inject(RessourceService);
  private readonly meetingService = inject(MeetingService);
  private readonly etapeService = inject(EtapeService);
  private readonly livrableService = inject(LivrableService);
  private readonly progressionService = inject(ProgressionService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cohorteId = signal<string>('');
  readonly cohorte = signal<Cohorte | null>(null);
  readonly projets = signal<Projet[]>([]);
  readonly missions = signal<MissionCohorteResponse[]>([]);
  readonly etapesSuivi = signal<Etape[]>([]);
  readonly missionsParEtape = signal<Record<string, MissionEtape[]>>({});
  readonly missionsProjets = signal<Mission[]>([]);
  readonly feuillesRouteParProjet = signal<Record<string, FeuilleRouteProjet>>({});
  readonly remisesParMission = signal<Record<string, LivrableResponse[]>>({});
  readonly ressources = signal<Ressource[]>([]);
  protected readonly openingResourceId = signal<string | null>(null);
  readonly reunions = signal<Meeting[]>([]);
  readonly cohortesEligibles = signal<Cohorte[]>([]);

  readonly chargement = signal(true);
  readonly chargementProjets = signal(false);
  readonly chargementMissions = signal(false);
  readonly suiviMissionsCharge = signal(false);
  readonly erreurSuiviMissions = signal<string | null>(null);
  readonly chargementRemises = signal<Set<string>>(new Set());
  readonly groupesRemisesCharges = signal<Set<string>>(new Set());
  readonly erreursRemises = signal<Record<string, string>>({});
  readonly filtreSuivi = signal<FiltreSuivi>('TOUS');
  readonly chargementRessources = signal(false);
  readonly chargementReunions = signal(false);
  readonly chargementEligibles = signal(false);

  readonly ongletActif = signal<OngletId>('projets');
  readonly selectionnes = signal<Set<string>>(new Set());
  readonly tousSelectionnes = computed(() => this.projets().length > 0 && this.selectionnes().size === this.projets().length);

  // Invitation
  readonly invitationOuverte = signal(false);
  readonly invitationEnCours = signal(false);
  emailsInvitation = '';

  // Promotion
  readonly promotionOuverte = signal(false);
  readonly promotionEnCours = signal(false);
  readonly cohorteCibleId = signal<string>('');
  raisonPromotion = '';
  readonly promotion409 = signal<Promotion409 | null>(null);
  readonly forcerPromotion = signal(false);
  readonly forcer = computed(() => this.promotion409() !== null && this.forcerPromotion());
  readonly resultatsPromotion = signal<PromotionGroupeeResultat[]>([]);

  readonly onglets = [
    { id: 'projets' as OngletId, label: 'Projets' },
    { id: 'missions' as OngletId, label: 'Missions' },
    { id: 'ressources' as OngletId, label: 'Ressources' },
    { id: 'reunions' as OngletId, label: 'Réunions' },
  ];

  /** Résumé des états de phase (ordre d'affichage conservé). */
  readonly statutsPhase: { statut: StatutFeuilleRoute; label: string; variant: BadgeVariant }[] = [
    { statut: 'EN_COURS', label: 'en cours', variant: 'info' },
    { statut: 'NON_DEMARREE', label: 'non démarrée', variant: 'neutral' },
    { statut: 'A_ACTIVER', label: 'à activer', variant: 'warning' },
    { statut: 'VERROUILLEE', label: 'verrouillée', variant: 'neutral' },
    { statut: 'TERMINEE', label: 'terminée', variant: 'success' },
    { statut: 'INCOMPLETE', label: 'incomplète', variant: 'warning' },
    { statut: 'ARCHIVEE', label: 'archivée', variant: 'neutral' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.cohorteId.set(id);
    this.charger(id);
  }

  protected isResourceFile(resource: Ressource): boolean {
    return Boolean(resource.nomFichier)
      || /^\/fichiers\/ressources\/[^/]+\/[^/]+$/.test(resource.url ?? '');
  }

  protected safeResourceUrl(value?: string): string | null {
    if (!value) return null;
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch {
      return null;
    }
  }

  protected openResourceFile(resource: Ressource): void {
    const preview = window.open('about:blank', '_blank');
    if (preview) preview.opener = null;
    this.openingResourceId.set(resource.id);
    this.ressourceService.getIncubatorFile(resource.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (file) => {
          const fileUrl = URL.createObjectURL(file);
          if (preview) {
            preview.location.href = fileUrl;
          } else {
            const link = document.createElement('a');
            link.href = fileUrl;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.click();
          }
          window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
          this.openingResourceId.set(null);
        },
        error: () => {
          preview?.close();
          this.openingResourceId.set(null);
          alert('Impossible d’ouvrir ce fichier. Vérifiez votre accès et réessayez.');
        },
      });
  }

  private charger(id: string): void {
    this.chargement.set(true);
    this.cohorteService.getCohorteById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cohorte.set(c); this.chargement.set(false); this.chargerProjets(); },
        error: () => { this.chargement.set(false); },
      });
  }

  chargerProjets(): void {
    this.chargementProjets.set(true);
    this.projetService.getByCohorte(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => { this.projets.set(p); this.chargementProjets.set(false); }, error: () => this.chargementProjets.set(false) });
  }

  chargerMissions(): void {
    if (this.suiviMissionsCharge() || this.chargementMissions()) return;
    this.chargementMissions.set(true);
    const cohort = this.cohorte();
    const etapes$ = cohort?.phaseId
      ? this.etapeService.getEtapesByPhaseId(cohort.phaseId)
      : of([] as Etape[]);

    forkJoin({
      etapes: etapes$,
      projets: this.projetService.getByCohorte(this.cohorteId()),
      missionsCohorte: this.missionService.getMissionsCohorteAgregees(),
    })
      .pipe(
        switchMap(({ etapes, projets, missionsCohorte }) => {
          const definitions$ = etapes.length > 0
            ? forkJoin(etapes.map(etape => this.etapeService.getMissionsByEtapeId(etape.id)))
            : of([] as MissionEtape[][]);
          const missionsProjets$ = projets.length > 0
            ? forkJoin(projets.map(projet => this.missionService.getByProjet(projet.id)))
            : of([] as Mission[][]);
          const feuillesRoute$ = projets.length > 0
            ? forkJoin(projets.map(projet => this.progressionService.getFeuilleRouteProjet(projet.id)))
            : of([] as FeuilleRouteProjet[]);
          return forkJoin({
            etapes: of(etapes),
            projets: of(projets),
            missionsCohorte: of(missionsCohorte),
            definitions: definitions$,
            missionsProjets: missionsProjets$,
            feuillesRoute: feuillesRoute$,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: ({ etapes, projets, missionsCohorte, definitions, missionsProjets, feuillesRoute }) => {
          this.etapesSuivi.set(etapes);
          this.projets.set(projets);
          this.missions.set(missionsCohorte.filter(m => m.cohorteId === this.cohorteId()));
          this.missionsParEtape.set(Object.fromEntries(
            etapes.map((etape, index) => [etape.id, definitions[index] ?? []]),
          ));
          this.missionsProjets.set(missionsProjets.flat());
          this.feuillesRouteParProjet.set(Object.fromEntries(
            feuillesRoute.map(feuille => [feuille.projetId, feuille]),
          ));
          this.suiviMissionsCharge.set(true);
          this.erreurSuiviMissions.set(null);
          this.chargementMissions.set(false);
        },
        error: () => {
          this.erreurSuiviMissions.set('Impossible de charger le suivi de cette cohorte. Réessayez plus tard.');
          this.chargementMissions.set(false);
        },
      });
  }

  statutPhaseProjet(projetId: string): StatutFeuilleRoute | undefined {
    const phaseId = this.cohorte()?.phaseId;
    if (!phaseId) return undefined;
    return this.feuillesRouteParProjet()[projetId]?.phases
      .find(phase => phase.id === phaseId)?.statut;
  }

  statutEtapeProjet(projetId: string, etapeId: string): StatutFeuilleRoute | undefined {
    const phaseId = this.cohorte()?.phaseId;
    if (!phaseId) return undefined;
    return this.feuillesRouteParProjet()[projetId]?.phases
      .find(phase => phase.id === phaseId)?.etapes
      .find(etape => etape.id === etapeId)?.statut;
  }

  motifPhaseProjet(projetId: string): string | undefined {
    const phaseId = this.cohorte()?.phaseId;
    if (!phaseId) return undefined;
    return this.feuillesRouteParProjet()[projetId]?.phases
      .find(phase => phase.id === phaseId)?.motif ?? undefined;
  }

  motifEtapeProjet(projetId: string, etapeId: string): string | undefined {
    const phaseId = this.cohorte()?.phaseId;
    if (!phaseId) return undefined;
    return this.feuillesRouteParProjet()[projetId]?.phases
      .find(phase => phase.id === phaseId)?.etapes
      .find(etape => etape.id === etapeId)?.motif ?? undefined;
  }

  nombreStatutEtape(etapeId: string, statut: StatutFeuilleRoute): number {
    return this.projets().filter(projet => this.statutEtapeProjet(projet.id, etapeId) === statut).length;
  }

  nombreStatutPhase(statut: StatutFeuilleRoute): number {
    return this.projets().filter(projet => this.statutPhaseProjet(projet.id) === statut).length;
  }

  libelleAcces(statut: StatutFeuilleRoute | undefined): string {
    const labels: Partial<Record<StatutFeuilleRoute, string>> = {
      TERMINEE: 'Terminée',
      VALIDEE: 'Validée',
      EN_COURS: 'En cours',
      ACTIVE: 'Active',
      ACCESSIBLE: 'Accessible',
      A_ACTIVER: 'À activer',
      NON_DEMARREE: 'Non démarrée',
      VERROUILLEE: 'Verrouillée',
      INCOMPLETE: 'Incomplète',
      ARCHIVEE: 'Archivée',
      NON_ASSIGNEE: 'Non assignée',
    };
    return statut ? labels[statut] ?? statut : 'État indisponible';
  }

  /** Remplace l'ancien classeAcces() : variante du badge partagé (couleur + libellé). */
  varianteAcces(statut: StatutFeuilleRoute | undefined): BadgeVariant {
    if (statut === 'ACTIVE' || statut === 'ACCESSIBLE' || statut === 'EN_COURS') return 'info';
    if (statut === 'VALIDEE' || statut === 'TERMINEE') return 'success';
    if (statut === 'A_ACTIVER') return 'warning';
    return 'neutral';
  }

  chargerRessources(): void {
    if (this.ressources().length > 0) return;
    this.chargementRessources.set(true);
    this.ressourceService.getByCohorte(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { this.ressources.set(r); this.chargementRessources.set(false); }, error: () => this.chargementRessources.set(false) });
  }

  chargerReunions(): void {
    if (this.reunions().length > 0) return;
    this.chargementReunions.set(true);
    this.meetingService.getMeetings(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { this.reunions.set(r); this.chargementReunions.set(false); }, error: () => this.chargementReunions.set(false) });
  }

  changerOnglet(id: OngletId): void {
    this.ongletActif.set(id);
    if (id === 'missions') this.chargerMissions();
    if (id === 'ressources') this.chargerRessources();
    if (id === 'reunions') this.chargerReunions();
  }

  missionsPourEtape(etapeId: string): MissionPourSuivi[] {
    const cohortGroups = this.missions()
      .filter(mission => mission.etapeId === etapeId)
      .map(mission => ({
        id: mission.id,
        titre: mission.titre,
        description: mission.description,
        dateEcheance: mission.dateEcheance,
        etapeId: mission.etapeId,
        attendus: mission.suivisIndividuels?.[0]?.livrablesAttendus ?? [],
        suivis: mission.suivisIndividuels ?? [],
      }));

    const stepGroups = (this.missionsParEtape()[etapeId] ?? []).map(definition => {
      const suivis = this.missionsProjets()
        .filter(mission => mission.missionEtapeId === definition.id);
      return {
        id: definition.id,
        titre: definition.titre,
        description: definition.description,
        etapeId,
        attendus: suivis[0]?.livrablesAttendus ?? [],
        suivis,
      };
    });

    return [...cohortGroups, ...stepGroups];
  }

  missionsSansEtape(): MissionPourSuivi[] {
    return this.missions()
      .filter(mission => !mission.etapeId)
      .map(mission => ({
        id: mission.id,
        titre: mission.titre,
        description: mission.description,
        dateEcheance: mission.dateEcheance,
        attendus: mission.suivisIndividuels?.[0]?.livrablesAttendus ?? [],
        suivis: mission.suivisIndividuels ?? [],
      }));
  }

  lignesSuivi(mission: MissionPourSuivi): LigneSuivi[] {
    return this.projets().map(projet => ({
      projet,
      mission: mission.suivis.find(suivi => suivi.projetId === projet.id),
    }));
  }

  chargerRemisesMission(event: Event, mission: MissionPourSuivi): void {
    if (!(event.target instanceof HTMLDetailsElement) || !event.target.open
        || this.groupesRemisesCharges().has(mission.id) || this.chargementRemises().has(mission.id)) {
      return;
    }

    const missionsAssignees = this.lignesSuivi(mission)
      .map(ligne => ligne.mission)
      .filter((suivi): suivi is Mission => !!suivi);
    if (missionsAssignees.length === 0) {
      this.groupesRemisesCharges.update(charges => new Set(charges).add(mission.id));
      return;
    }

    this.chargementRemises.update(enCours => new Set(enCours).add(mission.id));
    this.erreursRemises.update(erreurs => {
      const updated = { ...erreurs };
      delete updated[mission.id];
      return updated;
    });
    forkJoin(missionsAssignees.map(suivi =>
      this.livrableService.getLivrablesByMission(suivi.id),
    ))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: remises => {
          this.remisesParMission.update(courantes => {
            const updated = { ...courantes };
            missionsAssignees.forEach((suivi, index) => {
              updated[suivi.id] = remises[index] ?? [];
            });
            return updated;
          });
          this.groupesRemisesCharges.update(charges => new Set(charges).add(mission.id));
          this.chargementRemises.update(enCours => {
            const updated = new Set(enCours);
            updated.delete(mission.id);
            return updated;
          });
        },
        error: () => {
          this.erreursRemises.update(erreurs => ({
            ...erreurs,
            [mission.id]: 'Impossible de charger les remises de cette mission.',
          }));
          this.chargementRemises.update(enCours => {
            const updated = new Set(enCours);
            updated.delete(mission.id);
            return updated;
          });
        },
      });
  }

  afficherLigneSuivi(ligne: LigneSuivi, mission: MissionPourSuivi): boolean {
    const statut = this.statutSuivi(ligne, mission);
    return this.filtreSuivi() === 'TOUS' || statut === this.filtreSuivi();
  }

  nombreStatutMission(mission: MissionPourSuivi, statut: FiltreSuivi): number {
    return this.lignesSuivi(mission)
      .filter(ligne => this.statutSuivi(ligne, mission) === statut)
      .length;
  }

  nombreRemises(ligne: LigneSuivi): number {
    if (!ligne.mission) return 0;
    return this.remisesParMission()[ligne.mission.id]?.length
      ?? ligne.mission.nombreLivrablesDeposes
      ?? 0;
  }

  nombreAttendus(mission: MissionPourSuivi): number {
    return mission.attendus.length || Math.max(
      0,
      ...mission.suivis.map(suivi => suivi.nombreLivrablesAttendus ?? 0),
    );
  }

  nomAttendu(mission: MissionPourSuivi, attenduId: string): string {
    return mission.attendus.find(attendu => attendu.id === attenduId)?.titre
      ?? 'Attendu associé';
  }

  attenduPourRemise(mission: MissionPourSuivi, attenduId: string | null | undefined): LivrableAttenduMission | undefined {
    if (!attenduId) return undefined;
    return mission.attendus.find(attendu => attendu.id === attenduId);
  }

  reponseTemplate(contenu: string | null | undefined, champId: string): string {
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

  libelleStatutSuivi(ligne: LigneSuivi, mission: MissionPourSuivi): string {
    const labels: Record<FiltreSuivi, string> = {
      TOUS: 'Tous',
      NON_SOUMIS: 'Non soumis',
      SOUMIS: 'Soumis',
      A_CORRIGER: 'À corriger',
      VALIDE: 'Validé',
      EN_RETARD: 'En retard',
    };
    return labels[this.statutSuivi(ligne, mission)];
  }

  /** Remplace l'ancien classeStatutSuivi() : variante du badge partagé. */
  varianteStatutSuivi(ligne: LigneSuivi, mission: MissionPourSuivi): BadgeVariant {
    const variantes: Record<FiltreSuivi, BadgeVariant> = {
      TOUS: 'neutral',
      NON_SOUMIS: 'neutral',
      SOUMIS: 'info',
      A_CORRIGER: 'warning',
      VALIDE: 'success',
      EN_RETARD: 'danger',
    };
    return variantes[this.statutSuivi(ligne, mission)];
  }

  libelleStatutLivrable(statut: LivrableResponse['statut']): string {
    const labels: Record<LivrableResponse['statut'], string> = {
      EN_ATTENTE: 'À évaluer',
      A_CORRIGER: 'À corriger',
      REJETE: 'Rejeté',
      VALIDE: 'Validé',
    };
    return labels[statut];
  }

  /** Remplace l'ancien classeStatutLivrable() : variante du badge partagé. */
  varianteStatutLivrable(statut: LivrableResponse['statut']): BadgeVariant {
    if (statut === 'VALIDE') return 'success';
    if (statut === 'A_CORRIGER' || statut === 'REJETE') return 'warning';
    return 'info';
  }

  private statutSuivi(ligne: LigneSuivi, mission: MissionPourSuivi): FiltreSuivi {
    const missionProjet = ligne.mission;
    const remises = missionProjet ? this.remisesParMission()[missionProjet.id] ?? [] : [];
    const dateEcheance = mission.dateEcheance ?? missionProjet?.dateEcheance;
    const nonSoumise = !missionProjet
      || missionProjet.statut === 'A_FAIRE'
      || missionProjet.statut === 'EN_COURS';
    if (dateEcheance && dateEcheance < new Date().toISOString().slice(0, 10) && nonSoumise) {
      return 'EN_RETARD';
    }
    if (missionProjet?.statut === 'VALIDE') return 'VALIDE';
    if (missionProjet?.statut === 'A_REVOIR'
        || remises.some(remise => remise.statut === 'A_CORRIGER' || remise.statut === 'REJETE')) {
      return 'A_CORRIGER';
    }
    if (missionProjet?.statut === 'SOUMIS' || this.nombreRemises(ligne) > 0) return 'SOUMIS';
    return 'NON_SOUMIS';
  }

  isAdminOrCoach(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }

  isAdmin(): boolean {
    return this.structureCtx.activeRole() === 'ADMIN_STRUCTURE';
  }

  toggleSelection(id: string): void {
    this.selectionnes.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleTousSelectionnes(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionnes.set(checked ? new Set(this.projets().map(p => p.id)) : new Set());
  }

  projetParId(id: string): Projet | undefined {
    return this.projets().find(p => p.id === id);
  }

  ouvrirInvitation(): void {
    this.emailsInvitation = '';
    this.invitationOuverte.set(true);
  }

  envoyerInvitations(): void {
    const emails = this.emailsInvitation
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    if (emails.length === 0) return;
    this.invitationEnCours.set(true);
    this.cohorteService.inviterEntrepreneurs(this.cohorteId(), { emails })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.invitationEnCours.set(false); this.invitationOuverte.set(false); },
        error: () => { this.invitationEnCours.set(false); alert('Erreur lors de l\'envoi des invitations.'); },
      });
  }

  ouvrirPromotion(): void {
    this.promotion409.set(null);
    this.resultatsPromotion.set([]);
    this.forcerPromotion.set(false);
    this.raisonPromotion = '';
    this.cohorteCibleId.set('');
    // Charger cohortes éligibles depuis le 1er projet sélectionné
    const ids = [...this.selectionnes()];
    if (ids.length === 0) return;
    this.promotionOuverte.set(true);
    this.chargementEligibles.set(true);
    this.projetService.getCohortesEligibles(ids[0])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cohortesEligibles.set(c); this.chargementEligibles.set(false); },
        error: () => { this.cohortesEligibles.set([]); this.chargementEligibles.set(false); },
      });
  }

  lancerPromotion(): void {
    if (!this.cohorteCibleId()) return;
    const forcer = this.forcerPromotion();
    if (forcer && !this.raisonPromotion.trim()) { alert('Une raison est obligatoire pour forcer la promotion.'); return; }

    this.promotionEnCours.set(true);
    this.promotion409.set(null);
    this.resultatsPromotion.set([]);

    const req: PromotionGroupeeRequest = {
      projetIds: [...this.selectionnes()],
      cohorteCibleId: this.cohorteCibleId(),
      raison: this.raisonPromotion.trim() || undefined,
      forcer,
    };

    this.cohorteService.promotionGroupee(this.cohorteId(), req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultats) => {
          this.resultatsPromotion.set(resultats);
          this.promotionEnCours.set(false);
          const tousSucces = resultats.every(r => r.succes);
          if (tousSucces) {
            this.selectionnes.set(new Set());
            this.chargerProjets();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.promotionEnCours.set(false);
          if (err.status === 409) {
            this.promotion409.set(err.error);
          } else {
            alert('Erreur lors de la promotion : ' + (err.error?.message ?? err.message));
          }
        },
      });
  }

  planifierReunion(): void {
    this.router.navigate(['/incubateur/reunions/nouvelle'], { queryParams: { cohorteId: this.cohorteId() } });
  }

  getCoachNames(): string {
    const list = this.cohorte()?.coachs;
    if (!list || list.length === 0) return '';
    return list.map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim() || c.email).join(', ');
  }
}