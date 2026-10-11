import { Component, inject, signal, computed, DestroyRef, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { LoadingState } from '../../../shared/components/loading-state/loading-state';
import { Icon } from '../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../shared/components/badge/badge';
import { CardComponent } from '../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state';
import { TabFilterComponent, TabOption } from '../../../shared/components/tab-filter/tab-filter.component';

import { MonParcoursService } from '../../../core/services/mon-parcours.service';
import { ProgressionService } from '../../../core/services/progression.service';
import { MeetingService } from '../../../core/services/meeting.service';
import { RessourceService } from '../../../core/services/ressource.service';

import {
  MissionResponse,
  ParticipationCohorteResponse,
  Projet,
} from '../../../core/models';
import { FeuilleRouteProjet } from '../../../core/models/parcours.model';

import { Meeting } from '../../../core/models/meeting.model';
import { Ressource } from '../../../core/models/ressource.model';
import { ParcoursProgressComponent } from '../../../shared/components/parcours-progress/parcours-progress.component';

type FiltreMissions = 'TOUTES' | 'A_FAIRE' | 'SOUMISES' | 'VALIDEES';

/** Missions sur lesquelles l'entrepreneur doit encore agir. */
const STATUTS_A_TRAITER = ['A_FAIRE', 'EN_COURS', 'A_REVOIR'];

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
    ButtonComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    TabFilterComponent,
    ParcoursProgressComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      @if (chargement()) {
        <app-loading-state message="Chargement de votre parcours..." />
      }

      <!-- Pas encore de projet -->
      @if (!chargement() && !projet()) {
        <app-card padding="none">
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

        <!-- En-tête -->
        <app-page-header [title]="p.nom" [subtitle]="soustitre(p)" />

        <!-- ─── HAUT DE PAGE : prochaine étape + progression des missions ─── -->
        @if (chargementMissions()) {
          <app-loading-state message="Chargement des missions..." />
        } @else {
          <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">

            <!-- Prochaine étape : la seule chose à faire maintenant -->
            <section
              class="rounded-card border border-accent/30 bg-accent-soft p-5 sm:p-6 lg:col-span-2"
              aria-label="Prochaine mission"
            >
              @if (prochaineMission(); as m) {
                <p class="text-xs font-semibold uppercase tracking-wide text-accent">
                  {{ m.statut === 'A_REVOIR' ? 'À corriger en priorité' : 'Votre prochaine étape' }}
                </p>
                <h2 class="mt-2 text-lg font-semibold text-ink sm:text-xl">{{ m.titre }}</h2>
                <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                  <app-badge [status]="statutBadge(m.statut)" size="sm">{{ libelleStatut(m.statut) }}</app-badge>
                  @if (m.dateEcheance) {
                    <span [class]="estEnRetard(m) ? 'font-medium text-danger' : 'text-ink-muted'">
                      {{ libelleEcheance(m) }} · {{ m.dateEcheance | date:'dd/MM/yyyy' }}
                    </span>
                  }
                </div>
                <div class="mt-5">
                  <app-button size="sm" [routerLink]="['/entrepreneur/missions', m.id]">
                    {{ m.statut === 'A_REVOIR' ? 'Corriger la mission' : 'Ouvrir la mission' }}
                    <app-icon name="arrow-right" class="ml-1.5 size-4" />
                  </app-button>
                </div>
              } @else {
                <div class="flex items-start gap-3">
                  <span class="flex size-10 shrink-0 items-center justify-center rounded-button bg-surface text-accent">
                    <app-icon name="check" class="size-5" />
                  </span>
                  <div>
                    <h2 class="text-lg font-semibold text-ink">Tout est à jour</h2>
                    <p class="mt-1 text-sm text-ink-muted">
                      {{ missions().length === 0
                        ? "Aucune mission ne vous a encore été assignée. Elles apparaîtront ici dès qu'elles seront disponibles."
                        : "Vous n'avez aucune mission à traiter pour le moment." }}
                    </p>
                  </div>
                </div>
              }
            </section>

            <!-- Progression des missions -->
            <app-card padding="lg">
              <p class="text-xs font-semibold uppercase tracking-wide text-ink-muted">Mes missions</p>
              <p class="mt-2 text-3xl font-bold tracking-tight text-ink">
                {{ missionsValidees() }}<span class="text-lg font-medium text-ink-faint">/{{ missions().length }}</span>
              </p>
              <p class="text-xs text-ink-muted">validées</p>
              <div
                class="mt-4 h-2 overflow-hidden rounded-pill bg-line"
                role="progressbar"
                aria-label="Missions validées"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="pourcentageValidees()"
              >
                <div class="h-full rounded-pill bg-accent transition-[width] duration-500 ease-out motion-reduce:transition-none"
                     [style.width.%]="pourcentageValidees()"></div>
              </div>
              <p class="mt-3 text-xs text-ink-muted">
                {{ missionsActives().length }} à traiter · {{ missionsSoumises() }} en évaluation
              </p>
            </app-card>
          </div>
        }

        <!-- ─── CORPS : colonne principale + colonne latérale ─── -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">

          <div class="flex min-w-0 flex-col gap-8 lg:col-span-2">

            <!-- Mon chemin -->
            <section class="flex flex-col gap-3" aria-label="Mon chemin de progression">
              <h2 class="text-base font-semibold text-ink">Mon chemin</h2>
              @if (chargementFeuilleRoute()) {
                <app-loading-state message="Chargement de votre chemin de progression..." />
              } @else if (erreurFeuilleRoute()) {
                <div role="alert" class="flex flex-col gap-3 rounded-card border border-warning/40 bg-warning/10 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-sm text-ink">{{ erreurFeuilleRoute() }}</p>
                  <app-button variant="secondary" size="sm" (click)="chargerFeuilleRoute(p.id)">Réessayer</app-button>
                </div>
              } @else {
                <app-parcours-progress [feuilleRoute]="feuilleRoute()" />
              }
            </section>

            <!-- Mes missions -->
            <section class="flex flex-col gap-3" aria-label="Mes missions">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 class="text-base font-semibold text-ink">Mes missions</h2>
                @if (!chargementMissions() && missions().length > 0) {
                  <app-tab-filter
                    [options]="optionsFiltreMissions()"
                    [value]="filtreMissions()"
                    (valueChange)="onFiltreMissionsChange($event)"
                  />
                }
              </div>

              @if (chargementMissions()) {
                <app-loading-state message="Chargement des missions..." />
              } @else if (missions().length === 0) {
                <app-empty-state
                  iconName="missions"
                  title="Aucune mission en cours"
                  description="Vos missions apparaîtront ici dès qu'elles vous seront assignées."
                />
              } @else if (missionsFiltrees().length === 0) {
                <p class="rounded-card border border-dashed border-line-strong bg-surface p-6 text-center text-sm text-ink-muted">
                  Aucune mission dans cette catégorie.
                </p>
              } @else {
                <ul class="flex flex-col gap-2">
                  @for (m of missionsFiltrees(); track m.id) {
                    <li>
                      <a
                        [routerLink]="['/entrepreneur/missions', m.id]"
                        class="group flex items-center justify-between gap-4 rounded-card border border-line bg-surface p-4 transition-colors hover:border-line-strong hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      >
                        <div class="flex min-w-0 items-center gap-3">
                          <span
                            class="flex size-9 shrink-0 items-center justify-center rounded-button"
                            [class]="estEnRetard(m) || m.statut === 'A_REVOIR'
                              ? 'bg-danger/10 text-danger'
                              : m.statut === 'VALIDE' ? 'bg-accent-soft text-accent' : 'bg-surface-subtle text-ink-muted'"
                          >
                            <app-icon [name]="iconeMission(m)" class="size-4" />
                          </span>
                          <div class="min-w-0">
                            <p class="truncate text-sm font-semibold text-ink transition-colors group-hover:text-accent">{{ m.titre }}</p>
                            @if (m.dateEcheance) {
                              <p class="mt-0.5 text-xs" [class]="estEnRetard(m) ? 'font-medium text-danger' : 'text-ink-muted'">
                                @if (m.statut !== 'VALIDE' && m.statut !== 'SOUMIS') {
                                  {{ libelleEcheance(m) }} ·
                                }
                                Échéance : {{ m.dateEcheance | date:'dd/MM/yyyy' }}
                              </p>
                            }
                          </div>
                        </div>

                        <div class="flex shrink-0 items-center gap-2">
                          <app-badge [status]="statutBadge(m.statut)" size="sm">{{ libelleStatut(m.statut) }}</app-badge>
                          <app-icon name="arrow-right" class="size-4 text-ink-faint transition-colors group-hover:text-accent" />
                        </div>
                      </a>
                    </li>
                  }
                </ul>
              }
            </section>
          </div>

          <!-- Colonne latérale -->
          <aside class="flex min-w-0 flex-col gap-4" aria-label="Réunions et ressources">

            <!-- Prochaine réunion -->
            <app-card padding="md">
              <h2 class="mb-3 text-sm font-semibold text-ink">Prochaine réunion</h2>
              @if (prochaineReunion(); as r) {
                <div class="flex items-start gap-3">
                  <span class="flex size-9 shrink-0 items-center justify-center rounded-button bg-accent-soft text-accent">
                    <app-icon name="calendar" class="size-4" />
                  </span>
                  <div class="min-w-0">
                    <p class="truncate text-sm font-medium text-ink">{{ r.title }}</p>
                    <p class="mt-0.5 text-xs text-ink-muted">
                      {{ r.scheduledAt | date:'dd/MM/yyyy à HH:mm' }} · {{ r.durationMinutes }} min
                    </p>
                  </div>
                </div>
                <div class="mt-4">
                  <app-button variant="secondary" size="sm" [fullWidthMobile]="true" [routerLink]="['/entrepreneur/reunions', r.id]">
                    Rejoindre
                  </app-button>
                </div>
              } @else {
                <p class="text-sm text-ink-muted">Aucune réunion planifiée.</p>
                <a routerLink="/entrepreneur/reunions"
                   class="mt-2 inline-block rounded-input text-xs font-medium text-accent hover:text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                  Voir mes réunions
                </a>
              }
            </app-card>

            <!-- Ressources de la cohorte -->
            @if (ressources().length > 0) {
              <app-card padding="md">
                <h2 class="mb-3 text-sm font-semibold text-ink">Ressources</h2>
                <ul class="flex flex-col gap-1">
                  @for (r of ressources().slice(0, 5); track r.id) {
                    <li>
                      @if (r.url) {
                        <a
                          [href]="r.url" target="_blank" rel="noopener noreferrer"
                          class="group flex items-center gap-3 rounded-button p-2 transition-colors hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <span class="flex size-8 shrink-0 items-center justify-center rounded-button bg-surface-subtle text-ink-muted group-hover:bg-accent-soft group-hover:text-accent">
                            <app-icon [name]="r.type === 'LIEN' ? 'external-link' : 'file'" class="size-4" />
                          </span>
                          <span class="min-w-0 truncate text-sm font-medium text-ink group-hover:text-accent">{{ r.titre }}</span>
                        </a>
                      } @else {
                        <div class="flex items-center gap-3 p-2">
                          <span class="flex size-8 shrink-0 items-center justify-center rounded-button bg-surface-subtle text-ink-muted">
                            <app-icon name="file" class="size-4" />
                          </span>
                          <span class="min-w-0 truncate text-sm font-medium text-ink">{{ r.titre }}</span>
                        </div>
                      }
                    </li>
                  }
                </ul>
                @if (ressources().length > 5) {
                  <p class="mt-2 px-2 text-xs text-ink-muted">+ {{ ressources().length - 5 }} autre(s) ressource(s)</p>
                }
              </app-card>
            }
          </aside>
        </div>
      }
    </div>
  `,
})
export class MonParcours implements OnInit {
  private readonly monParcoursService = inject(MonParcoursService);
  private readonly progressionService = inject(ProgressionService);
  private readonly meetingService = inject(MeetingService);
  private readonly ressourceService = inject(RessourceService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | null>(null);
  protected readonly feuilleRoute = signal<FeuilleRouteProjet | null>(null);
  protected readonly missions = signal<MissionResponse[]>([]);
  protected readonly historique = signal<ParticipationCohorteResponse[]>([]);
  protected readonly reunions = signal<Meeting[]>([]);
  protected readonly ressources = signal<Ressource[]>([]);

  protected readonly chargement = signal(true);
  protected readonly chargementMissions = signal(false);
  protected readonly chargementFeuilleRoute = signal(false);
  protected readonly erreurFeuilleRoute = signal<string | null>(null);

  protected readonly filtreMissions = signal<FiltreMissions>('TOUTES');

  protected readonly prochaineReunion = computed<Meeting | null>(() => {
    const now = new Date();
    const futures = this.reunions()
      .filter((r) => new Date(r.scheduledAt) > now && r.status === 'PLANNED')
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

    return futures[0] ?? null;
  });

  // --- Missions : regroupements et mise en avant ---

  protected readonly missionsActives = computed(() =>
    this.missions().filter((m) => STATUTS_A_TRAITER.includes(m.statut)),
  );
  protected readonly missionsSoumises = computed(
    () => this.missions().filter((m) => m.statut === 'SOUMIS').length,
  );
  protected readonly missionsValidees = computed(
    () => this.missions().filter((m) => m.statut === 'VALIDE').length,
  );
  protected readonly pourcentageValidees = computed(() => {
    const total = this.missions().length;
    return total > 0 ? Math.round((this.missionsValidees() / total) * 100) : 0;
  });

  /** Mission à traiter en premier : à corriger d'abord, puis l'échéance la plus proche. */
  protected readonly prochaineMission = computed<MissionResponse | null>(() => {
    const actives = [...this.missionsActives()];
    actives.sort((a, b) => {
      const aRevoirA = a.statut === 'A_REVOIR' ? 0 : 1;
      const aRevoirB = b.statut === 'A_REVOIR' ? 0 : 1;
      if (aRevoirA !== aRevoirB) return aRevoirA - aRevoirB;
      const dateA = a.dateEcheance ? new Date(a.dateEcheance).getTime() : Number.MAX_SAFE_INTEGER;
      const dateB = b.dateEcheance ? new Date(b.dateEcheance).getTime() : Number.MAX_SAFE_INTEGER;
      return dateA - dateB;
    });
    return actives[0] ?? null;
  });

  protected readonly optionsFiltreMissions = computed<TabOption[]>(() => {
    const liste = this.missions();
    const compter = (f: FiltreMissions) => liste.filter((m) => this.correspondAuFiltre(m, f)).length;
    return [
      { label: 'Toutes', value: 'TOUTES', count: liste.length },
      { label: 'À faire', value: 'A_FAIRE', count: compter('A_FAIRE') },
      { label: 'Soumises', value: 'SOUMISES', count: compter('SOUMISES') },
      { label: 'Validées', value: 'VALIDEES', count: compter('VALIDEES') },
    ];
  });

  protected readonly missionsFiltrees = computed(() => {
    const filtre = this.filtreMissions();
    return this.missions().filter((m) => this.correspondAuFiltre(m, filtre));
  });

  protected onFiltreMissionsChange(value: string): void {
    this.filtreMissions.set(value as FiltreMissions);
  }

  private correspondAuFiltre(m: MissionResponse, filtre: FiltreMissions): boolean {
    switch (filtre) {
      case 'A_FAIRE': return STATUTS_A_TRAITER.includes(m.statut);
      case 'SOUMISES': return m.statut === 'SOUMIS';
      case 'VALIDEES': return m.statut === 'VALIDE';
      default: return true;
    }
  }

  // --- Libellés et échéances ---

  protected soustitre(p: Projet): string {
    const parts: string[] = ['Mon parcours'];
    if (p.nomParcours) parts.push(p.nomParcours);
    if (p.nomPhase) parts.push(`Phase : ${p.nomPhase}`);
    else if (p.nomCohorte) parts.push(`Cohorte : ${p.nomCohorte}`);
    return parts.join(' · ');
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

  protected libelleStatut(statut: string): string {
    const labels: Record<string, string> = {
      A_FAIRE: 'À faire',
      EN_COURS: 'En cours',
      SOUMIS: 'Soumise',
      VALIDE: 'Validée',
      A_REVOIR: 'À revoir',
    };
    return labels[statut] ?? statut;
  }

  protected iconeMission(m: MissionResponse): 'check' | 'warning' | 'missions' {
    if (m.statut === 'VALIDE') return 'check';
    if (m.statut === 'A_REVOIR' || this.estEnRetard(m)) return 'warning';
    return 'missions';
  }

  /** Nombre de jours avant l'échéance (négatif si dépassée), null si aucune échéance. */
  private joursAvantEcheance(m: MissionResponse): number | null {
    if (!m.dateEcheance) return null;
    const echeance = new Date(m.dateEcheance);
    echeance.setHours(0, 0, 0, 0);
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    return Math.round((echeance.getTime() - aujourdhui.getTime()) / 86_400_000);
  }

  protected estEnRetard(m: MissionResponse): boolean {
    const jours = this.joursAvantEcheance(m);
    return jours !== null && jours < 0 && m.statut !== 'VALIDE' && m.statut !== 'SOUMIS';
  }

  protected libelleEcheance(m: MissionResponse): string {
    const jours = this.joursAvantEcheance(m);
    if (jours === null) return '';
    if (jours < 0) return `En retard de ${-jours} j`;
    if (jours === 0) return "Aujourd'hui";
    if (jours === 1) return 'Demain';
    return `Dans ${jours} jours`;
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

        this.chargerFeuilleRoute(projet.id);

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

  protected chargerFeuilleRoute(projetId: string): void {
    this.chargementFeuilleRoute.set(true);
    this.erreurFeuilleRoute.set(null);

    this.progressionService
      .getFeuilleRouteProjet(projetId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (route) => {
          this.feuilleRoute.set(route);
          this.chargementFeuilleRoute.set(false);
        },
        error: (error) => {
          console.error('Erreur chargement du parcours de progression:', error);
          this.erreurFeuilleRoute.set(
            error?.error?.message ?? 'Impossible de charger votre parcours pour le moment.',
          );
          this.chargementFeuilleRoute.set(false);
        },
      });
  }
}