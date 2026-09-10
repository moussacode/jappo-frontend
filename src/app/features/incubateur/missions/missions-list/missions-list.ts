import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import { MissionService } from '../../../../core/services/mission.service';
import { Mission, StatutMission, PrioriteMission } from '../../../../core/models/mission.model';
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';

export type FiltreStatutMission = 'TOUTES' | 'EN_COURS' | 'A_REVOIR' | 'VALIDEE';

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, BadgeComponent, DatePipe],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Missions & Jalons</h1>
          <p class="mt-1 text-xs text-ink-muted sm:text-sm">
            @if (isLoading()) {
              Chargement des missions...
            } @else {
              {{ missions().length }} mission(s) configurée(s)
            }
          </p>
        </div>

        <a
          routerLink="/incubateur/missions/nouvelle"
          class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-action-fill px-4 py-2.5 text-xs font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 cursor-pointer"
        >
          <app-icon name="plus" class="size-4 text-white" />
          <span>Nouvelle Mission</span>
        </a>
      </div>

      <!-- Barre d'outils (Filtres + Recherche) -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <!-- Onglets par statut -->
        <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-semibold shadow-xs">
          <button
            type="button"
            (click)="filtreStatut.set('TOUTES')"
            [class]="filtreStatut() === 'TOUTES' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            Toutes ({{ missions().length }})
          </button>
          <button
            type="button"
            (click)="filtreStatut.set('EN_COURS')"
            [class]="filtreStatut() === 'EN_COURS' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            En cours
          </button>
          <button
            type="button"
            (click)="filtreStatut.set('A_REVOIR')"
            [class]="filtreStatut() === 'A_REVOIR' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            À réviser
          </button>
          <button
            type="button"
            (click)="filtreStatut.set('VALIDEE')"
            [class]="filtreStatut() === 'VALIDEE' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            Validées
          </button>
        </div>

        <!-- Recherche réactive -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par titre, projet, responsable..."
            class="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-2.5 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="h-36 rounded-2xl bg-line/40"></div>
          }
        </div>
      } @else {

        <!-- LISTE EN GRILLE NOTION STYLE -->
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          @for (m of missionsFiltrees(); track m.id) {
            <a
              [routerLink]="['/incubateur/missions', m.id]"
              class="group flex flex-col justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-[var(--shadow-subtle)] transition-all hover:border-accent/40 hover:shadow-md cursor-pointer"
            >
              <div class="flex flex-col gap-2 min-w-0">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[11px] font-semibold text-accent uppercase tracking-wider truncate">
                    {{ m.nomProjet ? 'Projet : ' + m.nomProjet : 'Cohorte générale' }}
                  </span>
                  
                  <div class="flex items-center gap-1.5">
                    @if (m.priorite) {
                      <app-badge [status]="badgePrioriteStatus(m.priorite)" size="sm">
                        {{ m.priorite }}
                      </app-badge>
                    }
                    <app-badge [status]="badgeStatus(m.statut)" size="sm">
                      {{ formaterStatut(m.statut) }}
                    </app-badge>
                  </div>
                </div>

                <h2 class="text-sm font-bold text-ink group-hover:text-accent transition-colors truncate">
                  {{ m.titre }}
                </h2>

                @if (m.description) {
                  <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {{ m.description }}
                  </p>
                }
              </div>

              <!-- Pied de carte -->
              <div class="flex flex-col gap-2 border-t border-line pt-3 text-[11px] text-ink-muted">
                <div class="flex items-center justify-between">
                  <span class="flex items-center gap-1">
                    <app-icon name="calendar" class="size-3.5" />
                    <span>Échéance : {{ m.dateEcheance ? (m.dateEcheance | date:'dd/MM/yyyy') : 'Aucune' }}</span>
                  </span>
                </div>

                @if (m.nomAssigneA) {
                  <div class="flex items-center gap-1 text-[11px] text-ink font-medium">
                    <span class="text-ink-muted">Assigné à :</span>
                    <span class="truncate">{{ m.nomAssigneA }}</span>
                  </div>
                }
              </div>
            </a>
          } @empty {
            <div class="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
              <div class="flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-3 border border-line">
                <app-icon name="missions" class="size-6" />
              </div>
              <h2 class="text-sm font-bold text-ink">Aucune mission trouvée</h2>
              <p class="mt-1 text-xs text-ink-muted max-w-sm">
                Ajustez votre recherche ou créez une nouvelle mission pour la promotion.
              </p>
            </div>
          }
        </div>

      }

    </div>
  `,
})
export class MissionsList implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly filtreStatut = signal<FiltreStatutMission>('TOUTES');

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  protected readonly missionsFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let liste = this.missions();

    if (filtre === 'EN_COURS') {
      liste = liste.filter((m) => m.statut === 'EN_COURS' || m.statut === 'A_FAIRE');
    } else if (filtre === 'A_REVOIR') {
      liste = liste.filter((m) => m.statut === 'EN_REVUE' || m.statut === 'A_CORRIGER');
    } else if (filtre === 'VALIDEE') {
      liste = liste.filter((m) => m.statut === 'VALIDEE' || (m.statut as string) === 'VALIDE');
    }

    if (term) {
      liste = liste.filter(
        (m) =>
          m.titre.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term) ||
          m.nomProjet?.toLowerCase().includes(term) ||
          m.nomAssigneA?.toLowerCase().includes(term)
      );
    }

    return liste;
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    this.chargerMissions();
  }

  private chargerMissions(): void {
    this.isLoading.set(true);
    this.missionService
      .getMissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.missions.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement missions:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected badgeStatus(statut: StatutMission): BadgeStatus {
    switch (statut) {
      case 'VALIDEE':
      case 'VALIDE' as any:
        return 'success';
      case 'EN_REVUE':
      case 'EN_COURS':
        return 'primary';
      case 'A_CORRIGER':
      case 'EN_RETARD':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected formaterStatut(statut: StatutMission): string {
    switch (statut) {
      case 'VALIDEE':
      case 'VALIDE' as any:
        return 'Validée';
      case 'EN_REVUE':
        return 'En revue';
      case 'EN_COURS':
        return 'En cours';
      case 'A_CORRIGER':
        return 'À corriger';
      case 'EN_RETARD':
        return 'En retard';
      default:
        return 'À faire';
    }
  }

  protected badgePrioriteStatus(priorite?: PrioriteMission): BadgeStatus {
    switch (priorite) {
      case 'URGENTE':
      case 'HAUTE':
        return 'danger';
      case 'MOYENNE':
        return 'warning';
      case 'BASSE':
      default:
        return 'neutral';
    }
  }
}