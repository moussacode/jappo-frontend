import { Component, inject, signal, computed, effect, untracked, DestroyRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  FormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte, Projet } from '../../../../core/models';
import { CreateCohorteRequest, Parcours, Phase, CoachSummary, libellePhase } from '../../../../core/models/cohorte.model';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { MissionService } from '../../../../core/services/mission.service';
import { Mission } from '../../../../core/models/mission.model';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { EditCohorteComponent } from '../edit-cohorte/edit-cohorte';
import { InviterEntrepreneurModalComponent } from '../../entrepreneurs/inviter-entrepreneur/inviter-entrepreneur';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TabFilterComponent } from '../../../../shared/components/tab-filter/tab-filter.component';
import { downloadCsv } from '../../../../core/utils/csv-export';

interface CohorteAffichee {
  cohorte: Cohorte;
  nbProjets: number;
  scoreMoyen: number;
}

interface DonneesCohorteActive {
  cohorte: Cohorte;
  projets: Projet[];
  missions: Mission[];
  scoreMoyen: number;
  enRetard: Projet[];
  aJour: number;
}

type SortField = 'nom' | 'progression';
type SortDir = 'asc' | 'desc';
type CohorteFilter = 'ACTIVES' | 'ARCHIVEES' | 'TOUTES';

const FILTRES_COHORTES: { value: CohorteFilter; label: string }[] = [
  { value: 'ACTIVES', label: 'Actives' },
  { value: 'ARCHIVEES', label: 'Archivées' },
  { value: 'TOUTES', label: 'Toutes' },
];

