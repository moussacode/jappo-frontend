import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';

// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { MissionCohorteResponse, Mission, StatutMission } from '../../../../core/models/mission.model';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-mission-cohorte-detail',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    BadgeComponent,
    ButtonComponent,
    Icon,
    CardComponent,
    BreadcrumbComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-6xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- Fil d'Ariane Contextuel -->
      <app-breadcrumb [items]="breadcrumbItems()" />

      @if (missionCohorte(); as mc) {
        
        <!-- En-tête de la Mission de Cohorte -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">{{ mc.titre }}</h1>
              <div class="flex items-center gap-3 text-xs text-ink-muted mt-1.5 flex-wrap">
                <span>Cohorte : <strong class="text-ink font-semibold">{{ mc.nomCohorte || 'Non assignée' }}</strong></span>
                @if (mc.dateEcheance) {
                  <span>·</span>
                  <span class="flex items-center gap-1">
                    <app-icon name="calendar" class="size-3.5" />
                    <span>Échéance : {{ mc.dateEcheance }}</span>
                  </span>
                }
              </div>
            </div>

            <div class="flex items-center gap-2">
              <app-badge [status]="badgeStatusAgrege(mc)" size="md">
                {{ formaterStatutAgrege(mc) }}
              </app-badge>

              @if (!mc.verrouillee) {
                <button
                  type="button"
                  (click)="archiverMission()"
                  class="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline transition-colors p-1"
                  title="Archiver cette mission"
                >
                  Archiver
                </button>
              }
            </div>
          </div>
        </div>

        <!-- Bandeau de verrouillage -->
        @if (mc.verrouillee) {
          <div class="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
            <app-icon name="lock" class="size-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5"></app-icon>
            <div>
              <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">Mission verrouillée</p>
              <p class="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Cette mission ne peut plus être modifiée car un entrepreneur de la cohorte a déjà soumis son travail.
                @if (mc.dateVerrouillage) {
                  Verrouillée le {{ mc.dateVerrouillage | date:'dd/MM/yyyy à HH:mm' }}.
                }
              </p>
            </div>
          </div>
        }

        <!-- Consignes & Description -->
        <app-card padding="lg" class="flex flex-col gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Consignes & Attentes</h2>
          <p class="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line">
            {{ mc.description || 'Aucune consigne détaillée pour cette mission.' }}
          </p>
        </app-card>

        <!-- Statistiques Agrégées -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <app-card padding="md" class="text-center">
            <div class="text-2xl font-bold text-ink">{{ mc.nombreProjetsConcernes }}</div>
            <div class="text-xs text-ink-muted mt-1">Projets concernés</div>
          </app-card>
          <app-card padding="md" class="text-center">
            <div class="text-2xl font-bold text-emerald-600">{{ mc.nombreValides }}</div>
            <div class="text-xs text-ink-muted mt-1">Validés</div>
          </app-card>
          <app-card padding="md" class="text-center">
            <div class="text-2xl font-bold text-amber-600">{{ mc.nombreEnRevue }}</div>
            <div class="text-xs text-ink-muted mt-1">En revue</div>
          </app-card>
          <app-card padding="md" class="text-center">
            <div class="text-2xl font-bold text-brand">{{ calculerProgression(mc) }}%</div>
            <div class="text-xs text-ink-muted mt-1">Complétion</div>
          </app-card>
        </div>

        <!-- Tableau de suivi individuel par projet -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-ink">Suivi individuel par projet</h2>
              <p class="text-xs text-ink-muted">Progression de chaque entrepreneur pour cette mission</p>
            </div>
          </div>

          <div class="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
            <table class="w-full text-xs">
              <thead class="bg-surface-muted border-b border-line">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold text-ink">Projet</th>
                  <th class="px-4 py-3 text-left font-semibold text-ink">Entrepreneur</th>
                  <th class="px-4 py-3 text-center font-semibold text-ink">Statut</th>
                  <th class="px-4 py-3 text-center font-semibold text-ink">Progression</th>
                  <th class="px-4 py-3 text-right font-semibold text-ink">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (suivi of suivisIndividuels(); track suivi.id) {
                  <tr class="hover:bg-surface-muted/30 transition-colors">
                    <td class="px-4 py-3">
                      <div class="font-medium text-ink">{{ suivi.nomProjet || 'Projet inconnu' }}</div>
                    </td>
                    <td class="px-4 py-3">
                      <div class="text-ink-muted">{{ suivi.nomEntrepreneur || '-' }}</div>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <app-badge [status]="statutBadge(suivi.statut)" size="sm">
                        {{ formaterStatut(suivi.statut) }}
                      </app-badge>
                    </td>
                    <td class="px-4 py-3 text-center">
                      <div class="flex items-center justify-center gap-1">
                        <div class="w-16 h-2 bg-surface-muted rounded-full overflow-hidden">
                          <div 
                            class="h-full bg-brand" 
                            [style.width]="calculerProgressionIndividuelle(suivi) + '%'"
                          ></div>
                        </div>
                        <span class="text-[10px] text-ink-muted">{{ calculerProgressionIndividuelle(suivi) }}%</span>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <a 
                        routerLink="/incubateur/missions/{{ suivi.id }}"
                        class="text-accent font-semibold hover:underline"
                      >
                        Voir détail
                      </a>
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="px-4 py-8 text-center text-ink-muted">
                      Aucun suivi individuel trouvé pour cette mission
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

      } @else if (isLoading()) {
        <app-card padding="lg" class="animate-pulse flex flex-col gap-4 text-center py-12">
          <p class="text-xs text-ink-muted">Chargement des détails de la mission...</p>
        </app-card>
      } @else {
        <app-card padding="lg" class="text-center py-12">
          <h2 class="text-sm font-bold text-ink">Mission introuvable</h2>
          <p class="text-xs text-ink-muted mt-1">La mission demandée n'existe pas ou a été supprimée.</p>
          <a routerLink="/incubateur/missions" class="mt-4 inline-block text-xs font-semibold text-accent hover:underline">
            Retourner à la liste des missions
          </a>
        </app-card>
      }

    </div>
  `,
})
export class MissionCohorteDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly missionCohorteId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly missionCohorte = signal<MissionCohorteResponse | undefined>(undefined);
  protected readonly suivisIndividuels = signal<Mission[]>([]);
  protected readonly isLoading = signal<boolean>(true);

  protected readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const mc = this.missionCohorte();
    const items: BreadcrumbItem[] = [
      { label: 'Missions', url: '/incubateur/missions' },
    ];

    if (!mc) return items;

    if (mc.cohorteId && mc.nomCohorte) {
      items.push({
        label: mc.nomCohorte,
        url: '/incubateur/cohortes',
        queryParams: { cohorteId: mc.cohorteId },
      });
    }

    items.push({
      label: mc.titre,
    });

    return items;
  });

  ngOnInit(): void {
    if (!this.missionCohorteId) {
      this.isLoading.set(false);
      return;
    }

    this.chargerMissionCohorte();
  }

  private chargerMissionCohorte(): void {
    this.isLoading.set(true);

    // Récupérer toutes les missions agrégées pour trouver celle correspondante
    this.missionService
      .getMissionsCohorteAgregees()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (missions) => {
          const mission = missions.find(m => m.id === this.missionCohorteId);
          if (mission) {
            this.missionCohorte.set(mission);
            // Charger les suivis individuels via le endpoint dédié
            this.chargerSuivisIndividuels();
          } else {
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          console.error('Erreur chargement mission cohorte:', err);
          this.isLoading.set(false);
        },
      });
  }

  private chargerSuivisIndividuels(): void {
    this.missionService
      .getSuivisIndividuels(this.missionCohorteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (suivis) => {
          this.suivisIndividuels.set(suivis);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement suivis individuels:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected statutBadge(statut: StatutMission): BadgeStatus {
    switch (statut) {
      
      case 'VALIDE':
        return 'success';
      case 'SOUMIS':
      case 'A_REVOIR':
        return 'warning';
      case 'EN_COURS':
        return 'primary';
      case 'A_FAIRE':
      default:
        return 'neutral';
    }
  }

  protected formaterStatut(statut: StatutMission): string {
    switch (statut) {
      
      case 'VALIDE':
        return 'Validée';
      case 'SOUMIS':
        return 'Soumise';
      case 'A_REVOIR':
        return 'À revoir';
      case 'EN_COURS':
        return 'En cours';
      case 'A_FAIRE':
      default:
        return 'À faire';
    }
  }

  protected formaterStatutAgrege(mc: MissionCohorteResponse): string {
    if (mc.nombreValides === mc.nombreProjetsConcernes) {
      return 'Complétée';
    } else if (mc.nombreEnRevue > 0) {
      return 'En revue';
    } else if (mc.nombreEnRetard > 0) {
      return 'En retard';
    } else {
      return 'En cours';
    }
  }

  protected badgeStatusAgrege(mc: MissionCohorteResponse): BadgeStatus {
    if (mc.nombreValides === mc.nombreProjetsConcernes) {
      return 'success';
    } else if (mc.nombreEnRevue > 0) {
      return 'warning';
    } else if (mc.nombreEnRetard > 0) {
      return 'danger';
    } else {
      return 'primary';
    }
  }

  protected calculerProgression(mc: MissionCohorteResponse): number {
    if (mc.nombreProjetsConcernes === 0) return 0;
    return Math.round((mc.nombreValides / mc.nombreProjetsConcernes) * 100);
  }

  protected calculerProgressionIndividuelle(mission: Mission): number {
    // Calcul simplifié basé sur le statut
    switch (mission.statut) {
     
      case 'VALIDE':
        return 100;
      case 'SOUMIS':
      case 'A_REVOIR':
        return 75;
      case 'EN_COURS':
        return 50;
      case 'A_FAIRE':
      default:
        return 0;
    }
  }

  protected archiverMission(): void {
    if (!confirm('Archiver cette mission de cohorte et tous ses suivis individuels ?')) {
      return;
    }

    this.missionService
      .archiverMissionCohorte(this.missionCohorteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/incubateur/missions']);
        },
        error: (err) => {
          console.error('Erreur archivage mission:', err);
          alert('Erreur lors de l\'archivage de la mission');
        },
      });
  }
}
