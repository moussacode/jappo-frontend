import { Component, input, output, inject, signal, computed } from '@angular/core';
import { Etape } from '../../../core/models/parcours.model';
import { Icon, IconName } from '../icon/icon';
import { BadgeComponent } from '../badge/badge';
import { ButtonComponent } from '../button/button.component';
import { CardComponent } from '../card/card.component';
import { ProgressionService } from '../../../core/services/progression.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../modal/modal.component';

export type StatutEtape = 'VALIDEE' | 'ACTIVE' | 'VERROUILLEE';

@Component({
  selector: 'app-etape-timeline',
  standalone: true,
  imports: [Icon, BadgeComponent, ButtonComponent, CardComponent, ModalComponent],
  template: `
    <div class="space-y-4">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Progression du parcours</h2>
      </div>

      @if (loading()) {
        <p class="text-sm text-ink-muted animate-pulse">Chargement de la progression...</p>
      } @else if (etapes().length === 0) {
        <app-card padding="md">
          <p class="text-sm text-ink-muted text-center">Aucune étape disponible</p>
        </app-card>
      } @else {
        <div class="space-y-3">
          @for (etape of etapes(); track etape.id) {
            <app-card
              [padding]="'md'"
              [class]="getEtapeClasses(etape.statut || 'VERROUILLEE')"
              class="transition-all duration-200"
            >
              <div class="flex items-start gap-4">
                <!-- Icône d'état -->
                <div class="flex-shrink-0">
                  @switch (etape.statut || 'VERROUILLEE') {
                    @case ('VALIDEE') {
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                        <app-icon name="check" class="size-5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                    }
                    @case ('ACTIVE') {
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-accent/10 border-2 border-accent">
                        <app-icon name="check-circle" class="size-5 text-accent" />
                      </div>
                    }
                    @case ('VERROUILLEE') {
                      <div class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5">
                        <app-icon name="lock" class="size-5 text-gray-400 dark:text-gray-500" />
                      </div>
                    }
                  }
                </div>

                <!-- Contenu de l'étape -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-start justify-between gap-2">
                    <div class="flex-1">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold text-ink-muted">Étape {{ etape.ordre }}</span>
                        <app-badge [status]="getBadgeStatus(etape.statut || 'VERROUILLEE')" size="sm">
                          {{ getStatutLabel(etape.statut || 'VERROUILLEE') }}
                        </app-badge>
                      </div>
                      <h3 class="text-sm font-bold text-ink mb-1">{{ etape.nom }}</h3>
                      @if (etape.description) {
                        <p class="text-xs text-ink-muted line-clamp-2">{{ etape.description }}</p>
                      }
                    </div>

                    <!-- Bouton de validation (uniquement pour l'étape active et coach/admin) -->
                    @if ((etape.statut || 'VERROUILLEE') === 'ACTIVE' && peutValider()) {
                      <app-button
                        variant="primary"
                        size="sm"
                        (click)="ouvrirModalValidation(etape)"
                        [disabled]="validationEnCours()"
                      >
                        @if (validationEnCours()) {
                          Validation...
                        } @else {
                          Valider
                        }
                      </app-button>
                    }
                  </div>

                  <!-- Missions de l'étape active : on n'affiche que le compte réellement exposé par le DTO backend. -->
                  @if ((etape.statut || 'VERROUILLEE') === 'ACTIVE') {
                    <div class="mt-3 pt-3 border-t border-line/60">
                      @if (etape.missionIds && etape.missionIds.length > 0) {
                        <p class="text-[10px] font-semibold text-ink-muted uppercase mb-2">
                          {{ etape.missionIds.length }} mission(s) déclarée(s) pour cette étape
                        </p>
                      } @else {
                        <p class="text-[10px] font-semibold text-ink-muted uppercase mb-2">
                          Aucune mission déclarée pour cette étape
                        </p>
                        <p class="text-xs text-ink-muted">
                          Le DTO backend ne fournit pas de relation mission/étape détaillée pour reconstituer les missions d’une étape en frontend.
                        </p>
                      }
                    </div>
                  }

                  <!-- Indication pour étape verrouillée -->
                  @if ((etape.statut || 'VERROUILLEE') === 'VERROUILLEE') {
                    <p class="mt-2 text-xs text-ink-muted italic">
                      Validez l'étape précédente pour débloquer cette étape.
                    </p>
                  }
                </div>
              </div>
            </app-card>
          }
        </div>
      }
    </div>

    <!-- Modal de confirmation de validation -->
    @if (showValidationModal()) {
      <app-modal 
        title="Valider l'étape" 
        subtitle="Cette action est irréversible"
        [maxWidth]="'md'"
        (close)="fermerModalValidation()"
      >
        <div class="space-y-4">
          <p class="text-sm text-ink">
            Êtes-vous sûr de vouloir valider l'étape <strong>{{ etapeAValider()?.nom }}</strong> ?
          </p>
          <p class="text-xs text-ink-muted">
            Une fois validée, l'étape suivante sera débloquée pour cet entrepreneur.
          </p>
          <div class="flex justify-end gap-3 pt-4">
            <app-button variant="ghost" (click)="fermerModalValidation()">
              Annuler
            </app-button>
            <app-button 
              variant="primary" 
              (click)="confirmerValidation()"
              [disabled]="validationEnCours()"
            >
              @if (validationEnCours()) {
                Validation...
              } @else {
                Valider l'étape
              }
            </app-button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class EtapeTimelineComponent {
  private readonly progressionService = inject(ProgressionService);
  private readonly toastService = inject(ToastService);

  etapes = input.required<Etape[]>();
  progressionId = input.required<string>();
  peutValider = input<boolean>(false);

  validation = output<void>();

  loading = signal(false);
  validationEnCours = signal(false);
  showValidationModal = signal(false);
  etapeAValider = signal<Etape | null>(null);

  protected readonly getEtapeClasses = (statut: StatutEtape) => {
    const classes: Record<StatutEtape, string> = {
      VALIDEE: 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10',
      ACTIVE: 'border-accent bg-accent/5 shadow-sm',
      VERROUILLEE: 'border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/5 opacity-60'
    };
    return classes[statut];
  };

  protected readonly getBadgeStatus = (statut: StatutEtape): 'success' | 'info' | 'neutral' => {
    const status: Record<StatutEtape, 'success' | 'info' | 'neutral'> = {
      VALIDEE: 'success',
      ACTIVE: 'info',
      VERROUILLEE: 'neutral'
    };
    return status[statut];
  };

  protected readonly getStatutLabel = (statut: StatutEtape) => {
    const labels: Record<StatutEtape, string> = {
      VALIDEE: 'Validée',
      ACTIVE: 'Active',
      VERROUILLEE: 'Verrouillée'
    };
    return labels[statut];
  };

  protected ouvrirModalValidation(etape: Etape): void {
    this.etapeAValider.set(etape);
    this.showValidationModal.set(true);
  }

  protected fermerModalValidation(): void {
    this.showValidationModal.set(false);
    this.etapeAValider.set(null);
  }

  protected confirmerValidation(): void {
    if (!this.etapeAValider()) return;

    this.validationEnCours.set(true);

    this.progressionService.validerEtape(this.progressionId()).subscribe({
      next: () => {
        this.toastService.showSuccess('Étape validée avec succès');
        this.fermerModalValidation();
        this.validation.emit();
      },
      error: (error) => {
        const message = error.error?.message || 'Impossible de valider cette étape';
        this.toastService.showError(message);
        this.validationEnCours.set(false);
      },
      complete: () => {
        this.validationEnCours.set(false);
      }
    });
  }
}
