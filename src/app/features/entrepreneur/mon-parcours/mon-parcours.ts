import { Component, inject, signal, computed, DestroyRef, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

import { LoadingState } from '../../../shared/components/loading-state/loading-state';
import { Icon } from '../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../shared/components/badge/badge';
import { CardComponent } from '../../../shared/components/card/card.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';

import { MonParcoursService } from '../../../core/services/mon-parcours.service';
import { CohorteService } from '../../../core/services/cohorte.service';
import { ParcoursService } from '../../../core/services/parcours.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { RessourceService } from '../../../core/services/ressource.service';

import {
  MissionResponse,
  Parcours,
  ParticipationCohorteResponse,
  Projet,
  Phase,
} from '../../../core/models';

import { Meeting } from '../../../core/models/meeting.model';
import { Ressource } from '../../../core/models/ressource.model';

@Component({
  selector: 'app-mon-parcours',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    LoadingState,
    Icon,
    BadgeComponent,
    CardComponent,
    EmptyStateComponent,
  ],
  styles: [`
    .trait {
      background-image: repeating-linear-gradient(
        90deg,
        currentColor 0 6px,
        transparent 6px 10px
      );
      background-size: 10px 100%;
    }
    .trait-anime {
      animation: defile 0.8s linear infinite;
    }
    @keyframes defile {
      to { background-position: 10px 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .trait-anime { animation: none; }
    }
  `],
  template: `
    <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-8 p-4 sm:p-6 lg:p-8">

      @if (chargement()) {
        <app-loading-state message="Chargement de votre parcours..." />
      }

      <!-- Pas encore de projet -->
      @if (!chargement() && !projet()) {
        <app-card padding="none" class=" border border-line/60">
          <div class="p-8 sm:p-12">
            <app-empty-state
              title="Bienvenue !"
              description="Vous n'êtes pas encore affecté à une cohorte. Un coach va bientôt vous intégrer dans un parcours."
              iconName="dashboard"
            />
          </div>
        </app-card>
      }

      @if (!chargement() && projet(); as p) {

        <!-- En-tête : parcours et phase actuelle -->
        <div class="flex flex-col gap-1">
          <p class="text-xs font-bold uppercase tracking-wider text-ink-muted">
            Mon parcours
          </p>
          <h1 class="text-xl sm:text-2xl font-extrabold text-ink">
            {{ p.nom }}
          </h1>
        </div>

        <!-- Frise de progression des phases -->
        @if (parcours()) {
          <app-card padding="none" class="overflow-hidden">
            <div class="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line/60 bg-surface-muted/30">
              <h2 class="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Progression</h2>
              <span class="text-xs font-bold text-ink">
                {{ phasesSorted().length }} phases 
              </span>
            </div>

            <div class="overflow-x-auto p-5 custom-scrollbar">
              <ol class="flex min-w-max sm:min-w-0">
                @for (phase of phasesSorted(); track phase.id; let i = $index; let last = $last) {
                  @let etat = etatPhase(phase);

                  <li
                    class="relative min-w-[170px] flex-1 pr-4"
                    [attr.aria-current]="etat === 'actuelle' ? 'step' : null"
                  >
                    <!-- Connecteur vers la phase suivante -->
                    @if (!last) {
                      <div class="absolute left-4 top-4 -mt-px h-0.5 w-full">
                        @switch (etat) {
                          @case ('passee') {
                            <div class="absolute inset-0 rounded-full bg-emerald-500"></div>
                          }
                          @case ('actuelle') {
                            <div class="trait absolute inset-0 text-line"></div>
                            <div class="trait trait-anime absolute inset-y-0 left-0 w-1/2 text-accent"></div>
                          }
                          @default {
                            <div class="trait absolute inset-0 text-line"></div>
                          }
                        }
                      </div>
                    }

                    <!-- Pastille numérotée -->
                    <div class="relative z-10 flex size-8 items-center justify-center">
                      @switch (etat) {
                        @case ('passee') {
                          <span class="flex size-8 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow-xs">
                            {{ i + 1 }}
                          </span>
                        }
                        @case ('actuelle') {
                          <span class="absolute size-8 rounded-full bg-accent/25 motion-reduce:hidden animate-pulse"></span>
                          <span class="relative flex size-8 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent text-xs font-bold">
                            {{ i + 1 }}
                          </span>
                        }
                        @default {
                          <span class="flex size-7 items-center justify-center rounded-full bg-surface-muted border border-line/60 text-ink-muted text-xs font-bold">
                            {{ i + 1 }}
                          </span>
                        }
                      }
                    </div>

                    <!-- Texte -->
                    <div class="mt-3 flex flex-col gap-1">
                      <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-muted text-ink-muted border border-line/60">
                          Phase {{ i + 1 }}
                        </span>
                      </div>
                      <p
                        class="text-xs sm:text-sm leading-snug"
                        [class]="etat === 'avenir'
                          ? 'font-medium text-ink-muted/60'
                          : etat === 'actuelle'
                            ? 'font-bold text-ink'
                            : 'font-semibold text-ink'"
                      >
                        {{ phase.nom }}
                      </p>

                      @if (phase.description) {
                        <p class="line-clamp-2 text-[11px] text-ink-muted">
                          {{ phase.description }}
                        </p>
                      }

                      @if (etat === 'passee') {
                        <app-badge status="success" size="sm" class="w-fit mt-1">Terminée</app-badge>
                      } @else if (etat === 'actuelle') {
                        <app-badge status="info" size="sm" class="w-fit mt-1">En cours</app-badge>
                      }
                    </div>
                  </li>
                }
              </ol>
            </div>
          </app-card>
        }

      

        <!-- Mes missions -->
        <div class="flex flex-col gap-3">
          <h2 class="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
            Mes missions
          </h2>

          @if (chargementMissions()) {
            <p class="text-xs text-ink-muted animate-pulse">Chargement des missions...</p>
          } @else if (missions().length === 0) {
            <p class="text-xs text-ink-muted italic">Aucune mission en cours.</p>
          } @else {
            <div class="space-y-2">
              @for (m of missions(); track m.id) {
                <a
                  [routerLink]="['/entrepreneur/missions', m.id]"
                  class="flex items-center justify-between gap-4 p-4 rounded-xl border border-line/60 bg-surface hover:border-accent/40 transition-all group shadow-xs"
                >
                  <div class="min-w-0">
                    <p class="text-xs sm:text-sm font-bold text-ink group-hover:text-accent truncate transition-colors">
                      {{ m.titre }}
                    </p>
                    @if (m.dateEcheance) {
                      <p class="text-[11px] text-ink-muted mt-0.5">
                        Échéance : {{ m.dateEcheance }}
                      </p>
                    }
                  </div>

                  <div class="flex items-center gap-2 shrink-0">
                    <app-badge [status]="statutBadge(m.statut)" size="sm">
                      {{ m.statut }}
                    </app-badge>
                    <app-icon name="arrow-right" class="size-4 text-ink-muted group-hover:text-accent transition-colors" />
                  </div>
                </a>
              }
            </div>
          }
        </div>

       
      }
    </div>
  `,
})
export class MonParcours implements OnInit {
  private readonly monParcoursService = inject(MonParcoursService);
  private readonly cohorteService = inject(CohorteService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly meetingService = inject(MeetingService);
  private readonly ressourceService = inject(RessourceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | null>(null);
  protected readonly parcours = signal<Parcours | null>(null);
  protected readonly missions = signal<MissionResponse[]>([]);
  protected readonly historique = signal<ParticipationCohorteResponse[]>([]);
  protected readonly reunions = signal<Meeting[]>([]);
  protected readonly ressources = signal<Ressource[]>([]);

  protected readonly chargement = signal(true);
  protected readonly chargementMissions = signal(false);

  protected readonly prochaineReunion = computed<Meeting | null>(() => {
    const now = new Date();
    const futures = this.reunions()
      .filter((r) => new Date(r.scheduledAt) > now && r.status === 'PLANNED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return futures[0] ?? null;
  });

  protected readonly phasesSorted = computed(() =>
    [...(this.parcours()?.phases ?? [])].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0)),
  );

  protected readonly nbPhasesTerminees = computed(
    () => this.phasesSorted().filter((ph) => this.etatPhase(ph) === 'passee').length,
  );

  protected readonly phaseActuelle = computed<Phase | null>(() => {
    const p = this.projet();
    if (!p?.phaseId) return null;
    return this.phasesSorted().find((phase) => phase.id === p.phaseId) ?? null;
  });

  protected etatPhase(phase: Phase): 'passee' | 'actuelle' | 'avenir' {
    const p = this.projet();
    if (p?.phaseOrdre == null) return 'avenir';
    if (phase.id === p.phaseId) return 'actuelle';
    return 'avenir';
  }

  protected statutBadge(statut: string): BadgeStatus {
    const m: Record<string, BadgeStatus> = {
      VALIDE: 'success',
      EN_COURS: 'warning',
      A_FAIRE: 'neutral',
      A_REVOIR: 'danger',
      SOUMIS: 'warning',
    };
    return m[statut] ?? 'neutral';
  }

  ngOnInit(): void {
    this.monParcoursService
      .getMonProjet()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of(null)),
      )
      .subscribe((projet) => {
        this.projet.set(projet);
        this.chargement.set(false);

        if (!projet) return;

        const parcoursId = projet.parcoursId;

        if (parcoursId) {
          this.parcoursService
            .getParcoursById(parcoursId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (p) => this.parcours.set(p),
              error: () => {},
            });
        } else if (projet.cohorteId) {
          this.cohorteService
            .getCohorteById(projet.cohorteId)
            .pipe(
              takeUntilDestroyed(this.destroyRef),
              switchMap((c) =>
                c.parcoursId ? this.parcoursService.getParcoursById(c.parcoursId) : of(null),
              ),
            )
            .subscribe({
              next: (p) => this.parcours.set(p),
              error: () => {},
            });
        }

        this.chargementMissions.set(true);

        this.monParcoursService
          .getMesMissions()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (m) => {
              this.missions.set(m);
              this.chargementMissions.set(false);
            },
            error: () => this.chargementMissions.set(false),
          });

        this.monParcoursService
          .getHistorique()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (h) => this.historique.set(h),
            error: () => {},
          });

        this.meetingService
          .getMyMeetings()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (r) => this.reunions.set(r),
            error: () => {},
          });

        if (projet.cohorteId) {
          this.ressourceService
            .getByCohorte(projet.cohorteId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (r) => this.ressources.set(r),
              error: () => {},
            });
        }
      });
  }
}