@Component({
  selector: 'app-cohortes-dashboard',
  standalone: true,
  imports: [
    NgTemplateOutlet,
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    Icon,
    ButtonComponent,
    PageHeaderComponent,
    CardComponent,
    KpiCardComponent,
    AvatarComponent,
    BadgeComponent,
    EmptyStateComponent,
    LoadingState,
    EditCohorteComponent,
    InviterEntrepreneurModalComponent,
    ModalComponent,
    FormFieldComponent,
    InputComponent,
    TabFilterComponent
],
  template: `
    <div class="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">

      <!-- SÉLECTEUR DE CONTEXTE (onglets Fabrique 360) -->
      <div
        role="tablist"
        aria-label="Cohortes Fabrique 360"
        class="custom-scrollbar flex w-full shrink-0 items-end gap-1 overflow-x-auto border-b border-line bg-surface px-3 pt-3 sm:px-4 md:px-6 lg:px-8"
      >
        <button
          type="button"
          role="tab"
          id="tab-global"
          [attr.aria-selected]="activeContextId() === 'GLOBAL'"
          aria-controls="panel-cohortes"
          (click)="activeContextId.set('GLOBAL')"
          [class]="activeContextId() === 'GLOBAL'
            ? 'border-accent bg-accent-soft text-accent'
            : 'border-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink'"
          class="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-button border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <app-icon name="dashboard" class="size-4" />
          Vue globale
        </button>

        @for (item of orderedCohortesAffichees(); track item.cohorte.id) {
          <div
            class="relative"
            (dragover)="onTabDragOver($event, item.cohorte.id)"
            (drop)="onTabDrop($event, item.cohorte.id)"
          >
            @if (dragOverId() === item.cohorte.id && draggedId() !== item.cohorte.id) {
              <div class="absolute -left-1 bottom-2 top-2 w-0.5 rounded-pill bg-accent"></div>
            }
            <button
              type="button"
              role="tab"
              [id]="'tab-' + item.cohorte.id"
              draggable="true"
              title="Glisser pour réorganiser"
              [attr.aria-selected]="activeContextId() === item.cohorte.id"
              aria-controls="panel-cohortes"
              (click)="activeContextId.set(item.cohorte.id)"
              (dragstart)="onTabDragStart($event, item.cohorte.id)"
              (dragend)="onTabDragEnd()"
              [class]="(activeContextId() === item.cohorte.id
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-transparent text-ink-muted hover:bg-surface-subtle hover:text-ink')
                + (draggedId() === item.cohorte.id ? ' opacity-40' : '')"
              class="flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-t-button border-b-2 px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <app-icon name="cohortes" class="size-4" />
              {{ item.cohorte.nom }}
              <span
                [class]="activeContextId() === item.cohorte.id ? 'bg-surface text-accent' : 'bg-surface-subtle text-ink-muted'"
                class="ml-1 rounded-pill px-2 py-0.5 text-[11px] font-semibold"
              >
                {{ item.nbProjets }}
              </span>
            </button>
          </div>
        }

        @if (isAdmin()) {
          <button
            type="button"
            (click)="nouvelleCohorteOuverte.set(true)"
            aria-label="Créer une nouvelle cohorte"
            class="flex cursor-pointer items-center rounded-t-button border-b-2 border-transparent px-3 py-3 text-ink-muted transition-colors hover:bg-surface-subtle hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <app-icon name="plus" class="size-4" />
          </button>
        }
      </div>

      <div id="panel-cohortes" role="tabpanel" class="min-h-0 flex-1 overflow-y-auto">
        <div class="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 p-4 sm:p-6 lg:p-8">

          <!-- CHARGEMENT -->
          @if (isLoading()) {
            <app-loading-state message="Chargement de l'espace Fabrique 360…" />
          }

          <!-- ÉTAT 1 : VUE GLOBALE -->
          @else if (activeContextId() === 'GLOBAL') {
            <app-page-header title="Gestion des cohortes" subtitle="Supervisez la performance globale de l'incubateur.">
              @if (cohortesAffichees().length > 0) {
                <app-button variant="secondary" size="sm" (click)="exporterCohortes()">
                  Exporter CSV
                </app-button>
              }
              @if (isAdmin()) {
                <app-button size="sm" (click)="nouvelleCohorteOuverte.set(true)">
                  <app-icon name="plus" class="mr-1.5 size-4" />
                  Nouvelle cohorte
                </app-button>
              }
            </app-page-header>

            <!-- Filtre de statut -->
            <app-tab-filter
              [options]="filtres"
              [value]="filtreStatut()"
              (valueChange)="changerFiltre($event)"
              class="w-full sm:w-fit"
            />

            @if (cohortes().length === 0) {
              @if (filtreStatut() === 'ACTIVES') {
                <app-empty-state
                  icon="cohortes"
                  title="L'incubateur est prêt"
                  [description]="isAdmin()
                    ? 'Créez votre première cohorte Fabrique 360 pour commencer à suivre vos startups.'
                    : 'Aucune cohorte disponible pour le moment.'"
                >
                  @if (isAdmin()) {
                    <app-button size="sm" (click)="nouvelleCohorteOuverte.set(true)">
                      <app-icon name="plus" class="mr-1.5 size-4" />
                      Initier une cohorte
                    </app-button>
                  }
                </app-empty-state>
              } @else {
                <app-empty-state
                  icon="cohortes"
                  [title]="filtreStatut() === 'ARCHIVEES' ? 'Aucune cohorte archivée' : 'Aucune cohorte'"
                />
              }
            } @else {
              <!-- KPI globaux -->
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <app-kpi-card [label]="labelKpiCohortes()" value="{{ cohortes().length }}" />
                <app-kpi-card label="Startups accompagnées" value="{{ totalStartupsActives() }}" />
                <app-kpi-card label="Maturité globale" value="{{ progressionGlobaleMoyenne() }}%" />
              </div>

              <!-- Cartes mobiles (cohortes) -->
              <div class="flex flex-col gap-3 sm:hidden">
                @for (item of sortedCohortesAffichees(); track item.cohorte.id) {
                  <app-card padding="none" [hoverable]="true">
                    <button
                      type="button"
                      (click)="activeContextId.set(item.cohorte.id)"
                      class="flex w-full flex-col gap-2 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      <div class="flex min-w-0 items-center justify-between gap-2">
                        <span class="truncate text-sm font-semibold text-ink">{{ item.cohorte.nom }}</span>
                        <span class="shrink-0 text-xs font-medium text-ink-muted">{{ item.nbProjets }} startup{{ item.nbProjets > 1 ? 's' : '' }}</span>
                      </div>
                      <ng-container *ngTemplateOutlet="progression; context: { $implicit: item.scoreMoyen, largeur: 'flex-1' }"></ng-container>
                      <p class="text-xs text-ink-muted">
                        {{ formatDate(item.cohorte.dateDebut) }} → {{ formatDate(item.cohorte.dateFin) }}
                      </p>
                    </button>
                    <div class="flex items-center justify-between gap-2 border-t border-line px-4 py-2">
                      <a
                        [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                        class="inline-flex items-center gap-1 rounded-button border border-line px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <app-icon name="arrow-right" class="size-3.5" />
                        Voir le détail
                      </a>
                      @if (isAdmin()) {
                        @if (item.cohorte.statut === 'ARCHIVEE') {
                          <app-button variant="ghost" size="xs" (click)="restaurerCohorte(item.cohorte, $event)">Restaurer</app-button>
                        } @else {
                          <app-button variant="ghost" size="xs" (click)="archiverCohorte(item.cohorte, $event)">Archiver</app-button>
                        }
                      }
                    </div>
                  </app-card>
                } @empty {
                  <p class="py-8 text-center text-sm text-ink-muted">Aucune cohorte.</p>
                }
              </div>

              <!-- Tableau (desktop) -->
              <app-card padding="none" class="hidden w-full min-w-0 overflow-hidden sm:block">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[650px] border-collapse text-left text-sm">
                    <thead>
                      <tr class="border-b border-line bg-surface-subtle text-xs font-semibold uppercase tracking-wide text-ink-muted">
                        <th scope="col" class="w-3/12 px-6 py-3"
                            [attr.aria-sort]="globalSortBy() === 'nom' ? (globalSortDir() === 'asc' ? 'ascending' : 'descending') : null">
                          <button type="button" (click)="toggleGlobalSort('nom')"
                            class="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            Programme
                            @if (globalSortBy() === 'nom') {
                              <app-icon [name]="globalSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3.5 text-accent" />
                            }
                          </button>
                        </th>
                        <th scope="col" class="w-3/12 px-6 py-3">Période</th>
                        <th scope="col" class="w-2/12 px-6 py-3 text-center">Startups</th>
                        <th scope="col" class="w-2/12 px-6 py-3 text-center"
                            [attr.aria-sort]="globalSortBy() === 'progression' ? (globalSortDir() === 'asc' ? 'ascending' : 'descending') : null">
                          <button type="button" (click)="toggleGlobalSort('progression')"
                            class="mx-auto flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                            Maturité
                            @if (globalSortBy() === 'progression') {
                              <app-icon [name]="globalSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3.5 text-accent" />
                            }
                          </button>
                        </th>
                        <th scope="col" class="w-2/12 px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-line bg-surface">
                      @for (item of sortedCohortesAffichees(); track item.cohorte.id) {
                        <tr class="group cursor-pointer transition-colors hover:bg-surface-subtle" (click)="activeContextId.set(item.cohorte.id)">
                          <td class="px-6 py-4">
                            <button type="button" (click)="activeContextId.set(item.cohorte.id)"
                              class="cursor-pointer text-left font-semibold text-ink transition-colors group-hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                              {{ item.cohorte.nom }}
                            </button>
                          </td>
                          <td class="px-6 py-4 text-xs text-ink-muted">
                            <div class="flex items-center gap-2">
                              <span>{{ formatDate(item.cohorte.dateDebut) }}</span>
                              <app-icon name="arrow-right" class="size-3 text-ink-faint" />
                              <span>{{ formatDate(item.cohorte.dateFin) }}</span>
                            </div>
                          </td>
                          <td class="px-6 py-4 text-center font-semibold text-ink">{{ item.nbProjets }}</td>
                          <td class="px-6 py-4">
                            <div class="flex justify-center">
                              <ng-container *ngTemplateOutlet="progression; context: { $implicit: item.scoreMoyen, largeur: 'w-20' }"></ng-container>
                            </div>
                          </td>
                          <td class="px-6 py-4 text-right">
                            <div class="flex items-center justify-end gap-2">
                              <a
                                [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                                (click)="$event.stopPropagation()"
                                class="inline-flex items-center gap-1 whitespace-nowrap rounded-button border border-line px-2.5 py-1.5 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                              >
                                <app-icon name="arrow-right" class="size-3.5" />
                                Détail
                              </a>
                              @if (isAdmin()) {
                                @if (item.cohorte.statut === 'ARCHIVEE') {
                                  <app-button variant="ghost" size="xs" title="Restaurer le programme" (click)="restaurerCohorte(item.cohorte, $event)">Restaurer</app-button>
                                } @else {
                                  <app-button variant="ghost" size="xs" title="Archiver le programme" (click)="archiverCohorte(item.cohorte, $event)">Archiver</app-button>
                                }
                              }
                            </div>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </app-card>
            }
          }

          <!-- ÉTAT 2 : VUE D'UNE COHORTE -->
          @else if (activeCohorteData(); as data) {
            <app-page-header
              [title]="data.cohorte.nom"
              [subtitle]="formatDate(data.cohorte.dateDebut) + ' au ' + formatDate(data.cohorte.dateFin) + ' · ' + data.projets.length + ' startups accompagnées'"
            >
              <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                <app-badge status="primary">{{ libellePhase(data.cohorte.phase) }}</app-badge>

                @if (data.cohorte.coachs && data.cohorte.coachs.length > 0) {
                  <app-badge status="neutral" [title]="getCoachNames(data.cohorte.coachs)">
                    Coach{{ data.cohorte.coachs.length > 1 ? 's' : '' }} : {{ getCoachNames(data.cohorte.coachs) }}
                  </app-badge>
                }

                <app-button variant="secondary" size="sm" (click)="exporterPortefeuille(data)">
                  Exporter CSV
                </app-button>

                @if (isAdmin()) {
                  <app-button variant="secondary" size="sm" (click)="ouvrirEdition()">
                    <app-icon name="edit" class="mr-1.5 size-4" /> Modifier
                  </app-button>

                  <app-button variant="secondary" size="sm" (click)="showInviteEntrepreneurModal.set(true)">
                    <app-icon name="plus" class="mr-1.5 size-4" /> Ajouter entrepreneur
                  </app-button>
                }
              </div>
            </app-page-header>

            <!-- KPI cohorte -->
            <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <app-kpi-card label="Startups suivies" value="{{ data.projets.length }}" />
              <app-kpi-card label="Maturité moyenne" value="{{ data.scoreMoyen }}%" />
              <app-kpi-card label="Startups à jour" value="{{ data.aJour }}" />
              <app-kpi-card label="En retard" value="{{ data.enRetard.length }}" />
            </div>

            <!-- Barre d'outils portefeuille -->
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="flex items-center gap-2 text-base font-semibold text-ink">
                Portefeuille d'incubation
                <app-badge status="neutral" size="sm">{{ data.projets.length }}</app-badge>
              </h2>
              <div class="relative w-full sm:w-72">
                <input
                  type="search"
                  [formControl]="searchControl"
                  aria-label="Rechercher une startup"
                  placeholder="Chercher une startup..."
                  class="w-full rounded-input border border-input-border bg-surface py-2.5 pl-9 pr-4 text-sm text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              </div>
            </div>

            <!-- Cartes mobiles (portefeuille) -->
            <div class="flex flex-col gap-3 sm:hidden">
              @for (p of filteredSortedProjets(); track p.id) {
                <app-card padding="none" [hoverable]="true">
                  <a [routerLink]="['/incubateur/projets', p.id]"
                     class="flex flex-col gap-3 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
                    <div class="flex min-w-0 items-center gap-3">
                      <app-avatar [initials]="p.nom ? p.nom.substring(0, 2).toUpperCase() : 'PR'" size="md" />
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-semibold text-ink">{{ p.nom }}</p>
                        <p class="truncate text-xs text-ink-muted">{{ p.nomEntrepreneur || 'Équipe à définir' }}</p>
                      </div>
                      @if ((p.scoreMaturite || 0) > 70) {
                        <app-badge status="success" size="sm">À jour</app-badge>
                      } @else if ((p.scoreMaturite || 0) > 30) {
                        <app-badge status="warning" size="sm">En cours</app-badge>
                      } @else {
                        <app-badge status="danger" size="sm">En retard</app-badge>
                      }
                    </div>
                    <ng-container *ngTemplateOutlet="progression; context: { $implicit: p.scoreMaturite || 0, largeur: 'flex-1' }"></ng-container>
                  </a>
                  <div class="border-t border-line px-4 py-3">
                    <ng-container *ngTemplateOutlet="actionsProjet; context: { $implicit: p }"></ng-container>
                  </div>
                </app-card>
              } @empty {
                <p class="py-8 text-center text-sm text-ink-muted">Aucune startup trouvée.</p>
              }
            </div>

            <!-- Tableau portefeuille (desktop) -->
            <app-card padding="none" class="hidden w-full min-w-0 overflow-hidden sm:block">
              <div class="overflow-x-auto">
                <table class="w-full min-w-[800px] border-collapse text-left text-sm">
                  <thead>
                    <tr class="border-b border-line bg-surface-subtle text-xs font-semibold uppercase tracking-wide text-ink-muted">
                      <th scope="col" class="w-3/12 px-6 py-3"
                          [attr.aria-sort]="projetSortBy() === 'nom' ? (projetSortDir() === 'asc' ? 'ascending' : 'descending') : null">
                        <button type="button" (click)="toggleProjetSort('nom')"
                          class="flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                          Startup &amp; porteur
                          @if (projetSortBy() === 'nom') {
                            <app-icon [name]="projetSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3.5 text-accent" />
                          }
                        </button>
                      </th>
                      <th scope="col" class="w-3/12 px-6 py-3 text-center"
                          [attr.aria-sort]="projetSortBy() === 'progression' ? (projetSortDir() === 'asc' ? 'ascending' : 'descending') : null">
                        <button type="button" (click)="toggleProjetSort('progression')"
                          class="mx-auto flex cursor-pointer items-center gap-1.5 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                          Avancement
                          @if (projetSortBy() === 'progression') {
                            <app-icon [name]="projetSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3.5 text-accent" />
                          }
                        </button>
                      </th>
                      <th scope="col" class="w-2/12 px-6 py-3 text-center">Statut</th>
                      <th scope="col" class="w-4/12 px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-line bg-surface">
                    @for (p of filteredSortedProjets(); track p.id) {
                      <tr class="transition-colors hover:bg-surface-subtle">
                        <td class="px-6 py-4">
                          <div class="flex items-center gap-3">
                            <app-avatar [initials]="p.nom ? p.nom.substring(0, 2).toUpperCase() : 'PR'" size="md" />
                            <div class="flex min-w-0 flex-col">
                              <span class="truncate font-semibold text-ink">{{ p.nom }}</span>
                              <span class="mt-0.5 truncate text-xs text-ink-muted">{{ p.nomEntrepreneur || 'Équipe à définir' }}</span>
                            </div>
                          </div>
                        </td>
                        <td class="px-6 py-4">
                          <div class="flex justify-center">
                            <ng-container *ngTemplateOutlet="progression; context: { $implicit: p.scoreMaturite || 0, largeur: 'w-32' }"></ng-container>
                          </div>
                        </td>
                        <td class="px-6 py-4 text-center">
                          @if ((p.scoreMaturite || 0) > 70) {
                            <app-badge status="success" size="sm">À jour</app-badge>
                          } @else if ((p.scoreMaturite || 0) > 30) {
                            <app-badge status="warning" size="sm">En cours</app-badge>
                          } @else {
                            <app-badge status="danger" size="sm">En retard</app-badge>
                          }
                        </td>
                        <td class="px-6 py-4 text-right">
                          <ng-container *ngTemplateOutlet="actionsProjet; context: { $implicit: p }"></ng-container>
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="4" class="bg-surface-muted p-10 text-center text-sm text-ink-muted">
                          @if (searchControl.value) {
                            Aucune startup ne correspond à « <strong class="text-ink">{{ searchControl.value }}</strong> ».
                          } @else {
                            Le portefeuille de cette cohorte est vide.
                          }
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </app-card>
          }
        </div>
      </div>
    </div>

    <!-- Barre de progression partagée (maturité) -->
    <ng-template #progression let-valeur let-largeur="largeur">
      <div class="flex items-center gap-3" [class.w-full]="largeur === 'flex-1'">
        <div
          class="h-2 overflow-hidden rounded-pill bg-line"
          [class]="largeur"
          role="progressbar"
          aria-label="Maturité"
          aria-valuemin="0"
          aria-valuemax="100"
          [attr.aria-valuenow]="valeur"
        >
          <div class="h-full rounded-pill bg-accent transition-[width] duration-500 ease-out" [style.width.%]="valeur"></div>
        </div>
        <span class="w-10 text-right font-mono text-xs font-semibold text-ink">{{ valeur }}%</span>
      </div>
    </ng-template>

    <!-- Actions d'un projet (partagées desktop + mobile) : promotion + détails -->
    <ng-template #actionsProjet let-p>
      <div class="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        @if (cohortesPhaseSuivante().length > 0) {
          <div class="flex items-center gap-2">
            <select
              [ngModel]="cohorteCibleParProjet()[p.id] ?? ''"
              (ngModelChange)="changerCohorteCible(p.id, $event)"
              aria-label="Cohorte cible"
              class="rounded-input border border-input-border bg-surface px-3 py-1.5 text-xs text-ink focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="">Choisir une cohorte…</option>
              @for (cible of cohortesPhaseSuivante(); track cible.id) {
                <option [value]="cible.id">{{ cible.nom }}</option>
              }
            </select>
            <app-button
              variant="secondary"
              size="xs"
              [disabled]="!cohorteCibleParProjet()[p.id] || promotionEnCoursParProjet()[p.id]"
              (click)="promouvoirProjet(p.id)"
            >
              {{ promotionEnCoursParProjet()[p.id] ? 'Promotion…' : 'Promouvoir' }}
            </app-button>
          </div>
        }
        <a
          [routerLink]="['/incubateur/projets', p.id]"
          class="inline-flex items-center gap-1.5 rounded-button px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-surface-subtle hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Détails <app-icon name="chevron-right" class="size-3.5" />
        </a>
      </div>
      @if (erreurPromotionParProjet()[p.id]) {
        <p role="alert" class="mt-1.5 text-right text-xs text-danger">{{ erreurPromotionParProjet()[p.id] }}</p>
      }
    </ng-template>

    <!-- MODALES -->

    <!-- Modale : nouvelle cohorte (parcours + phase obligatoires) -->
    @if (nouvelleCohorteOuverte()) {
      <app-modal
        title="Nouvelle cohorte"
        subtitle="Créez une cohorte et définissez son parcours d'accompagnement."
        maxWidth="lg"
        (close)="fermerCreation()"
      >
        <form
          [formGroup]="nouvelleCohorteForm"
          (ngSubmit)="creerCohorte()"
          class="flex flex-col gap-5"
        >
          <!-- Nom -->
          <app-form-field
            label="Nom de la cohorte"
            [required]="true"
            [error]="getFieldError('nom')"
          >
            <app-input formControlName="nom" placeholder="Ex. Batch #3" />
          </app-form-field>

          <!-- Description -->
          <app-form-field
            label="Description / Secteur"
            [error]="getFieldError('description')"
          >
            <app-input formControlName="description" placeholder="Ex. FinTech, Agrotech, Santé numérique..." />
          </app-form-field>

          <!-- Parcours -->
          <app-form-field
            label="Parcours d'accompagnement"
            [required]="true"
            [error]="getFieldError('parcoursId')"
          >
            @if (parcours().length === 0) {
              <div class="flex items-center gap-2 rounded-card border border-warning/40 bg-warning/10 p-3 text-xs text-ink">
                <app-icon name="warning" class="size-4 shrink-0 text-warning" />
                <p>
                  Aucun parcours disponible.
                  <a routerLink="/incubateur/parcours" class="font-semibold text-accent underline hover:text-accent-strong">Configurer un parcours</a>.
                </p>
              </div>
            } @else {
              <select
                formControlName="parcoursId"
                (change)="onParcoursChange()"
                [class]="isFieldInvalid('parcoursId') ? 'border-danger focus-visible:ring-danger' : 'border-input-border focus-visible:border-accent focus-visible:ring-accent'"
                class="w-full cursor-pointer rounded-input border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2"
              >
                <option value="">Choisir un parcours…</option>
                @for (parcoursItem of parcours(); track parcoursItem.id) {
                  <option [value]="parcoursItem.id">{{ parcoursItem.nom }}</option>
                }
              </select>
            }
          </app-form-field>

          <!-- Phase -->
          @if (nouvelleCohorteForm.controls.parcoursId.value) {
            <app-form-field
              label="Phase d'accompagnement"
              [required]="true"
              [error]="getFieldError('phaseId')"
            >
              @if (phasesDisponibles().length === 0) {
                <p class="px-1 py-2 text-xs text-ink-muted">Ce parcours n'a aucune phase configurée.</p>
              } @else {
                <select
                  formControlName="phaseId"
                  [class]="isFieldInvalid('phaseId') ? 'border-danger focus-visible:ring-danger' : 'border-input-border focus-visible:border-accent focus-visible:ring-accent'"
                  class="w-full cursor-pointer rounded-input border bg-surface px-3 py-2.5 text-sm text-ink focus-visible:outline-none focus-visible:ring-2"
                >
                  <option value="">Choisir une phase…</option>
                  @for (phase of phasesDisponibles(); track phase.id) {
                    <option [value]="phase.id">{{ phase.ordre }}. {{ phase.nom }}</option>
                  }
                </select>
              }
            </app-form-field>
          }

          <!-- Équipe d'accompagnement -->
          <fieldset class="flex flex-col gap-2">
            <legend class="text-xs font-semibold text-ink">Équipe d'accompagnement</legend>
            <p class="text-xs text-ink-muted">
              Sélectionnez les coachs affectés au suivi de cette cohorte.
            </p>

            @if (coachsDisponibles().length === 0) {
              <div class="rounded-card border border-line bg-surface-muted p-2.5 text-xs text-ink-muted">
                Aucun coach disponible dans la structure.
              </div>
            } @else {
              <div class="flex max-h-36 flex-col gap-1 overflow-y-auto rounded-card border border-line bg-surface p-2">
                @for (coach of coachsDisponibles(); track coach.id) {
                  <label class="flex cursor-pointer items-center gap-2.5 rounded-button p-1.5 text-xs text-ink transition-colors hover:bg-surface-subtle">
                    <input
                      type="checkbox"
                      [checked]="isCoachSelectedForCreation(coach.id)"
                      (change)="toggleCoachForCreation(coach.id)"
                      class="size-4 cursor-pointer rounded border-input-border accent-accent"
                    />
                    <div class="flex flex-col">
                      <span class="font-medium text-ink">{{ coach.prenom || '' }} {{ coach.nom || '' }}</span>
                      <span class="text-[11px] text-ink-muted">{{ coach.email }}</span>
                    </div>
                  </label>
                }
              </div>
            }
          </fieldset>

          <!-- Dates -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <app-form-field label="Date de début" [error]="getFieldError('dateDebut')">
              <app-input type="date" formControlName="dateDebut" />
            </app-form-field>

            <app-form-field label="Date de fin" [error]="getFieldError('dateFin')">
              <app-input type="date" formControlName="dateFin" />
            </app-form-field>
          </div>

          <!-- Erreur API -->
          @if (erreurCreation()) {
            <div class="flex items-center gap-2.5 rounded-card border border-danger/40 bg-danger/10 p-3 text-xs text-danger" role="alert">
              <app-icon name="warning" class="size-4 shrink-0" />
              <span>{{ erreurCreation() }}</span>
            </div>
          }

          <!-- Actions -->
          <div class="mt-2 flex items-center justify-end gap-3 border-t border-line pt-5">
            <app-button type="button" variant="ghost" (click)="fermerCreation()">Annuler</app-button>
            <app-button
              type="submit"
              [disabled]="nouvelleCohorteForm.invalid || creationEnCours()"
            >
              {{ creationEnCours() ? 'Création en cours…' : 'Créer la cohorte' }}
            </app-button>
          </div>
        </form>
      </app-modal>
    }

    @if (showEditModal() && cohorteEnCoursEdition(); as cohorteActive) {
      <app-edit-cohorte
        [cohorte]="cohorteActive"
        (closed)="fermerEdition()"
        (updated)="onCohorteUpdated($event)"
      />
    }

    @if (showInviteEntrepreneurModal() && activeCohorteData(); as data) {
      <app-inviter-entrepreneur-modal
        [fixedCohorteId]="data.cohorte.id"
        [fixedCohorteNom]="data.cohorte.nom"
        (close)="showInviteEntrepreneurModal.set(false)"
        (invited)="loadData()"
      />
    }
  `,
})
export class CohortesList {

