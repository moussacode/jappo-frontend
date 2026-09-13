import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';


import {  Router } from '@angular/router';
// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { Mission, StatutMission } from '../../../../core/models/mission.model';
import { LivrableResponse } from '../../../../core/models/livrable.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';

// Design System Partagé
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-mission-detail-incubateur',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    DatePipe,
    BadgeComponent,
    ButtonComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- Bouton Retour -->
      <div>
        <a
          routerLink="/incubateur/missions"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink cursor-pointer"
        >
          <app-icon name="arrow-left" class="size-3.5" />
          <span>Retour aux missions</span>
        </a>
      </div>

      @if (mission(); as m) {
        
        <!-- En-tête de la Mission -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">{{ m.titre }}</h1>
            <app-badge [status]="statutBadge(m.statut).status" size="md">
              {{ statutBadge(m.statut).label }}
            </app-badge>
            <button
  type="button"
  (click)="supprimerMission()"
  class="text-xs font-semibold text-danger hover:underline shrink-0"
>
  Supprimer
</button>
          </div>
          
          <div class="flex items-center gap-3 text-xs text-ink-muted">
            <span>Projet associé : <strong class="text-ink font-semibold">{{ m.nomProjet || 'Non assigné' }}</strong></span>
            @if (m.dateEcheance) {
              <span>·</span>
              <span class="flex items-center gap-1">
                <app-icon name="calendar" class="size-3.5" />
                <span>Échéance : {{ m.dateEcheance }}</span>
              </span>
            }
          </div>
        </div>

        <!-- Consignes & Description -->
        <app-card padding="lg" class="flex flex-col gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Consignes & Attentes</h2>
          <p class="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line">
            {{ m.description || 'Aucune consigne détaillée pour cette mission.' }}
          </p>
        </app-card>

        <!-- Livrables soumis (Support Multi-livrables) -->
        <app-card padding="none" class="overflow-hidden shadow-xs">
          <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
            <h2 class="text-sm font-bold text-ink">Livrables soumis ({{ livrables().length }})</h2>
          </div>

          <div class="divide-y divide-line">
            @for (l of livrables(); track l.id) {
              <div class="p-6 flex flex-col gap-4 transition-colors hover:bg-surface-muted/20">
                
                <!-- Infos Fichier & Statut -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-muted border border-line text-ink-muted">
                      <app-icon name="missions" class="size-4" />
                    </div>
                    <div class="flex flex-col min-w-0">
                      <a
                         href="javascript:void(0)"
  (click)="ouvrirLivrable(l)"
  class="text-xs sm:text-sm text-accent font-semibold hover:underline truncate cursor-pointer"
>
  {{ l.nom || l.url }} ↗
</a>
                      <span class="text-[11px] text-ink-muted">
                        Soumis le {{ l.dateDepot ? (l.dateDepot | date:'dd/MM/yyyy à HH:mm') : 'Récemment' }}
                      </span>
                    </div>
                  </div>

                  <span class="text-xs font-semibold px-2.5 py-1 rounded-lg self-start sm:self-auto" [class]="getStatutStyle(l.statut)">
                    {{ getStatutLabel(l.statut) }}
                    @if (l.statut === 'EN_ATTENTE') {
  <button
    type="button"
    (click)="supprimerLivrable(l)"
    class="text-[11px] font-semibold text-danger hover:underline shrink-0"
    title="Supprimer ce livrable"
  >
    Supprimer
  </button>
}
                  </span>
                </div>

                <!-- Section d'évaluation (Si en attente) -->
                @if (l.statut === 'EN_ATTENTE') {
                  <div class="flex flex-col gap-3 bg-surface-muted/50 p-4 rounded-xl border border-line mt-1">
                    <textarea
                      [value]="commentaireSelectedId() === l.id ? commentaire() : ''"
                      (input)="surChangementCommentaire(l.id, $any($event.target).value)"
                      rows="2"
                      placeholder="Ajouter une remarque ou des consignes de correction (obligatoire si vous demandez une modification)..."
                      class="rounded-xl border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:border-accent resize-none transition-colors"
                    ></textarea>

                    <div class="flex items-center justify-end gap-2">
                      <!-- <app-button
                        type="button"
                        /* variant="outline" */
                        size="xs"
                        [disabled]="traitement() || !commentaire().trim() || commentaireSelectedId() !== l.id"
                        (click)="demanderCorrection(l.id)"
                      >
                        Demander une correction
                      </app-button> -->

                      <app-button
                        type="button"
                        size="xs"
                        [disabled]="traitement()"
                        (click)="validerLivrable(l.id)"
                      >
                        {{ traitement() ? 'Traitement...' : 'Valider ce livrable' }}
                      </app-button>
                    </div>
                  </div>
                } @else if (l.commentaireCoach) {
                  <!-- Remarque laissée précédemment -->
                  <div class="flex items-start gap-2.5 bg-surface-muted/40 p-3.5 rounded-xl border border-line text-xs text-ink-muted">
                    <span class="text-accent font-bold">Coach :</span>
                    <p class="leading-relaxed italic">{{ l.commentaireCoach }}</p>
                  </div>
                }

              </div>
            } @empty {
              <div class="p-12 text-center flex flex-col items-center justify-center">
                <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line">
                  <app-icon name="missions" class="size-5" />
                </div>
                <p class="text-xs font-semibold text-ink">Aucun livrable soumis</p>
                <p class="text-[11px] text-ink-muted mt-0.5">L'entrepreneur n'a pas encore versé de fichier pour cette mission.</p>
              </div>
            }
          </div>
        </app-card>

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
export class MissionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
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

  ouvrirLivrable(l: LivrableResponse): void {
  this.livrableService.ouvrirFichier(l.url);
}

  protected supprimerMission(): void {
  const m = this.mission();
  if (!m) return;
  if (!confirm(`Supprimer la mission "${m.titre}" pour ce projet ?`)) return;

  this.missionService.deleteMission(m.id).subscribe({
    next: () => this.router.navigate(['/incubateur/missions']),
    error: (err) => console.error('Erreur lors de la suppression de la mission:', err),
  });
}

protected supprimerLivrable(livrable: LivrableResponse): void {
  if (!confirm(`Supprimer le livrable "${livrable.nom}" ?`)) return;

  this.livrableService.deleteLivrable(livrable.id).subscribe({
    next: () => {
      this.livrables.update((liste) => liste.filter((l) => l.id !== livrable.id));
    },
    error: (err) => console.error('Erreur lors de la suppression du livrable:', err),
  });
}
  private chargerMissionEtLivrables(): void {
    this.isLoading.set(true);

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
    const commentaireCoach = this.commentaireSelectedId() === livrableId ? this.commentaire() : undefined;

    // Utilisation correcte du DTO attendu par le service frontend
    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'VALIDE',
        commentaireCoach: commentaireCoach || undefined
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.commentaire.set('');
          this.commentaireSelectedId.set(null);

          // Recharge les données pour synchroniser l'UI
          this.chargerMissionEtLivrables();
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
    const commentaireCoach = this.commentaire();

    // Utilisation de evaluerLivrable avec le statut A_CORRIGER
    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'A_CORRIGER',
        commentaireCoach: commentaireCoach
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.commentaire.set('');
          this.commentaireSelectedId.set(null);

          // Recharge les données pour synchroniser l'UI
          this.chargerMissionEtLivrables();
        },
        error: (err) => {
          console.error('Erreur demande de correction:', err);
          this.traitement.set(false);
        },
      });
  }

  protected getStatutStyle(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20';
      case 'A_CORRIGER':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      case 'EN_ATTENTE':
        return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20';
      default:
        return 'bg-surface-muted text-ink-muted border border-line';
    }
  }

  protected getStatutLabel(statut?: string): string {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'Validé';
      case 'A_CORRIGER':
        return 'Corrections demandées';
      case 'EN_ATTENTE':
        return 'En attente de révision';
      default:
        return statut || 'Déposé';
    }
  }
}