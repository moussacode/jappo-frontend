import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte, Projet } from '../../../../core/models';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { NouvelleCohorte } from '../nouvelle-cohorte/nouvelle-cohorte';

interface CohorteAffichee {
  cohorte: Cohorte;
  nbProjets: number;
  scoreMoyen: number;
}

type SortField = 'nom' | 'progression';
type SortDir = 'asc' | 'desc';

@Component({
  selector: 'app-cohortes-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icon,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    AvatarComponent,
    NouvelleCohorte
],
  template: `
    <div class="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-surface-muted/10">

      <!-- SÉLECTEUR DE CONTEXTE (onglets) -->
   <div
  role="tablist"
  aria-label="Cohortes"
  class="shrink-0 flex w-full items-end gap-1 overflow-x-auto border-b border-line bg-surface px-4 pt-4 sm:px-6 lg:px-8 custom-scrollbar cohort-tabs"
>
        <button
          role="tab"
          id="tab-global"
          [attr.aria-selected]="activeContextId() === 'GLOBAL'"
          aria-controls="panel-cohortes"
          (click)="activeContextId.set('GLOBAL')"
          [class]="activeContextId() === 'GLOBAL' ? 'border-accent text-accent bg-accent-soft/20' : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted'"
          class="relative flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-bold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
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
              <div class="absolute -left-0.5 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent"></div>
            }
            <button
              role="tab"
              [id]="'tab-' + item.cohorte.id"
              draggable="true"
              title="Glisser pour réorganiser les onglets"
              [attr.aria-selected]="activeContextId() === item.cohorte.id"
              aria-controls="panel-cohortes"
              (click)="activeContextId.set(item.cohorte.id)"
              (dragstart)="onTabDragStart($event, item.cohorte.id)"
              (dragend)="onTabDragEnd()"
              [class]="(activeContextId() === item.cohorte.id ? 'border-accent text-accent bg-accent-soft/20' : 'border-transparent text-ink-muted hover:text-ink hover:bg-surface-muted') + (draggedId() === item.cohorte.id ? ' opacity-40' : '')"
              class="relative flex items-center gap-2 rounded-t-xl border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-[-2px]"
            >
              <app-icon name="cohortes" class="size-4" />
              {{ item.cohorte.nom }}
              <span class="rounded-full bg-surface-muted px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">{{ item.nbProjets }}</span>
            </button>
          </div>
        }

       
         <button
  size="sm"
  (click)="nouvelleCohorteOuverte.set(true)"
   aria-label="Créer une nouvelle cohorte"
          class="flex items-center rounded-t-xl border-b-2 border-transparent px-3 py-3 cursor-pointer text-ink-muted hover:text-ink hover:bg-surface-muted"
        
>
  <app-icon name="plus" class="size-4" />
 
</button>
      </div>

      <div
  id="panel-cohortes"
  role="tabpanel"
  class="min-h-0 flex-1 overflow-y-auto"
>
<div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <!-- CHARGEMENT -->
        @if (isLoading()) {
          <div class="flex flex-col gap-6" aria-live="polite" aria-busy="true">
            <span class="sr-only">Chargement des cohortes…</span>
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              @for (i of [1, 2, 3]; track i) {
                <div class="h-[74px] animate-pulse rounded-xl border border-line bg-surface-muted/60"></div>
              }
            </div>
            <div class="h-64 animate-pulse rounded-xl border border-line bg-surface-muted/60"></div>
          </div>
        }

        <!-- ÉTAT 1 : VUE GLOBALE -->
        @else if (activeContextId() === 'GLOBAL') {
          <app-page-header title="Toutes les cohortes" subtitle="Pilotez et comparez l'avancement de vos différents programmes.">
            <app-button
  size="sm"
  (click)="nouvelleCohorteOuverte.set(true)"
>
  <app-icon name="plus" class="size-4" />
  <span>Nouvelle cohorte</span>
</app-button>
          </app-page-header>

          @if (cohortes().length === 0) {
            <app-empty-state title="">
              <h3 class="text-sm font-bold text-ink">Aucune cohorte pour l'instant</h3>
              <p class="mt-1 text-sm text-ink-muted">Créez votre première cohorte pour commencer à suivre des startups.</p>
              <a routerLink="/incubateur/cohortes/nouvelle" class="mt-4 inline-block">
                <app-button size="sm">
                  <app-icon name="plus" class="size-4 mr-1.5" />
                  <span>Créer une cohorte</span>
                </app-button>
              </a>
            </app-empty-state>
          } @else {
            <!-- KPI Globaux -->
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <app-card padding="md" >
                <span class="text-xs font-medium text-ink-muted">Cohortes actives</span>
                <div class="mt-2 text-2xl font-bold text-ink">{{ cohortes().length }}</div>
              </app-card>
              <app-card padding="md" >
                <span class="text-xs font-medium text-ink-muted">Startups accompagnées</span>
                <div class="mt-2 text-2xl font-bold text-ink">{{ totalStartupsActives() }}</div>
              </app-card>
              <app-card padding="md" >
                <span class="text-xs font-medium text-ink-muted">Progression moyenne</span>
                <div class="mt-2 text-2xl font-bold text-ink">{{ progressionGlobaleMoyenne() }}%</div>
              </app-card>
            </div>

            <!-- Tableau (desktop) -->
            <app-card padding="none" class="hidden w-full min-w-0 overflow-hidden shadow-xs sm:block">
              <table class="w-full min-w-[650px] border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-line bg-surface-muted/60 font-semibold text-ink-muted">
                    <th class="w-4/12 px-5 py-3.5">
                      <button (click)="toggleGlobalSort('nom')" class="flex items-center gap-1 hover:text-ink">
                        Cohorte
                        @if (globalSortBy() === 'nom') {
                          <app-icon [name]="globalSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3" />
                        }
                      </button>
                    </th>
                    <th class="w-3/12 px-5 py-3.5">Période</th>
                    <th class="w-2/12 px-5 py-3.5 text-center">Startups</th>
                    <th class="w-3/12 px-5 py-3.5 text-right">
                      <button (click)="toggleGlobalSort('progression')" class="ml-auto flex items-center gap-1 hover:text-ink">
                        Progression
                        @if (globalSortBy() === 'progression') {
                          <app-icon [name]="globalSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3" />
                        }
                      </button>
                    </th>
                    <th class="w-2/12 px-5 py-3.5 text-right">
  Action
</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line bg-surface">
                  @for (item of sortedCohortesAffichees(); track item.cohorte.id) {
                    <tr
                      tabindex="0"
                      role="button"
                      [attr.aria-label]="'Ouvrir ' + item.cohorte.nom"
                      (click)="activeContextId.set(item.cohorte.id)"
                      (keydown.enter)="activeContextId.set(item.cohorte.id)"
                      class="group cursor-pointer transition-colors hover:bg-surface-muted/40 focus-visible:bg-surface-muted/60 focus-visible:outline-none"
                    >
                      <td class="px-5 py-3.5">
                        <span class="truncate text-sm font-bold text-ink transition-colors group-hover:text-accent">{{ item.cohorte.nom }}</span>
                      </td>
                      <td class="px-5 py-3.5 font-medium text-ink-muted">{{ formatDate(item.cohorte.dateDebut) }} → {{ formatDate(item.cohorte.dateFin) }}</td>
                      <td class="px-5 py-3.5 text-center font-semibold text-ink">{{ item.nbProjets }}</td>
                      <td class="px-5 py-3.5 text-right">
                        <div class="flex items-center justify-end gap-2.5">
                          <div class="h-2 w-16 overflow-hidden rounded-full bg-line">
                            <div class="h-full rounded-full bg-accent" [style.width.%]="item.scoreMoyen"></div>
                          </div>
                          <span class="w-8 text-right text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                        </div>
                      </td>
                      <td class="px-5 py-3.5 text-right">
  <button
    type="button"
    (click)="archiverCohorte(item.cohorte, $event)"
    class="text-xs font-medium text-danger hover:underline"
    title="Archiver"
  >
    Archiver
  </button>
</td>
                    </tr>
                  }
                </tbody>
              </table>
            </app-card>

            <!-- Cartes (mobile) -->
            <div class="flex flex-col gap-3 sm:hidden">
              @for (item of sortedCohortesAffichees(); track item.cohorte.id) {
                <app-card
                  padding="md"
                  tabindex="0"
                  role="button"
                  [attr.aria-label]="'Ouvrir ' + item.cohorte.nom"
                  (click)="activeContextId.set(item.cohorte.id)"
                  (keydown.enter)="activeContextId.set(item.cohorte.id)"
                  class="border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-ink">{{ item.cohorte.nom }}</span>
                    <span class="text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                  </div>
                  <div class="mt-1 text-[11px] text-ink-muted">{{ formatDate(item.cohorte.dateDebut) }} → {{ formatDate(item.cohorte.dateFin) }} · {{ item.nbProjets }} startups</div>
                  <div class="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
                    <div class="h-full rounded-full bg-accent" [style.width.%]="item.scoreMoyen"></div>
                  </div>
                  
                </app-card>
              }
            </div>
          }
        }

        <!-- ÉTAT 2 : VUE SPÉCIFIQUE D'UNE COHORTE -->
        @else if (activeCohorteData(); as data) {
          <app-page-header
            [title]="data.cohorte.nom"
            [subtitle]="formatDate(data.cohorte.dateDebut) + ' au ' + formatDate(data.cohorte.dateFin) + ' · ' + data.projets.length + ' startups accompagnées'"
          >
            <div class="flex gap-2">
              <a [routerLink]="['/incubateur/cohortes', data.cohorte.id, 'parametres']">
                <app-button size="sm">
                  <app-icon name="settings" class="size-4 mr-1.5" /> Paramètres
                </app-button>
              </a>
              <a routerLink="/incubateur/entrepreneurs/inviter">
                <app-button size="sm">
                  <app-icon name="plus" class="size-4 mr-1.5" /> Ajouter startup
                </app-button>
              </a>
            </div>
          </app-page-header>

          <!-- KPI honnêtes, dérivés des données réelles -->
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <app-card padding="md" >
              <span class="text-xs font-medium text-ink-muted">Startups suivies</span>
              <div class="mt-2 text-xl font-bold text-ink">{{ data.projets.length }}</div>
            </app-card>
            <app-card padding="md" >
              <span class="text-xs font-medium text-ink-muted">Progression moyenne</span>
              <div class="mt-2 text-xl font-bold text-emerald-600">{{ data.scoreMoyen }}%</div>
            </app-card>
            <app-card padding="md" >
              <span class="text-xs font-medium text-ink-muted">À jour</span>
              <div class="mt-2 text-xl font-bold text-ink">{{ data.aJour }}</div>
            </app-card>
            <app-card padding="md" >
              <span class="text-xs font-medium text-ink-muted">En retard</span>
              <div class="mt-2 text-xl font-bold" [class]="data.enRetard.length > 0 ? 'text-rose-600' : 'text-ink'">{{ data.enRetard.length }}</div>
            </app-card>
          </div>

          <!-- Alerte contextuelle : uniquement si un retard réel existe -->
          @if (data.enRetard.length > 0) {
            <div class="flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <h3 class="flex items-center gap-2 text-xs font-bold text-amber-700">
                <app-icon name="warning" class="size-4" />
                {{ data.enRetard.length }} startup{{ data.enRetard.length > 1 ? 's' : '' }} en retard
              </h3>
              <div class="flex flex-wrap gap-2">
                @for (p of data.enRetard; track p.id) {
                  <a
                    [routerLink]="['/incubateur/projets', p.id]"
                    class="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-amber-800 hover:underline"
                  >
                    {{ p.nom }} · {{ p.scoreMaturite || 0 }}%
                  </a>
                }
              </div>
            </div>
          }

          <!-- Barre d'outils : recherche + tri -->
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 class="text-sm font-bold text-ink">Portefeuille des startups</h3>
            <div class="relative w-full sm:w-64">
              <app-icon name="search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                [formControl]="searchControl"
                placeholder="Rechercher une startup…"
                aria-label="Rechercher une startup dans cette cohorte"
                class="w-full rounded-lg border border-line bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
              />
            </div>
          </div>

          <!-- Tableau (desktop) -->
          <app-card padding="none" class="hidden w-full min-w-0 overflow-hiddenshadow-xs sm:block">
            <table class="w-full min-w-[800px] border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-line bg-surface-muted/60 font-semibold text-ink-muted">
                  <th class="w-3/12 px-5 py-3.5">
                    <button (click)="toggleProjetSort('nom')" class="flex items-center gap-1 hover:text-ink">
                      Startup & porteur
                      @if (projetSortBy() === 'nom') {
                        <app-icon [name]="projetSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3" />
                      }
                    </button>
                  </th>
                  <th class="w-3/12 px-5 py-3.5 text-center">
                    <button (click)="toggleProjetSort('progression')" class="mx-auto flex items-center gap-1 hover:text-ink">
                      Avancement
                      @if (projetSortBy() === 'progression') {
                        <app-icon [name]="projetSortDir() === 'asc' ? 'chevron-up' : 'chevron-down'" class="size-3" />
                      }
                    </button>
                  </th>
                  <th class="w-2/12 px-5 py-3.5 text-center">Statut</th>
                  <th class="w-2/12 px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line bg-surface">
                @for (p of filteredSortedProjets(); track p.id) {
                  <tr class="group transition-colors hover:bg-surface-muted/40">
                    <td class="px-5 py-3.5">
                      <div class="flex items-center gap-3">
                        <app-avatar [initials]="p.nom ? p.nom.substring(0, 2).toUpperCase() : 'PR'" size="sm" />
                        <div class="flex flex-col">
                          <span class="text-sm font-bold text-ink">{{ p.nom }}</span>
                          <span class="text-[11px] text-ink-muted">{{ p.nomEntrepreneur || 'Sans porteur' }}</span>
                        </div>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      <div class="flex items-center justify-center gap-2">
                        <div class="flex h-2 w-32 overflow-hidden rounded-sm bg-line">
                          <div class="bg-accent transition-all duration-300" [style.width.%]="p.scoreMaturite || 0"></div>
                        </div>
                        <span class="w-8 font-mono font-semibold text-ink">{{ p.scoreMaturite || 0 }}%</span>
                      </div>
                    </td>
                    <td class="px-5 py-3.5 text-center">
                      @if ((p.scoreMaturite || 0) > 70) {
                        <app-badge status="success" size="sm">À jour</app-badge>
                      } @else if ((p.scoreMaturite || 0) > 30) {
                        <app-badge status="warning" size="sm">En cours</app-badge>
                      } @else {
                        <app-badge status="danger" size="sm">En retard</app-badge>
                      }
                    </td>
                    <td class="px-5 py-3.5 text-right">
                      <a
                        [routerLink]="['/incubateur/projets', p.id]"
                        class="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-accent"
                      >
                        Détails & suivi <app-icon name="chevron-right" class="size-3.5" />
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="p-8 text-center text-sm text-ink-muted">
                      @if (searchControl.value) {
                        Aucune startup ne correspond à « {{ searchControl.value }} ».
                      } @else {
                        Aucun projet dans cette cohorte pour le moment.
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </app-card>

          <!-- Cartes (mobile) -->
          <div class="flex flex-col gap-3 sm:hidden">
            @for (p of filteredSortedProjets(); track p.id) {
              <app-card padding="md" class="border border-line bg-surface">
                <div class="flex items-center gap-3">
                  <app-avatar [initials]="p.nom ? p.nom.substring(0, 2).toUpperCase() : 'PR'" size="sm" />
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-sm font-bold text-ink">{{ p.nom }}</span>
                    <span class="truncate text-[11px] text-ink-muted">{{ p.nomEntrepreneur || 'Sans porteur' }}</span>
                  </div>
                  @if ((p.scoreMaturite || 0) > 70) {
                    <app-badge status="success" size="sm">À jour</app-badge>
                  } @else if ((p.scoreMaturite || 0) > 30) {
                    <app-badge status="warning" size="sm">En cours</app-badge>
                  } @else {
                    <app-badge status="danger" size="sm">En retard</app-badge>
                  }
                </div>
                <div class="mt-3 flex items-center gap-2">
                  <div class="flex h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <div class="bg-accent" [style.width.%]="p.scoreMaturite || 0"></div>
                  </div>
                  <span class="text-xs font-semibold text-ink">{{ p.scoreMaturite || 0 }}%</span>
                </div>
                <a [routerLink]="['/incubateur/projets', p.id]" class="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  Détails & suivi <app-icon name="chevron-right" class="size-3.5" />
                </a>
              </app-card>
            } @empty {
              <p class="p-6 text-center text-sm text-ink-muted">
                @if (searchControl.value) {
                  Aucune startup ne correspond à « {{ searchControl.value }} ».
                } @else {
                  Aucun projet dans cette cohorte pour le moment.
                }
              </p>
            }
          </div>
        }
      </div>
      </div>
    </div>


    @if (nouvelleCohorteOuverte()) {
  <app-nouvelle-cohorte
    (closed)="nouvelleCohorteOuverte.set(false)"
    (created)="onCohorteCreated()"
  />
}
  `,
})
export class CohortesList {
  private readonly structureContext = inject(StructureContextService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nouvelleCohorteOuverte = signal(false);

  protected readonly activeContextId = signal<string>('GLOBAL');
  protected readonly isLoading = signal<boolean>(true);

  protected readonly cohortes = signal<Cohorte[]>([]);
  private readonly projetsParCohorte = signal<Record<string, Projet[]>>({});

  // -- Ordre des onglets (glisser-déposer, persisté par structure) --
  protected readonly cohorteOrder = signal<string[]>([]);
  protected readonly draggedId = signal<string | null>(null);
  protected readonly dragOverId = signal<string | null>(null);

  // -- Tri (vue globale) --
  protected readonly globalSortBy = signal<SortField>('progression');
  protected readonly globalSortDir = signal<SortDir>('desc');

  // -- Tri + recherche (portefeuille d'une cohorte) --
  protected readonly projetSortBy = signal<SortField>('progression');
  protected readonly projetSortDir = signal<SortDir>('desc');
  protected readonly searchControl = new FormControl<string>('', { nonNullable: true });
  private readonly searchTerm = signal('');
protected onCohorteCreated(): void {
  this.nouvelleCohorteOuverte.set(false);
  this.loadData();
}
  // -- Données vue globale --
  protected readonly cohortesAffichees = computed<CohorteAffichee[]>(() =>
    this.cohortes().map((cohorte) => {
      const projets = this.projetsParCohorte()[cohorte.id] ?? [];
      const scoreMoyen = projets.length === 0 ? 0 : Math.round(projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length);
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

  // Onglets dans l'ordre choisi par l'utilisateur (les nouvelles cohortes sont ajoutées à la fin)
  protected readonly orderedCohortesAffichees = computed<CohorteAffichee[]>(() => {
    const byId = new Map(this.cohortesAffichees().map((item) => [item.cohorte.id, item]));
    return this.cohorteOrder()
      .map((id) => byId.get(id))
      .filter((item): item is CohorteAffichee => !!item);
  });

  protected readonly totalStartupsActives = computed(() => this.cohortesAffichees().reduce((sum, item) => sum + item.nbProjets, 0));
  protected readonly progressionGlobaleMoyenne = computed(() => {
    const arr = this.cohortesAffichees();
    if (!arr.length) return 0;
    return Math.round(arr.reduce((sum, item) => sum + item.scoreMoyen, 0) / arr.length);
  });

  // -- Données vue spécifique (portefeuille) --
  protected readonly activeCohorteData = computed(() => {
    const id = this.activeContextId();
    if (id === 'GLOBAL') return null;

    const cohorte = this.cohortes().find((c) => c.id === id);
    if (!cohorte) return null;

    const projets = this.projetsParCohorte()[id] ?? [];
    const scoreMoyen = projets.length === 0 ? 0 : Math.round(projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length);
    const enRetard = projets.filter((p) => (p.scoreMaturite || 0) <= 30);
    const aJour = projets.filter((p) => (p.scoreMaturite || 0) > 70).length;

    return { cohorte, projets, scoreMoyen, enRetard, aJour };
  });

  protected readonly filteredSortedProjets = computed(() => {
    const data = this.activeCohorteData();
    if (!data) return [];

    const term = this.searchTerm().trim().toLowerCase();
    let list = data.projets;
    if (term) {
      list = list.filter((p) => p.nom?.toLowerCase().includes(term) || p.nomEntrepreneur?.toLowerCase().includes(term));
    }

    const dir = this.projetSortDir() === 'asc' ? 1 : -1;
    const field = this.projetSortBy();
    return [...list].sort((a, b) =>
      field === 'nom' ? dir * (a.nom || '').localeCompare(b.nom || '') : dir * ((a.scoreMaturite || 0) - (b.scoreMaturite || 0))
    );
  });

  constructor() {
    effect(() => {
      if (this.structureContext.activeStructureId()) this.loadData();
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.searchTerm.set(value));
  }

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

  // -- Glisser-déposer des onglets (comme les feuilles Excel) --
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
    } catch {
      // Stockage indisponible (mode privé, quota…) : on continue sans persister l'ordre.
    }
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

  private loadData(): void {
    this.isLoading.set(true);
    this.cohorteService.getCohortes().subscribe({
      next: (cohortes) => {
        this.cohortes.set(cohortes);
        this.cohorteOrder.set(this.loadOrder(cohortes.map((c) => c.id)));
        if (!cohortes || cohortes.length === 0) {
          this.isLoading.set(false);
          return;
        }

        const requests = cohortes.map((c) => this.projetService.getByCohorte(c.id).pipe(catchError(() => of([]))));

        forkJoin(requests).subscribe({
          next: (results) => {
            const map: Record<string, Projet[]> = {};
            cohortes.forEach((cohorte, index) => {
              map[cohorte.id] = results[index] ?? [];
            });
            this.projetsParCohorte.set(map);
            this.isLoading.set(false);
          },
          error: () => this.isLoading.set(false),
        });
      },
      error: (err) => {
        console.error('Erreur:', err);
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




  protected archiverCohorte(cohorte: Cohorte, event: Event): void {
  event.stopPropagation(); // évite de déclencher le clic sur la ligne/carte
  if (!confirm(`Archiver la cohorte "${cohorte.nom}" ?`)) return;

  this.cohorteService.archiverCohorte(cohorte.id).subscribe({
    next: () => {
      // Retire la cohorte archivée de la liste affichée
      this.cohortes.update((liste) => liste.filter((c) => c.id !== cohorte.id));
    },
    error: (err) => console.error('Erreur lors de l\'archivage:', err),
  });
}
}