  private readonly fb = inject(FormBuilder);
  private readonly structureContext = inject(StructureContextService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly libellePhase = libellePhase;
  protected readonly filtres = FILTRES_COHORTES;
  protected readonly isAdmin = computed(() => this.structureContext.activeRole() === 'ADMIN_STRUCTURE');

  // -- Coachs --
  protected readonly coachsDisponibles = signal<CoachSummary[]>([]);
  protected readonly coachsSelectionnesCreation = signal<Set<string>>(new Set());

  // -- État général --
  protected readonly nouvelleCohorteOuverte = signal(false);
  protected readonly activeContextId = signal<string>('GLOBAL');
  protected readonly isLoading = signal<boolean>(true);
  private readonly queryCohorteIdToSelect = signal<string | null>(null);

  // -- Modales --
  protected readonly showEditModal = signal(false);
  protected readonly showInviteEntrepreneurModal = signal(false);
  protected readonly cohorteEnCoursEdition = signal<Cohorte | null>(null);

  // -- Création de cohorte --
  protected readonly parcours = signal<Parcours[]>([]);

  protected readonly nouvelleCohorteForm = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    dateDebut: [''],
    dateFin: [''],
    parcoursId: ['', [Validators.required]],
    phaseId: ['', [Validators.required]],
  });

  protected readonly phasesDisponibles = signal<Phase[]>([]);

  protected readonly creationEnCours = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);

  // -- Données --
  protected readonly cohortes = signal<Cohorte[]>([]);
  private readonly projetsParCohorte = signal<Record<string, Projet[]>>({});
  protected readonly missionsParCohorte = signal<Record<string, Mission[]>>({});

  // -- Promotion --
  protected readonly cohorteCibleParProjet = signal<Record<string, string>>({});
  protected readonly cohortesPhaseSuivante = signal<Cohorte[]>([]);
  protected readonly promotionEnCoursParProjet = signal<Record<string, boolean>>({});
  protected readonly erreurPromotionParProjet = signal<Record<string, string>>({});

  // -- Ordre des onglets (drag & drop) --
  protected readonly cohorteOrder = signal<string[]>([]);
  protected readonly draggedId = signal<string | null>(null);
  protected readonly dragOverId = signal<string | null>(null);

  // -- Tris, recherche, filtre --
  protected readonly globalSortBy = signal<SortField>('progression');
  protected readonly globalSortDir = signal<SortDir>('desc');
  protected readonly projetSortBy = signal<SortField>('progression');
  protected readonly projetSortDir = signal<SortDir>('desc');
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });
  private readonly searchTerm = signal('');
  protected readonly filtreStatut = signal<CohorteFilter>('ACTIVES');

  protected readonly labelKpiCohortes = computed(() => {
    switch (this.filtreStatut()) {
      case 'ARCHIVEES':
        return 'Cohortes archivées';
      case 'TOUTES':
        return 'Toutes les cohortes';
      default:
        return 'Cohortes actives';
    }
  });

  protected readonly cohortesAffichees = computed<CohorteAffichee[]>(() =>
    this.cohortes().map((cohorte) => {
      const projets = this.projetsParCohorte()[cohorte.id] ?? [];
      const scoreMoyen =
        projets.length === 0
          ? 0
          : Math.round(projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length);
      return { cohorte, nbProjets: projets.length, scoreMoyen };
    })
  );

  protected readonly sortedCohortesAffichees = computed(() => {
    const dir = this.globalSortDir() === 'asc' ? 1 : -1;
    const field = this.globalSortBy();
    return [...this.cohortesAffichees()].sort((a, b) =>
      field === 'nom' ? dir * a.cohorte.nom.localeCompare(b.cohorte.nom) : dir * (a.scoreMoyen - b.scoreMoyen)
    );
  });

  isFieldInvalid(fieldName: string): boolean {
    const field = this.nouvelleCohorteForm.get(fieldName);
    return !!field && field.invalid && (field.dirty || field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.nouvelleCohorteForm.get(fieldName);

    if (!field || !field.errors) {
      return '';
    }

    if (field.errors['required']) {
      return 'Ce champ est obligatoire';
    }

    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }

    return 'Valeur invalide';
  }

  protected readonly orderedCohortesAffichees = computed<CohorteAffichee[]>(() => {
    const byId = new Map(this.cohortesAffichees().map((item) => [item.cohorte.id, item]));
    return this.cohorteOrder()
      .map((id) => byId.get(id))
      .filter((item): item is CohorteAffichee => !!item);
  });

  protected readonly totalStartupsActives = computed(() =>
    this.cohortesAffichees().reduce((sum, item) => sum + item.nbProjets, 0)
  );

  protected readonly progressionGlobaleMoyenne = computed(() => {
    const arr = this.cohortesAffichees();
    if (!arr.length) return 0;
    return Math.round(arr.reduce((sum, item) => sum + item.scoreMoyen, 0) / arr.length);
  });

  protected readonly activeCohorteData = computed(() => {
    const id = this.activeContextId();
    if (id === 'GLOBAL') return null;

    const cohorte = this.cohortes().find((c) => c.id === id);
    if (!cohorte) return null;

    const projets = this.projetsParCohorte()[id] ?? [];
    const scoreMoyen =
      projets.length === 0
        ? 0
        : Math.round(projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length);
    const enRetard = projets.filter((p) => (p.scoreMaturite || 0) <= 30);
    const aJour = projets.filter((p) => (p.scoreMaturite || 0) > 70).length;

    return {
      cohorte,
      projets,
      missions: this.missionsParCohorte()[cohorte.id] ?? [],
      scoreMoyen,
      enRetard,
      aJour,
    };
  });

  // Clé stable (primitive) : l'effect des cibles de promotion ne repart que si la cohorte
  // active, sa phase, son parcours ou le nombre de cohortes changent.
  private readonly cleCiblesPromotion = computed(() => {
    const c = this.activeCohorteData()?.cohorte;
    return c
      ? `${c.id}|${c.parcoursId ?? ''}|${c.phase?.id ?? ''}|${c.phase?.ordre ?? ''}|${this.cohortes().length}`
      : null;
  });

  protected readonly filteredSortedProjets = computed(() => {
    const data = this.activeCohorteData();
    if (!data) return [];

    const term = this.searchTerm().trim().toLowerCase();
    let list = data.projets;
    if (term) {
      list = list.filter(
        (p) => p.nom?.toLowerCase().includes(term) || p.nomEntrepreneur?.toLowerCase().includes(term)
      );
    }

    const dir = this.projetSortDir() === 'asc' ? 1 : -1;
    const field = this.projetSortBy();
    return [...list].sort((a, b) =>
      field === 'nom'
        ? dir * (a.nom || '').localeCompare(b.nom || '')
        : dir * ((a.scoreMaturite || 0) - (b.scoreMaturite || 0))
    );
  });

  constructor() {
    // Sélection d'une cohorte via le paramètre de route ou le query param
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectionnerDepuisUrl(params.get('id'));
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.selectionnerDepuisUrl(params.get('cohorteId'));
    });

    // Chargement initial / changement de structure.
    effect(() => {
      if (this.structureContext.activeStructureId()) {
        untracked(() => this.loadData());
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value));

    // Cohortes de phase suivante : uniquement quand la cohorte active / sa phase change
    effect(() => {
      if (!this.cleCiblesPromotion()) {
        untracked(() => this.cohortesPhaseSuivante.set([]));
        return;
      }
      untracked(() => {
        const cohorte = this.activeCohorteData()?.cohorte;
        if (cohorte) this.chargerCohortesPhaseSuivante(cohorte);
      });
    });

    this.chargerParcours();
  }

  private selectionnerDepuisUrl(id: string | null): void {
    if (!id) return;
    this.queryCohorteIdToSelect.set(id);
    if (this.cohortes().some((c) => c.id === id)) {
      this.activeContextId.set(id);
    }
  }

  // --- FILTRE ---

  protected changerFiltre(filtre: CohorteFilter): void {
    if (this.filtreStatut() === filtre) return;
    this.filtreStatut.set(filtre);
    this.activeContextId.set('GLOBAL');
    this.loadData();
  }

  // --- TRIS ---

  protected toggleGlobalSort(field: SortField): void {
    if (this.globalSortBy() === field) {
      this.globalSortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.globalSortBy.set(field);
      this.globalSortDir.set('desc');
    }
  }

  protected toggleProjetSort(field: SortField): void {
    if (this.projetSortBy() === field) {
      this.projetSortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.projetSortBy.set(field);
      this.projetSortDir.set('desc');
    }
  }

  // --- DRAG & DROP DES ONGLETS ---

  protected onTabDragStart(event: DragEvent, id: string): void {
    this.draggedId.set(id);
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onTabDragOver(event: DragEvent, targetId: string): void {
    event.preventDefault();
    if (this.draggedId() && this.draggedId() !== targetId) {
      this.dragOverId.set(targetId);
    }
  }

  protected onTabDrop(event: DragEvent, targetId: string): void {
    event.preventDefault();
    const sourceId = this.draggedId();
    if (sourceId && sourceId !== targetId) {
      const next = this.reorder(this.cohorteOrder(), sourceId, targetId);
      this.cohorteOrder.set(next);
      this.persistOrder(next);
    }
    this.draggedId.set(null);
    this.dragOverId.set(null);
  }

  protected onTabDragEnd(): void {
    this.draggedId.set(null);
    this.dragOverId.set(null);
  }

  private reorder(order: string[], sourceId: string, targetId: string): string[] {
    const next = order.filter((id) => id !== sourceId);
    const targetIndex = next.indexOf(targetId);
    next.splice(targetIndex, 0, sourceId);
    return next;
  }

  private persistOrder(order: string[]): void {
    const structureId = this.structureContext.activeStructureId();
    if (typeof window === 'undefined' || !structureId) return;
    try {
      window.localStorage.setItem(`cohortes-order-${structureId}`, JSON.stringify(order));
    } catch {}
  }

  private loadOrder(ids: string[]): string[] {
    const structureId = this.structureContext.activeStructureId();
    if (typeof window === 'undefined' || !structureId) return ids;
    try {
      const raw = window.localStorage.getItem(`cohortes-order-${structureId}`);
      if (!raw) return ids;
      const stored: string[] = JSON.parse(raw);
      const known = new Set(ids);
      const kept = stored.filter((id) => known.has(id));
      const missing = ids.filter((id) => !kept.includes(id));
      return [...kept, ...missing];
    } catch {
      return ids;
    }
  }

  // --- CHARGEMENT ---

  protected loadData(): void {
    this.isLoading.set(true);

    if (this.isAdmin()) {
      this.cohorteService.getCoachsDisponibles().subscribe({
        next: (list) => this.coachsDisponibles.set(list),
        error: () => this.coachsDisponibles.set([]),
      });
    }

    // Charger les cohortes selon le filtre actif
    const obs$ =
      this.filtreStatut() === 'ARCHIVEES'
        ? this.cohorteService.getCohortesByStatut('ARCHIVEE')
        : this.filtreStatut() === 'TOUTES'
        ? this.cohorteService.getAllCohortes()
        : this.cohorteService.getActiveCohortes();

    obs$.subscribe({
      next: (cohortes) => {
        this.cohortes.set(cohortes);
        this.cohorteOrder.set(this.loadOrder(cohortes.map((c) => c.id)));

        const targetId = this.queryCohorteIdToSelect();

        if (targetId && cohortes.some((c) => c.id === targetId)) {
          this.activeContextId.set(targetId);
          this.queryCohorteIdToSelect.set(null);
        }

        if (!cohortes || cohortes.length === 0) {
          this.projetsParCohorte.set({});
          this.missionsParCohorte.set({});
          this.isLoading.set(false);
          return;
        }

        const projetsRequests = cohortes.map((cohorte) =>
          this.projetService.getByCohorte(cohorte.id).pipe(catchError(() => of([])))
        );

        forkJoin({
          projets: forkJoin(projetsRequests),
          missions: this.missionService.getMissions().pipe(catchError(() => of([]))),
        }).subscribe({
          next: ({ projets, missions }) => {
            // Projets par cohorte
            const projetsMap: Record<string, Projet[]> = {};
            cohortes.forEach((cohorte, index) => {
              projetsMap[cohorte.id] = projets[index] ?? [];
            });
            this.projetsParCohorte.set(projetsMap);

            // Missions par cohorte
            const missionsMap: Record<string, Mission[]> = {};
            missions.forEach((mission) => {
              if (!mission.cohorteId) {
                console.warn('Mission sans cohorteId détectée:', mission);
                return;
              }
              (missionsMap[mission.cohorteId] ??= []).push(mission);
            });
            this.missionsParCohorte.set(missionsMap);

            this.isLoading.set(false);
          },
          error: (err) => {
            console.error('Erreur chargement des données:', err);
            this.isLoading.set(false);
          },
        });
      },
      error: (err) => {
        console.error('Erreur chargement cohortes:', err);
        this.isLoading.set(false);
      },
    });
  }

  protected formatDate(dateString: string | undefined): string {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  // --- ARCHIVAGE / RESTAURATION ---

  protected archiverCohorte(cohorte: Cohorte, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Archiver la cohorte "${cohorte.nom}" ?`)) return;

    this.cohorteService.archiverCohorte(cohorte.id).subscribe({
      next: () => {
        if (this.activeContextId() === cohorte.id) {
          this.activeContextId.set('GLOBAL');
        }
        if (this.filtreStatut() === 'ACTIVES') {
          this.cohortes.update((liste) => liste.filter((c) => c.id !== cohorte.id));
        } else {
          // Le statut change mais la cohorte reste dans la liste : on recharge
          this.loadData();
        }
      },
      error: (err) => console.error("Erreur lors de l'archivage:", err),
    });
  }

  protected restaurerCohorte(cohorte: Cohorte, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Restaurer la cohorte "${cohorte.nom}" ?`)) return;

    this.cohorteService.restaurerCohorte(cohorte.id).subscribe({
      next: () => this.loadData(),
      error: (err) => console.error('Erreur lors de la restauration:', err),
    });
  }

  // --- ÉDITION (via <app-edit-cohorte>) ---

  protected ouvrirEdition(): void {
    const data = this.activeCohorteData();
    if (!data) return;
    this.cohorteEnCoursEdition.set(data.cohorte);
    this.showEditModal.set(true);
  }

  protected fermerEdition(): void {
    this.showEditModal.set(false);
    this.cohorteEnCoursEdition.set(null);
  }

  protected onCohorteUpdated(updatedCohorte: Cohorte): void {
    this.cohortes.update((liste) => liste.map((x) => (x.id === updatedCohorte.id ? updatedCohorte : x)));
    this.fermerEdition();
  }

  // --- CRÉATION DE COHORTE ---

  private chargerParcours(): void {
    this.parcoursService
      .getAllParcours()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (liste) => this.parcours.set(liste.filter((p) => !p.archive)),
        error: (err) => console.error('Erreur chargement parcours:', err),
      });
  }

  protected onParcoursChange(): void {
    const parcoursId = this.nouvelleCohorteForm.controls.parcoursId.value;

    this.nouvelleCohorteForm.controls.phaseId.setValue('');

    if (!parcoursId) {
      this.phasesDisponibles.set([]);
      return;
    }

    const selectedParcours = this.parcours().find(
      (p) => p.id === parcoursId
    );

    const phases = selectedParcours?.phases ?? [];

    this.phasesDisponibles.set(
      [...phases].sort(
        (a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)
      )
    );
  }

  protected fermerCreation(): void {
    this.nouvelleCohorteOuverte.set(false);

    this.nouvelleCohorteForm.reset({
      nom: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      parcoursId: '',
      phaseId: '',
    });

    this.phasesDisponibles.set([]);
    this.coachsSelectionnesCreation.set(new Set());
    this.erreurCreation.set(null);
  }

  protected creerCohorte(): void {
    if (this.nouvelleCohorteForm.invalid) {
      this.nouvelleCohorteForm.markAllAsTouched();
      return;
    }

    const form = this.nouvelleCohorteForm.getRawValue();

    if (form.dateDebut && form.dateFin && form.dateFin < form.dateDebut) {
      this.erreurCreation.set(
        'La date de fin doit être postérieure à la date de début.'
      );
      return;
    }

    this.creationEnCours.set(true);
    this.erreurCreation.set(null);

    const req: CreateCohorteRequest = {
      nom: form.nom.trim(),
      description: form.description.trim() || undefined,
      parcoursId: form.parcoursId,
      phaseId: form.phaseId,
      dateDebut: form.dateDebut || undefined,
      dateFin: form.dateFin || undefined,
      coachIds: Array.from(this.coachsSelectionnesCreation()),
    };

    this.cohorteService
      .createCohorte(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cohorte) => {
          this.creationEnCours.set(false);

          this.queryCohorteIdToSelect.set(cohorte.id);

          this.fermerCreation();

          if (this.filtreStatut() === 'ARCHIVEES') {
            this.filtreStatut.set('ACTIVES');
          }

          this.loadData();
        },

        error: (err) => {
          this.creationEnCours.set(false);

          this.erreurCreation.set(
            err?.error?.message ?? 'Erreur lors de la création de la cohorte.'
          );
        },
      });
  }

  // --- PROMOTION ---

  private chargerCohortesPhaseSuivante(cohorte: Cohorte): void {
    this.cohorteService
      .getCohortesPhaseSuivante(cohorte)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (cohortes) => this.cohortesPhaseSuivante.set(cohortes),
        error: () => this.cohortesPhaseSuivante.set([]),
      });
  }

  protected changerCohorteCible(projetId: string, cohorteId: string): void {
    this.cohorteCibleParProjet.update((map) => ({ ...map, [projetId]: cohorteId }));
  }

  protected promouvoirProjet(projetId: string): void {
    const nouvelleCohorteId = this.cohorteCibleParProjet()[projetId];
    if (!nouvelleCohorteId) {
      this.erreurPromotionParProjet.update((m) => ({ ...m, [projetId]: 'Choisissez une cohorte cible.' }));
      return;
    }

    this.promotionEnCoursParProjet.update((m) => ({ ...m, [projetId]: true }));
    this.erreurPromotionParProjet.update((m) => ({ ...m, [projetId]: '' }));

    this.projetService
      .promouvoirProjet(projetId, { nouvelleCohorteId })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.promotionEnCoursParProjet.update((m) => ({ ...m, [projetId]: false }));
          this.loadData();
        },
        error: (err) => {
          this.promotionEnCoursParProjet.update((m) => ({ ...m, [projetId]: false }));
          this.erreurPromotionParProjet.update((m) => ({
            ...m,
            [projetId]: err?.error?.message ?? 'Erreur lors de la promotion.',
          }));
        },
      });
  }

  protected isCoachSelectedForCreation(coachId: string): boolean {
    return this.coachsSelectionnesCreation().has(coachId);
  }

  protected toggleCoachForCreation(coachId: string): void {
    this.coachsSelectionnesCreation.update((set) => {
      const next = new Set(set);
      if (next.has(coachId)) {
        next.delete(coachId);
      } else {
        next.add(coachId);
      }
      return next;
    });
  }

  protected getCoachNames(coachs?: CoachSummary[]): string {
    if (!coachs || coachs.length === 0) return '';
    return coachs
      .map((c) => `${c.prenom || ''} ${c.nom || ''}`.trim() || c.email)
      .join(', ');
  }

  protected exporterCohortes(): void {
    const rows = this.sortedCohortesAffichees().map(({ cohorte, nbProjets, scoreMoyen }) => [
      cohorte.nom,
      libellePhase(cohorte.phase),
      cohorte.statut,
      cohorte.dateDebut,
      cohorte.dateFin,
      nbProjets,
      scoreMoyen,
      this.getCoachNames(cohorte.coachs),
    ]);

    downloadCsv(
      `cohortes-${new Date().toISOString().slice(0, 10)}`,
      ['Cohorte', 'Phase', 'Statut', 'Date de début', 'Date de fin', 'Startups', 'Maturité moyenne (%)', 'Coachs'],
      rows,
    );
  }

  protected exporterPortefeuille(data: DonneesCohorteActive): void {
    const rows = data.projets.map((projet) => [
      projet.nom,
      projet.nomEntrepreneur,
      projet.secteur,
      projet.nomParcours,
      projet.nomPhase,
      projet.scoreMaturite,
      projet.nombreMissionsValidees,
      projet.nombreMissionsTotal,
      (projet.scoreMaturite ?? 0) <= 30
        ? 'En retard'
        : (projet.scoreMaturite ?? 0) > 70
          ? 'À jour'
          : 'En cours',
      projet.statut,
    ]);

    downloadCsv(
      `portefeuille-${data.cohorte.nom}-${new Date().toISOString().slice(0, 10)}`,
      [
        'Projet',
        'Entrepreneur',
        'Secteur',
        'Parcours',
        'Phase',
        'Maturité (%)',
        'Missions validées',
        'Missions totales',
        'Progression',
        'Statut du projet',
      ],
      rows,
    );
  }
}