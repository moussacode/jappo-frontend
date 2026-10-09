import { Component, input, output, inject, signal, computed } from '@angular/core';
import { EtapeFeuilleRoute, FeuilleRouteProjet, StatutFeuilleRoute } from '../../../core/models/parcours.model';
import { BadgeComponent } from '../badge/badge';
import { ButtonComponent } from '../button/button.component';
import { CardComponent } from '../card/card.component';
import { ProgressionService } from '../../../core/services/progression.service';
import { ToastService } from '../../../core/services/toast.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-etape-timeline',
  standalone: true,
  imports: [BadgeComponent, ButtonComponent, CardComponent, ModalComponent],
  template: `
    <div class="space-y-5">
      @if (loading()) {
        <p class="text-sm text-ink-muted animate-pulse">Chargement de la progression...</p>
      } @else if (!feuilleRoute() || feuilleRoute()!.phases.length === 0) {
        <app-card padding="md">
          <p class="text-sm text-ink-muted text-center">Aucun parcours associé à ce projet.</p>
        </app-card>
      } @else {
        <header class="border-b border-line pb-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-base font-bold text-ink">{{ feuilleRoute()!.nomParcours || 'Feuille de route' }}</h2>
              @if (feuilleRoute()!.nomProgramme) {
                <p class="mt-1 text-xs text-ink-muted">Programme · {{ feuilleRoute()!.nomProgramme }}</p>
              }
            </div>
            @if (feuilleRoute()!.pourcentageAvancement !== null && feuilleRoute()!.pourcentageAvancement !== undefined) {
              <div class="min-w-32">
                <div class="flex justify-between text-xs"><span>Parcours</span><strong>{{ feuilleRoute()!.pourcentageAvancement }}%</strong></div>
                <div class="mt-1 h-1.5 rounded bg-surface-muted"><div class="h-1.5 rounded bg-accent" [style.width.%]="feuilleRoute()!.pourcentageAvancement"></div></div>
              </div>
            }
          </div>
        </header>

        @for (phase of feuilleRoute()!.phases; track phase.id) {
          <section class="space-y-3 border-b border-line pb-5 last:border-0">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <span class="text-xs font-semibold text-ink-muted">Phase {{ phase.ordre }}</span>
                  <h3 class="text-sm font-bold text-ink">{{ phase.nom }}</h3>
                  <app-badge [status]="badgeStatus(phase.statut)" size="sm">{{ statutLabel(phase.statut) }}</app-badge>
                </div>
                @if (phase.motif) { <p class="mt-1 text-xs text-ink-muted">{{ phase.motif }}</p> }
              </div>
              <span class="text-xs font-semibold text-ink-muted">{{ phase.pourcentageAvancement }}%</span>
            </div>
            <div class="h-1 rounded bg-surface-muted"><div class="h-1 rounded bg-accent" [style.width.%]="phase.pourcentageAvancement"></div></div>

            @for (etape of phase.etapes; track etape.id) {
              <app-card [padding]="'md'" [class]="stepClasses(etape.statut)" class="transition-colors">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="text-xs font-semibold text-ink-muted">Étape {{ etape.ordre }}</span>
                      <app-badge [status]="badgeStatus(etape.statut)" size="sm">{{ statutLabel(etape.statut) }}</app-badge>
                      @if (!etape.obligatoire) { <span class="text-[11px] text-ink-muted">Optionnelle</span> }
                    </div>
                    <h4 class="mt-1 text-sm font-bold text-ink">{{ etape.nom }}</h4>
                    @if (etape.description) { <p class="mt-1 text-xs text-ink-muted">{{ etape.description }}</p> }
                    @if (etape.motif) { <p class="mt-2 text-xs text-ink-muted">{{ etape.motif }}</p> }
                  </div>
                  @if (etape.statut === 'ACTIVE' && peutValider() && feuilleRoute()!.progressionId) {
                    <app-button variant="primary" size="sm" (click)="ouvrirModalValidation(etape)" [disabled]="validationEnCours()">
                      {{ validationEnCours() ? 'Validation...' : 'Valider' }}
                    </app-button>
                  }
                </div>
                <div class="mt-3 h-1 rounded bg-surface-muted"><div class="h-1 rounded bg-emerald-600" [style.width.%]="etape.pourcentageAvancement"></div></div>

                @if (etape.missions.length > 0) {
                  <div class="mt-3 divide-y divide-line/60 border-t border-line/60">
                    @for (mission of etape.missions; track mission.id) {
                      <div class="py-3">
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="text-sm font-semibold text-ink">{{ mission.titre }}</span>
                          <span class="text-[11px] text-ink-muted">{{ mission.origine === 'ETAPE' ? 'Mission d’étape' : 'Mission de cohorte' }}</span>
                          <app-badge [status]="badgeStatus(mission.statut)" size="sm">{{ statutLabel(mission.statut) }}</app-badge>
                        </div>
                        @if (mission.description) { <p class="mt-1 text-xs text-ink-muted">{{ mission.description }}</p> }
                        <div class="mt-3 grid gap-3 sm:grid-cols-2">
                          <div>
                            <h5 class="text-[11px] font-bold uppercase text-ink-muted">Livrables attendus</h5>
                            @if (mission.livrablesAttendus.length === 0) {
                              <p class="mt-1 text-xs text-ink-muted">Aucun attendu défini.</p>
                            } @else {
                              <ul class="mt-1 space-y-1">
                                @for (attendu of mission.livrablesAttendus; track attendu.id) {
                                  <li class="text-xs text-ink">{{ attendu.titre }} @if (attendu.obligatoire) { <span class="text-rose-600">· requis</span> }</li>
                                }
                              </ul>
                            }
                          </div>
                          <div>
                            <h5 class="text-[11px] font-bold uppercase text-ink-muted">Dépôts réels ({{ mission.livrablesDeposes.length }})</h5>
                            @if (mission.livrablesDeposes.length === 0) {
                              <p class="mt-1 text-xs text-ink-muted">Aucun dépôt pour cette mission.</p>
                            } @else {
                              <ul class="mt-1 space-y-1">
                                @for (depose of mission.livrablesDeposes; track depose.id) {
                                  <li class="flex flex-wrap items-center gap-2 text-xs text-ink">
                                    <span>{{ depose.nom }}</span>
                                    <app-badge [status]="badgeStatus(depose.statut)" size="sm">{{ statutLabel(depose.statut) }}</app-badge>
                                  </li>
                                }
                              </ul>
                            }
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                } @else {
                  <p class="mt-3 border-t border-line/60 pt-3 text-xs text-ink-muted">Aucune mission associée à cette étape.</p>
                }
              </app-card>
            }
          </section>
        }
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

  feuilleRoute = input<FeuilleRouteProjet | null>(null);
  peutValider = input<boolean>(false);

  validation = output<void>();

  loading = signal(false);
  validationEnCours = signal(false);
  showValidationModal = signal(false);
  etapeAValider = signal<EtapeFeuilleRoute | null>(null);

  protected readonly stepClasses = (statut: StatutFeuilleRoute) => {
    if (statut === 'VALIDEE' || statut === 'TERMINEE') return 'border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10';
    if (statut === 'ACTIVE') return 'border-accent bg-accent/5';
    if (statut === 'VERROUILLEE' || statut === 'ARCHIVEE') return 'border-gray-200 dark:border-white/5 bg-gray-50/50 dark:bg-white/5';
    return 'border-line bg-surface';
  };

  protected readonly badgeStatus = (status: StatutFeuilleRoute): 'success' | 'info' | 'neutral' | 'warning' | 'danger' => {
    if (status === 'VALIDEE' || status === 'TERMINEE' || status === 'VALIDE') return 'success';
    if (status === 'ACTIVE' || status === 'EN_COURS') return 'info';
    if (status === 'A_REVOIR' || status === 'INCOMPLETE') return 'danger';
    if (status === 'A_ACTIVER' || status === 'SOUMIS') return 'warning';
    return 'neutral';
  };

  protected readonly statutLabel = (status: StatutFeuilleRoute) => {
    const labels: Record<StatutFeuilleRoute, string> = {
      TERMINEE: 'Terminée', VALIDEE: 'Validée', EN_COURS: 'En cours', ACTIVE: 'Active', ACCESSIBLE: 'Accessible',
      A_ACTIVER: 'À activer', NON_DEMARREE: 'Non démarrée', VERROUILLEE: 'Verrouillée',
      INCOMPLETE: 'Incomplète', ARCHIVEE: 'Archivée', NON_ASSIGNEE: 'Non assignée',
      A_FAIRE: 'À faire', SOUMIS: 'Soumis', VALIDE: 'Validé', A_REVOIR: 'À revoir',
      EN_ATTENTE: 'En attente', A_CORRIGER: 'À corriger', REJETE: 'Rejeté'
    };
    return labels[status] ?? status;
  };

  protected ouvrirModalValidation(etape: EtapeFeuilleRoute): void {
    this.etapeAValider.set(etape);
    this.showValidationModal.set(true);
  }

  protected fermerModalValidation(): void {
    this.showValidationModal.set(false);
    this.etapeAValider.set(null);
  }

  protected confirmerValidation(): void {
    const progressionId = this.feuilleRoute()?.progressionId;
    if (!this.etapeAValider() || !progressionId) return;

    this.validationEnCours.set(true);

    this.progressionService.validerEtape(progressionId).subscribe({
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
