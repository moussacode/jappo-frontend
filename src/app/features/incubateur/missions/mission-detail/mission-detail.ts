import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';

import { Mission, StatutMission } from '../../../../core/models/mission.model';
import { LivrableResponse } from '../../../../core/models/livrable.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';

@Component({
  selector: 'app-mission-detail-incubateur',
  standalone: true,
  imports: [RouterLink, FormsModule, BadgeComponent, ButtonComponent, Icon, DatePipe],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a routerLink="/incubateur/missions" class="text-sm font-medium text-ink-muted hover:text-ink transition-colors">
        ← Missions
      </a>

      @if (mission(); as m) {
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-[24px] font-normal leading-[1.33] text-ink">{{ m.titre }}</h1>
            <app-badge [status]="statutBadge(m.statut).status">
              {{ statutBadge(m.statut).label }}
            </app-badge>
          </div>
          <p class="mt-1 text-sm text-ink-muted">
            Projet : <strong class="text-ink">{{ m.nomProjet || 'Non assigné' }}</strong>
            @if (m.dateEcheance) {
              · Échéance : {{ m.dateEcheance }}
            }
          </p>
        </div>

        <!-- Consignes -->
        <div class="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <h2 class="text-sm font-semibold text-ink">Consignes</h2>
          <p class="mt-2 text-sm text-ink-muted whitespace-pre-line">{{ m.description || 'Aucune consigne détaillée.' }}</p>
        </div>

        <!-- Livrables soumis (Support Multi-livrables) -->
        <div class="rounded-[var(--radius-card)] border border-line bg-surface p-5">
          <div class="flex items-center justify-between border-b border-line pb-3">
            <h2 class="text-sm font-semibold text-ink">Livrables soumis ({{ livrables().length }})</h2>
          </div>

          <div class="divide-y divide-line">
            @for (l of livrables(); track l.id) {
              <div class="py-4 flex flex-col gap-3 first:pt-3 last:pb-0">
                <div class="flex items-center justify-between gap-4">
                  <div class="flex flex-col min-w-0">
                    <span class="text-xs text-ink-muted">
                      Soumis le {{ l.dateDepot ? (l.dateDepot | date:'dd/MM/yyyy à HH:mm') : 'Date inconnue' }}
                    </span>
                    <a
                      [href]="l.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-sm text-accent font-medium hover:underline font-mono truncate"
                    >
                      {{ l.nom || l.url }} ↗
                    </a>
                  </div>

                  <span class="text-xs font-semibold" [class]="getStatutCouleur(l.statut)">
                    {{ getStatutLabel(l.statut) }}
                  </span>
                </div>

                @if (l.statut === 'EN_ATTENTE') {
                  <div class="flex flex-col gap-3 bg-surface-muted/30 p-3 rounded-xl border border-line">
                    <textarea
                      [value]="commentaireSelectedId() === l.id ? commentaire() : ''"
                      (input)="surChangementCommentaire(l.id, $any($event.target).value)"
                      rows="2"
                      placeholder="Commentaire ou remarques de correction (obligatoire en cas de demande de correction)"
                      class="rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none focus:border-accent resize-none"
                    ></textarea>

                    <div class="flex gap-2 justify-end">
                      <button
                        type="button"
                        [disabled]="traitement()"
                        (click)="validerLivrable(l.id)"
                        class="rounded-[var(--radius-button)] bg-action-fill px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
                      >
                        Valider ce livrable
                      </button>

                      <button
                        type="button"
                        [disabled]="traitement() || !commentaire().trim() || commentaireSelectedId() !== l.id"
                        (click)="demanderCorrection(l.id)"
                        class="rounded-[var(--radius-button)] border border-line px-3 py-1.5 text-xs font-medium text-ink hover:bg-surface-muted disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Demander une correction
                      </button>
                    </div>
                  </div>
                } @else if (l.commentaireCoach) {
                  <p class="text-xs text-ink-muted italic bg-surface-muted/20 p-2.5 rounded-lg border border-line">
                    Remarque : {{ l.commentaireCoach }}
                  </p>
                }
              </div>
            } @empty {
              <p class="mt-3 text-sm text-ink-muted">Aucun livrable soumis pour le moment.</p>
            }
          </div>
        </div>
      } @else if (isLoading()) {
        <div class="p-8 text-center text-sm text-ink-muted">Chargement de la mission...</div>
      } @else {
        <div class="p-8 text-center text-sm text-ink-muted">Mission introuvable.</div>
      }
    </div>
  `,
})
export class MissionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly mission = signal<Mission | undefined>(undefined);
  protected readonly livrables = signal<LivrableResponse[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly commentaire = signal('');
  protected readonly commentaireSelectedId = signal<string | null>(null);
  protected readonly traitement = signal(false);

  ngOnInit(): void {
    if (!this.missionId) {
      this.isLoading.set(false);
      return;
    }

    this.chargerMissionEtLivrables();
  }

  private chargerMissionEtLivrables(): void {
    this.isLoading.set(true);
    console.log(this.missionId)

    // 1. Charger la mission
    this.missionService
      .getById(this.missionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        
        next: (m) => {
          this.mission.set(m);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement mission:', err);
          this.isLoading.set(false);
        },
      });

    // 2. Charger les livrables associés
    this.livrableService
      .getLivrablesByMission(this.missionId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => this.livrables.set(list || []),
        error: (err) => console.error('Erreur chargement livrables:', err),
      });
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_CONFIG[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  protected surChangementCommentaire(livrableId: string, valeur: string): void {
    this.commentaireSelectedId.set(livrableId);
    this.commentaire.set(valeur);
  }

  protected validerLivrable(livrableId: string): void {
    this.traitement.set(true);
    const comm = this.commentaireSelectedId() === livrableId ? this.commentaire() : undefined;

    this.livrableService
      .changerStatut(livrableId, 'VALIDE', comm)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.commentaire.set('');
          this.commentaireSelectedId.set(null);

          // Recharger les livrables et passer le statut de la mission à VALIDEE
          this.chargerMissionEtLivrables();
          this.missionService.updateStatut(this.missionId, 'VALIDEE').subscribe({
            next: (updatedMission) => this.mission.set(updatedMission),
          });
        },
        error: (err) => {
          console.error('Erreur validation livrable:', err);
          this.traitement.set(false);
        },
      });
  }

  protected demanderCorrection(livrableId: string): void {
    if (!this.commentaire().trim() || this.commentaireSelectedId() !== livrableId) return;

    this.traitement.set(true);

    this.livrableService
      .changerStatut(livrableId, 'A_CORRIGER', this.commentaire())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.commentaire.set('');
          this.commentaireSelectedId.set(null);

          // Recharger les livrables et passer le statut de la mission à A_CORRIGER
          this.chargerMissionEtLivrables();
          this.missionService.updateStatut(this.missionId, 'A_CORRIGER').subscribe({
            next: (updatedMission) => this.mission.set(updatedMission),
          });
        },
        error: (err) => {
          console.error('Erreur demande de correction:', err);
          this.traitement.set(false);
        },
      });
  }

  protected getStatutCouleur(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'text-success-600 font-bold';
      case 'A_CORRIGER':
        return 'text-danger-600 font-bold';
      case 'EN_ATTENTE':
        return 'text-warning-600 font-bold';
      default:
        return 'text-ink-muted';
    }
  }

  protected getStatutLabel(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return '✓ Validé';
      case 'A_CORRIGER':
        return '✗ Corrections demandées';
      case 'EN_ATTENTE':
        return '⏳ En attente de révision';
      default:
        return statut || 'Déposé';
    }
  }
}