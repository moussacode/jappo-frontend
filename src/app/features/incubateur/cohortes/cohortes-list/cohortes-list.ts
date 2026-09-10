import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { Cohorte, Projet } from '../../../../core/models';
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';

interface CohorteAffichee {
  cohorte: Cohorte;
  nbProjets: number;
  scoreMoyen: number;
}

export type VueMode = 'grid' | 'table';

@Component({
  selector: 'app-cohortes-list',
  standalone: true,
  imports: [RouterLink, Icon, BadgeComponent],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête + Sélecteur de vue -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Cohortes</h1>
          <p class="mt-1 text-xs text-ink-muted sm:text-sm">
            @if (isLoading()) {
              Chargement des cohortes en cours...
            } @else {
              {{ cohortesAffichees().length }} cohorte(s) enregistrée(s)
            }
          </p>
        </div>

        <div class="flex items-center gap-3">
          <!-- Switcher Grille / Tableau -->
          <div class="flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs">
            <button
              type="button"
              (click)="vueMode.set('grid')"
              [class]="
                vueMode() === 'grid'
                  ? 'bg-action-fill text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              "
              class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
              title="Vue cartes"
            >
              <app-icon name="dashboard" class="size-4" />
            </button>
            <button
              type="button"
              (click)="vueMode.set('table')"
              [class]="
                vueMode() === 'table'
                  ? 'bg-action-fill text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              "
              class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
              title="Vue liste"
            >
              <app-icon name="missions" class="size-4" />
            </button>
          </div>

          <!-- Bouton Création -->
          <a
            routerLink="/incubateur/cohortes/nouvelle"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-action-fill px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 cursor-pointer"
          >
            <app-icon name="plus" class="size-4 text-white" />
            <span class="hidden sm:inline">Nouvelle cohorte</span>
          </a>
        </div>
      </div>

      <!-- Chargement Skeleton -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3]; track i) {
            <div class="flex flex-col gap-4 rounded-[var(--radius-card-lg)] border border-line bg-surface p-5 shadow-xs animate-pulse">
              <div class="flex items-center justify-between">
                <div class="h-5 w-1/2 rounded-md bg-line"></div>
                <div class="h-5 w-16 rounded-full bg-line"></div>
              </div>
              <div class="h-10 w-full rounded-md bg-line/60"></div>
              <div class="mt-auto flex items-center justify-between border-t border-line pt-3">
                <div class="h-4 w-20 rounded-md bg-line"></div>
                <div class="h-4 w-12 rounded-md bg-line"></div>
              </div>
            </div>
          }
        </div>
      } @else {
        
        <!-- VUE 1 : GRILLE DE CARTES -->
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (item of cohortesAffichees(); track item.cohorte.id) {
              <a
                [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                class="group flex flex-col justify-between gap-4 rounded-[var(--radius-card-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-subtle)] transition-all hover:border-accent/40  cursor-pointer"
              >
                <!-- En-tête Carte -->
                <div class="flex items-start justify-between gap-3 min-w-0">
                  <div class="flex flex-col min-w-0">
                    <h2 class="truncate text-base font-bold text-ink transition-colors group-hover:text-accent">
                      {{ item.cohorte.nom }}
                    </h2>
                    <span class="mt-0.5 text-[11px] font-medium text-ink-muted">
                      {{ formatDate(item.cohorte.dateDebut) }} — {{ formatDate(item.cohorte.dateFin) }}
                    </span>
                  </div>
                  <span class="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
                    {{ item.nbProjets }} {{ item.nbProjets > 1 ? 'projets' : 'projet' }}
                  </span>
                </div>

                <!-- Description -->
                <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                  {{ item.cohorte.description || 'Aucune description disponible pour cette cohorte.' }}
                </p>

                <!-- Bas de carte -->
                <div class="flex items-center justify-between border-t border-line pt-3 mt-2">
                  <app-badge [status]="statutBadge(item.cohorte.statut).status">
                    {{ statutBadge(item.cohorte.statut).label }}
                  </app-badge>

                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                      <div 
                        class="h-full rounded-full bg-accent transition-all duration-300" 
                        [style.width.%]="item.scoreMoyen"
                      ></div>
                    </div>
                    <span class="text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                  </div>
                </div>
              </a>
            } @empty {
              <ng-container *ngTemplateOutlet="emptyState"></ng-container>
            }
          </div>
        }

        <!-- VUE 2 : TABLEAU / LISTE -->
        @if (vueMode() === 'table') {
          <div class="w-full min-w-0 overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-surface shadow-[var(--shadow-subtle)]">
            <div class="w-full overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[650px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-line bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                    <th class="w-4/12 px-5 py-3.5">Cohorte</th>
                    <th class="w-3/12 px-5 py-3.5">Période</th>
                    <th class="w-2/12 px-5 py-3.5">Projets</th>
                    <th class="w-2/12 px-5 py-3.5">Maturité moy.</th>
                    <th class="w-2/12 px-5 py-3.5">Statut</th>
                    <th class="w-1/12 px-5 py-3.5 text-right"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (item of cohortesAffichees(); track item.cohorte.id) {
                    <tr class="group transition-colors hover:bg-surface-muted/40">
                      <!-- Nom & Description -->
                      <td class="px-5 py-3.5">
                        <div class="flex flex-col min-w-0">
                          <a 
                            [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                            class="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent"
                          >
                            {{ item.cohorte.nom }}
                          </a>
                          <span class="truncate text-[11px] text-ink-muted">
                            {{ item.cohorte.description || 'Aucune description' }}
                          </span>
                        </div>
                      </td>

                      <!-- Dates -->
                      <td class="px-5 py-3.5 text-ink-muted font-medium whitespace-nowrap">
                        {{ formatDate(item.cohorte.dateDebut) }} — {{ formatDate(item.cohorte.dateFin) }}
                      </td>

                      <!-- Nb Projets -->
                      <td class="px-5 py-3.5 font-semibold text-ink">
                        {{ item.nbProjets }} {{ item.nbProjets > 1 ? 'projets' : 'projet' }}
                      </td>

                      <!-- Score Moyen -->
                      <td class="px-5 py-3.5">
                        <div class="flex items-center gap-2">
                          <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                            <div 
                              class="h-full rounded-full bg-accent transition-all duration-300" 
                              [style.width.%]="item.scoreMoyen"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-ink">{{ item.scoreMoyen }}%</span>
                        </div>
                      </td>

                      <!-- Statut Badge -->
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <app-badge [status]="statutBadge(item.cohorte.statut).status">
                          {{ statutBadge(item.cohorte.statut).label }}
                        </app-badge>
                      </td>

                      <!-- Action -->
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <a
                          [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
                          class="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
                        >
                          Voir
                          <app-icon name="chevron-right" class="size-3.5" />
                        </a>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="6">
                        <ng-container *ngTemplateOutlet="emptyState"></ng-container>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

      }
    </div>

    <!-- Template pour l'état vide -->
    <ng-template #emptyState>
      <div class="col-span-full flex flex-col items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-line bg-surface p-12 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-3 border border-line">
          <app-icon name="cohortes" class="size-6" />
        </div>
        <h2 class="text-sm font-bold text-ink">Aucune cohorte trouvée</h2>
        <p class="mt-1 text-xs text-ink-muted max-w-sm">
          Commencez par créer votre première cohorte pour regrouper vos entrepreneurs.
        </p>
        <a
          routerLink="/incubateur/cohortes/nouvelle"
          class="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
        >
          <app-icon name="plus" class="size-3.5" />
          <span>Créer une cohorte</span>
        </a>
      </div>
    </ng-template>
  `,
})
export class CohortesList {
  private readonly structureContext = inject(StructureContextService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);

  protected readonly vueMode = signal<VueMode>('grid'); // 👈 Signal de gestion de vue (Cartes / Tableau)
  protected readonly isLoading = signal<boolean>(true);
  private readonly cohortes = signal<Cohorte[]>([]);
  private readonly projetsParCohorte = signal<Record<string, Projet[]>>({});

  protected readonly cohortesAffichees = computed<CohorteAffichee[]>(() =>
    this.cohortes().map((cohorte) => {
      const projets = this.projetsParCohorte()[cohorte.id] ?? [];
      const scoreMoyen =
        projets.length === 0
          ? 0
          : Math.round(
              projets.reduce((sum, p) => sum + (p.scoreMaturite || 0), 0) / projets.length
            );
      return { cohorte, nbProjets: projets.length, scoreMoyen };
    })
  );

  constructor() {
    effect(() => {
      const activeStructureId = this.structureContext.activeStructureId();
      if (activeStructureId) {
        this.loadData();
      }
    });
  }

  private loadData(): void {
    this.isLoading.set(true);

    this.cohorteService.getCohortes().subscribe({
      next: (cohortes) => {
        this.cohortes.set(cohortes);

        if (!cohortes || cohortes.length === 0) {
          this.isLoading.set(false);
          return;
        }

        const requests = cohortes.map((c) =>
          this.projetService.getByCohorte(c.id).pipe(
            catchError(() => of([]))
          )
        );

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
        console.error('Erreur récupération cohortes :', err);
        this.isLoading.set(false);
      },
    });
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
    switch (statut) {
      case 'EN_COURS':
      case 'ACTIVE':
        return { status: 'success', label: 'En cours' };
      case 'A_VENIR':
      case 'PLANIFIEE':
        return { status: 'info', label: 'À venir' };
      case 'TERMINEE':
      case 'ARCHIVEE':
        return { status: 'neutral', label: 'Terminée' };
      default:
        return { status: 'neutral', label: statut || 'Active' };
    }
  }

  protected formatDate(dateString: string | undefined): string {
    if (!dateString) return 'Date non définie';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  }
}