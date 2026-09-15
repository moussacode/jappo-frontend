import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { LivrableResponse, StatutLivrable } from '../../../../core/models/livrable.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { STATUT_LIVRABLE_CONFIG } from '../../../../core/constants/statut-livrable.constant';

@Component({
  selector: 'app-mes-documents',
  standalone: true,
  imports: [RouterLink, BadgeComponent],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <h1 class="text-[24px] font-normal leading-[1.33] text-ink">Mes documents</h1>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12 text-sm text-ink-muted">
          Chargement de vos documents...
        </div>
      } @else if (livrables().length > 0) {
        <div class="rounded-[var(--radius-card)] border border-line bg-surface">
          @for (l of livrables(); track l.id) {
            <div class="flex flex-col gap-1.5 border-b border-line px-5 py-4 last:border-0">
              <div class="flex items-center justify-between gap-2">
                <div class="min-w-0 flex flex-col gap-0.5">
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-sm font-medium text-ink truncate">{{ l.nom || l.url }}</p>
                    <span class="inline-flex items-center rounded-md bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted border border-line">
                      V{{ l.numeroVersion || 1 }}
                    </span>
                  </div>
                  @if (l.titreMission) {
                    <a
                      [routerLink]="['/entrepreneur/missions', l.missionProjetId]"
                      class="text-xs text-ink-muted hover:text-accent hover:underline"
                    >
                      Mission : {{ l.titreMission }}
                    </a>
                  }
                </div>
                <app-badge [status]="statutConfig(l.statut).status">
                  {{ statutConfig(l.statut).label }}
                </app-badge>
              </div>

              @if (l.statut === 'A_CORRIGER') {
                <div class="mt-1 flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/20 p-2.5 text-xs text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                  <span>{{ l.motifRefus || 'Des modifications sont demandées par votre coach.' }}</span>
                  <a
                    [routerLink]="['/entrepreneur/missions', l.missionProjetId]"
                    class="font-semibold text-accent hover:underline shrink-0 ml-2"
                  >
                    Déposer V{{ (l.numeroVersion || 1) + 1 }} ↗
                  </a>
                </div>
              }

              @if (l.note !== undefined && l.note !== null) {
                <p class="text-xs text-ink-muted">
                  Note du coach : <span class="font-medium text-ink">{{ l.note }}/20</span>
                </p>
              }
              @if (l.commentaireCoach && l.statut !== 'A_CORRIGER') {
                <p class="text-xs text-ink-muted italic">"{{ l.commentaireCoach }}"</p>
              }
            </div>
          }
        </div>
      } @else {
        <div class="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center">
          <p class="text-sm font-medium text-ink">Aucun document déposé pour le moment</p>
          <p class="mt-1 text-xs text-ink-muted">
            Vos fichiers et liens soumis pour vos missions apparaîtront ici.
          </p>
        </div>
      }
    </div>
  `,
})
export class MesDocuments implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal(true);
  protected readonly livrables = signal<LivrableResponse[]>([]);

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLoading.set(false);
      return;
    }

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projet) => {
          this.livrableService
            .getLivrablesByProjet(projet.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (livrables) => {
                this.livrables.set(livrables);
                this.isLoading.set(false);
              },
              error: () => this.isLoading.set(false),
            });
        },
        error: () => this.isLoading.set(false),
      });
  }

  protected statutConfig(statut: string) {
    return STATUT_LIVRABLE_CONFIG[statut as StatutLivrable] ?? { status: 'neutral' as const, label: statut };
  }
}