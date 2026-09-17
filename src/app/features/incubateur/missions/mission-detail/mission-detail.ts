import { Component, inject, signal, computed, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { CommonModule, DatePipe } from '@angular/common';

// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { Mission, StatutMission } from '../../../../core/models/mission.model';
import { LivrableResponse, StatutLivrable } from '../../../../core/models/livrable.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';
import { STATUT_LIVRABLE_CONFIG } from '../../../../core/constants/statut-livrable.constant';

// Design System Partagé
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';

interface CorrectionFormState {
  motif: string;
  pointsACorriger: string;
  ressourceRecommandee: string;
  dateEcheance: string;
  note?: number;
}

@Component({
  selector: 'app-mission-detail-incubateur',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule,
    CommonModule,
    BadgeComponent,
    ButtonComponent,
    Icon,
    CardComponent,
    BreadcrumbComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- Fil d'Ariane Contextuel -->
      <app-breadcrumb [items]="breadcrumbItems()" />

      @if (mission(); as m) {
        
        <!-- En-tête de la Mission -->
        <div class="flex flex-col gap-3">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">{{ m.titre }}</h1>
              <div class="flex items-center gap-3 text-xs text-ink-muted mt-1.5 flex-wrap">
                <span>Startup : <strong class="text-ink font-semibold">{{ m.nomProjet || 'Non assigné' }}</strong></span>
                @if (m.nomEntrepreneur) {
                  <span>·</span>
                  <span>Porteur : <strong class="text-ink font-semibold">{{ m.nomEntrepreneur }}</strong></span>
                }
                @if (m.nomCohorte) {
                  <span>·</span>
                  <span>Cohorte : {{ m.nomCohorte }}</span>
                }
                @if (m.dateEcheance) {
                  <span>·</span>
                  <span class="flex items-center gap-1">
                    <app-icon name="calendar" class="size-3.5" />
                    <span>Échéance mission : {{ m.dateEcheance }}</span>
                  </span>
                }
              </div>
            </div>

            <div class="flex items-center gap-2">
              <app-badge [status]="statutBadge(m.statut).status" size="md">
                {{ statutBadge(m.statut).label }}
              </app-badge>
              
              @if (!isEditMode()) {
                <app-button
                  type="button"
                  variant="secondary"
                  size="sm"
                  (click)="ouvrirEditMode()"
                >
                  <app-icon name="edit" class="size-3.5 mr-1" />
                  <span>Modifier</span>
                </app-button>
              }
            </div>
          </div>
        </div>

        @if (isEditMode()) {
          <!-- Formulaire de modification de mission -->
          <app-card padding="lg" class="flex flex-col gap-4">
            <div class="flex items-center justify-between border-b border-line pb-2.5">
              <h2 class="text-xs font-bold text-ink uppercase tracking-wider">Modifier la mission</h2>
              <button
                type="button"
                (click)="fermerEditMode()"
                class="text-xs text-ink-muted hover:text-ink cursor-pointer"
              >
                Annuler
              </button>
            </div>

            <div class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-ink">Titre <span class="text-danger-500">*</span></label>
                <input
                  type="text"
                  [(ngModel)]="editForm().titre"
                  class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
                />
              </div>

              <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-ink">Description</label>
                <textarea
                  [(ngModel)]="editForm().description"
                  rows="3"
                  class="rounded-lg border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none resize-none leading-relaxed"
                ></textarea>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-ink">Priorité</label>
                  <select
                    [(ngModel)]="editForm().priorite"
                    class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="HAUTE">Haute</option>
                    <option value="MOYENNE">Moyenne</option>
                    <option value="BASSE">Basse</option>
                  </select>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-semibold text-ink">Date d'échéance</label>
                  <input
                    type="date"
                    [(ngModel)]="editForm().dateEcheance"
                    class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div class="flex items-center justify-end gap-2 pt-2">
              <app-button
                type="button"
                variant="secondary"
                size="sm"
                (click)="fermerEditMode()"
              >
                Annuler
              </app-button>
              <app-button
                type="button"
                size="sm"
                [disabled]="traitement()"
                (click)="sauvegarderMission()"
              >
                {{ traitement() ? 'Sauvegarde...' : 'Sauvegarder' }}
              </app-button>
            </div>
          </app-card>
        }

        <!-- Consignes & Description -->
        <app-card padding="lg" class="flex flex-col gap-2">
          <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Consignes & Attentes</h2>
          <p class="text-xs sm:text-sm text-ink leading-relaxed whitespace-pre-line">
            {{ m.description || 'Aucune consigne détaillée pour cette mission.' }}
          </p>
        </app-card>

        <!-- Livrables soumis et cycle de révision -->
        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-base font-bold text-ink">Livrables à évaluer ({{ livrables().length }})</h2>
              <p class="text-xs text-ink-muted">Chaque livrable regroupe sa version actuelle et son historique de corrections.</p>
            </div>
          </div>

          <div class="flex flex-col gap-4">
            @for (l of livrables(); track l.id) {
              <div class="rounded-xl border border-line bg-surface overflow-hidden shadow-xs">
                
                <!-- En-tête Livrable : Objet, Version actuelle, Statut -->
                <div class="p-5 flex flex-col gap-4 border-b border-line/60 bg-surface">
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent">
                        @if (l.typePiece === 'LIEN') {
                          <app-icon name="link" class="size-4" />
                        } @else {
                          <app-icon name="missions" class="size-4" />
                        }
                      </div>
                      <div class="flex flex-col min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="text-sm font-bold text-ink truncate">{{ l.nom || 'Livrable' }}</span>
                          <span class="inline-flex items-center rounded-md bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted border border-line">
                            Version {{ l.numeroVersion || 1 }}
                          </span>
                        </div>
                        <div class="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                          <span>Déposée le {{ l.dateDepot ? (l.dateDepot | date:'dd MMMM yyyy à HH:mm') : 'Récemment' }}</span>
                          <span>•</span>
                          <button
                            type="button"
                            (click)="ouvrirLivrable(l)"
                            class="text-accent font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Voir le document actuel</span>
                            <app-icon name="arrow-right" class="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center gap-2 self-start sm:self-auto shrink-0">
                      <app-badge [status]="statutBadgeLivrable(l.statut).status">
                        {{ statutBadgeLivrable(l.statut).label }}
                      </app-badge>

                      <!-- Bouton toggle historique -->
                      @if (l.historique && l.historique.length > 1) {
                        <button
                          type="button"
                          (click)="toggleHistorique(l.id)"
                          class="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
                        >
                          <app-icon name="clock" class="size-3.5" />
                          <span>Historique ({{ l.historique.length }})</span>
                          <app-icon [name]="isHistoriqueOpen(l.id) ? 'chevron-up' : 'chevron-down'" class="size-3" />
                        </button>
                      }
                    </div>
                  </div>

                  <!-- Bandeau d'état et Prochaine Action (UX Guidée) -->
                  @if (l.statut === 'EN_ATTENTE') {
                    <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                      <app-icon name="clock" class="size-4 shrink-0 mt-0.5 text-amber-600" />
                      <div class="flex-1 leading-relaxed">
                        <span class="font-semibold">Action requise du coach :</span>
                        Cette version attend votre évaluation. Examinez le document, puis validez le livrable ou demandez des modifications précises.
                      </div>
                    </div>
                  } @else if (l.statut === 'A_CORRIGER') {
                    <div class="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-4 flex flex-col gap-2 text-xs">
                      <div class="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
                        <app-icon name="warning" class="size-4 text-amber-600" />
                        <span>Correction demandée — En attente du dépôt de la Version {{ (l.numeroVersion || 1) + 1 }}</span>
                      </div>

                      @if (l.motifRefus) {
                        <div class="text-ink">
                          <span class="font-semibold text-ink-muted">Motif : </span>
                          <span>{{ l.motifRefus }}</span>
                        </div>
                      }

                      @if (l.pointsACorriger) {
                        <div class="mt-1 flex flex-col gap-1 text-ink">
                          <span class="font-semibold text-ink-muted">Points à modifier :</span>
                          <div class="rounded-md bg-surface p-2.5 border border-line whitespace-pre-line text-xs">
                            {{ l.pointsACorriger }}
                          </div>
                        </div>
                      }

                      @if (l.ressourceRecommandee) {
                        <div class="text-ink">
                          <span class="font-semibold text-ink-muted">Ressource conseillée : </span>
                          <span class="text-accent font-medium">{{ l.ressourceRecommandee }}</span>
                        </div>
                      }

                      @if (l.dateEcheanceCorrection) {
                        <div class="text-ink text-[11px] text-ink-muted">
                          Échéance de retour souhaitée : <span class="font-semibold text-ink">{{ l.dateEcheanceCorrection }}</span>
                        </div>
                      }
                    </div>
                  } @else if (l.statut === 'VALIDE') {
                    <div class="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div class="flex items-center gap-2">
                        <app-icon name="check" class="size-4 text-emerald-600" />
                        <span class="font-semibold">Livrable validé avec succès !</span>
                      </div>
                      @if (l.note !== undefined && l.note !== null) {
                        <span class="font-bold text-ink bg-surface px-2 py-0.5 rounded border border-line">
                          Note attribuée : {{ l.note }}/20
                        </span>
                      }
                    </div>
                  }
                </div>

                <!-- Formulaire d'évaluation structurée (Quand statut = EN_ATTENTE) -->
                @if (l.statut === 'EN_ATTENTE') {
                  <div class="p-5 bg-surface-muted/30 flex flex-col gap-4">
                    
                    @if (!isFormCorrectionOpen(l.id)) {
                      <!-- Barre d'actions rapides -->
                      <div class="flex items-center justify-between gap-3 flex-wrap">
                        <div class="text-xs text-ink-muted">
                          Sélectionnez la décision pour la Version {{ l.numeroVersion || 1 }} :
                        </div>

                        <div class="flex items-center gap-2">
                          <app-button
                            type="button"
                            variant="secondary"
                            size="sm"
                            (click)="ouvrirFormCorrection(l.id)"
                          >
                            <app-icon name="edit" class="size-3.5 mr-1" />
                            <span>Demander une correction</span>
                          </app-button>

                          <app-button
                            type="button"
                            size="sm"
                            [disabled]="traitement()"
                            (click)="validerLivrable(l.id)"
                          >
                            <app-icon name="check" class="size-3.5 mr-1" />
                            <span>{{ traitement() ? 'Validation...' : 'Valider ce livrable' }}</span>
                          </app-button>
                        </div>
                      </div>
                    } @else {
                      <!-- Formulaire complet de demande de correction -->
                      <div class="rounded-xl border border-line bg-surface p-4 flex flex-col gap-4">
                        <div class="flex items-center justify-between border-b border-line pb-2.5">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-ink uppercase tracking-wider">Demande de correction structurée</span>
                            <span class="text-[11px] text-ink-muted">(Version {{ l.numeroVersion || 1 }})</span>
                          </div>
                          <button
                            type="button"
                            (click)="fermerFormCorrection(l.id)"
                            class="text-xs text-ink-muted hover:text-ink cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>

                        <div class="flex flex-col gap-3">
                          <!-- Motif principal -->
                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-semibold text-ink">
                              Motif de la demande <span class="text-danger-500">*</span>
                            </label>
                            <input
                              type="text"
                              [(ngModel)]="correctionForms[l.id].motif"
                              placeholder="Ex : L'étude de marché doit être approfondie..."
                              class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
                            />
                          </div>

                          <!-- Points précis à corriger -->
                          <div class="flex flex-col gap-1">
                            <label class="text-xs font-semibold text-ink">
                              Points à modifier / Checklist attendue <span class="text-danger-500">*</span>
                            </label>
                            <textarea
                              [(ngModel)]="correctionForms[l.id].pointsACorriger"
                              rows="3"
                              placeholder="• Ajouter au moins 3 concurrents directs&#10;• Citer les sources chiffrées&#10;• Revoir la segmentation de la clientèle cible"
                              class="rounded-lg border border-line bg-surface p-3 text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none resize-none leading-relaxed"
                            ></textarea>
                            <span class="text-[11px] text-ink-muted">Indiquez clairement ce que l'entrepreneur doit rectifier avant le redépôt.</span>
                          </div>

                          <!-- Grille : Ressource recommandée & Échéance -->
                          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div class="flex flex-col gap-1">
                              <label class="text-xs font-semibold text-ink">
                                Ressource / Guide conseillé <span class="text-ink-muted font-normal">(Optionnel)</span>
                              </label>
                              <input
                                type="text"
                                [(ngModel)]="correctionForms[l.id].ressourceRecommandee"
                                placeholder="Ex: Guide — Réaliser une étude de marché"
                                class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
                              />
                            </div>

                            <div class="flex flex-col gap-1">
                              <label class="text-xs font-semibold text-ink">
                                Échéance de correction <span class="text-ink-muted font-normal">(Optionnel)</span>
                              </label>
                              <input
                                type="date"
                                [(ngModel)]="correctionForms[l.id].dateEcheance"
                                class="rounded-lg border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none"
                              />
                            </div>
                          </div>

                          <!-- Actions de soumission -->
                          <div class="flex items-center justify-end gap-2 pt-2 border-t border-line mt-1">
                            <app-button
                              type="button"
                              variant="secondary"
                              size="xs"
                              (click)="fermerFormCorrection(l.id)"
                            >
                              Annuler
                            </app-button>

                            <app-button
                              type="button"
                              size="xs"
                              [disabled]="traitement() || !isCorrectionFormValid(l.id)"
                              (click)="envoyerDemandeCorrection(l.id)"
                            >
                              {{ traitement() ? 'Envoi...' : 'Envoyer les consignes de correction' }}
                            </app-button>
                          </div>
                        </div>

                      </div>
                    }

                  </div>
                }

                <!-- Section Historique des versions (Dépliable) -->
                @if (isHistoriqueOpen(l.id) && l.historique && l.historique.length > 0) {
                  <div class="bg-surface-muted/50 p-5 border-t border-line flex flex-col gap-3">
                    <div class="flex items-center justify-between">
                      <span class="text-xs font-bold uppercase tracking-wider text-ink-muted">
                        Historique des versions de ce livrable ({{ l.historique.length }})
                      </span>
                    </div>

                    <div class="divide-y divide-line rounded-xl border border-line bg-surface overflow-hidden">
                      @for (v of l.historique; track v.id) {
                        <div class="p-4 flex flex-col gap-2.5 transition-colors hover:bg-surface-muted/20">
                          <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2.5">
                              <span class="font-bold text-xs px-2 py-0.5 rounded bg-surface-muted border border-line text-ink">
                                V{{ v.numeroVersion }}
                              </span>
                              <span class="text-xs font-semibold text-ink">{{ v.nom }}</span>
                              <span class="text-[11px] text-ink-muted">
                                · {{ v.dateDepot | date:'dd/MM/yyyy à HH:mm' }}
                              </span>
                            </div>

                            <div class="flex items-center gap-2">
                              <app-badge [status]="statutBadgeLivrable(v.statut).status" size="sm">
                                {{ statutBadgeLivrable(v.statut).label }}
                              </app-badge>

                              <button
                                type="button"
                                (click)="ouvrirLivrableParUrl(v.url)"
                                class="text-accent text-xs font-semibold hover:underline"
                              >
                                Ouvrir ↗
                              </button>
                            </div>
                          </div>

                          @if (v.commentaireEntrepreneur) {
                            <div class="text-xs text-ink-muted italic bg-surface-muted/30 p-2 rounded border border-line/40">
                              Note entrepreneur : "{{ v.commentaireEntrepreneur }}"
                            </div>
                          }

                          @if (v.motifRefus || v.commentaireCoach) {
                            <div class="text-xs text-ink-muted flex flex-col gap-1 border-l-2 border-accent/40 pl-3 py-1">
                              @if (v.motifRefus) {
                                <p><strong class="text-ink">Motif :</strong> {{ v.motifRefus }}</p>
                              }
                              @if (v.pointsACorriger) {
                                <p class="whitespace-pre-line"><strong class="text-ink">Consignes :</strong> {{ v.pointsACorriger }}</p>
                              }
                              @if (v.commentaireCoach && !v.motifRefus) {
                                <p><em>"{{ v.commentaireCoach }}"</em></p>
                              }
                            </div>
                          }
                        </div>
                      }
                    </div>
                  </div>
                }

              </div>
            } @empty {
              <div class="rounded-xl border border-line bg-surface p-12 text-center flex flex-col items-center justify-center">
                <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line">
                  <app-icon name="missions" class="size-5" />
                </div>
                <p class="text-xs font-semibold text-ink">Aucun livrable soumis</p>
                <p class="text-[11px] text-ink-muted mt-0.5">L'entrepreneur n'a pas encore versé de document pour cette mission.</p>
              </div>
            }
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
export class MissionDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly mission = signal<Mission | undefined>(undefined);

  /**
   * Les livrables viennent directement du signal partagé du LivrableService.
   * Ils se mettent à jour automatiquement via WebSocket.
   */
  protected readonly livrables = this.livrableService.livrables;

  protected readonly isLoading = signal<boolean>(true);
  protected readonly traitement = signal(false);

  // Gestion du formulaire de modification de mission
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly editForm = signal({
    titre: '',
    description: '',
    priorite: '',
    dateEcheance: ''
  });

  // Gestion des formulaires de correction structurée
  protected correctionForms: Record<string, CorrectionFormState> = {};
  protected readonly formsOuverts = signal<Record<string, boolean>>({});

  // Gestion des tiroirs historiques dépliés
  protected readonly historiquesOuverts = signal<Record<string, boolean>>({});

  protected readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const m = this.mission();
    const items: BreadcrumbItem[] = [
      { label: 'Missions', url: '/incubateur/missions' },
    ];

    if (!m) return items;

    if (m.cohorteId && m.nomCohorte) {
      items.push({
        label: m.nomCohorte,
        url: '/incubateur/cohortes',
        queryParams: { cohorteId: m.cohorteId },
      });
    }

    if (m.entrepreneurId && m.nomEntrepreneur) {
      items.push({
        label: m.nomEntrepreneur,
        url: `/incubateur/entrepreneurs/${m.entrepreneurId}`,
      });
    }

    if (m.projetId && m.nomProjet) {
      items.push({
        label: m.nomProjet,
        url: `/incubateur/projets/${m.projetId}`,
      });
    }

    items.push({
      label: m.titre,
    });

    return items;
  });

  ngOnInit(): void {
    if (!this.missionId) {
      this.isLoading.set(false);
      return;
    }

    // Déclare la mission active dans LivrableService :
    // - charge les livrables initiaux
    // - active l'écoute WebSocket pour cette mission
    this.livrableService.setActiveMission(this.missionId);

    this.chargerMission();
  }

  ngOnDestroy(): void {
    // Libère le contexte mission pour éviter les mises à jour parasites
    this.livrableService.clearActiveMission();
  }

  ouvrirLivrable(l: LivrableResponse): void {
    this.livrableService.ouvrirFichier(l.url);
  }

  ouvrirLivrableParUrl(url: string): void {
    this.livrableService.ouvrirFichier(url);
  }

  private chargerMission(): void {
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
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_CONFIG[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  protected statutBadgeLivrable(statut: string) {
    return STATUT_LIVRABLE_CONFIG[statut as StatutLivrable] ?? { status: 'neutral' as const, label: statut };
  }

  // Contrôles formulaire de correction
  protected isFormCorrectionOpen(livrableId: string): boolean {
    return !!this.formsOuverts()[livrableId];
  }

  protected ouvrirFormCorrection(livrableId: string): void {
    if (!this.correctionForms[livrableId]) {
      this.correctionForms[livrableId] = {
        motif: '',
        pointsACorriger: '',
        ressourceRecommandee: '',
        dateEcheance: '',
      };
    }
    this.formsOuverts.update((prev) => ({ ...prev, [livrableId]: true }));
  }

  protected fermerFormCorrection(livrableId: string): void {
    this.formsOuverts.update((prev) => ({ ...prev, [livrableId]: false }));
  }

  protected isCorrectionFormValid(livrableId: string): boolean {
    const form = this.correctionForms[livrableId];
    return !!(form && form.motif.trim() && form.pointsACorriger.trim());
  }

  // ── Modification de mission ───────────────────────────────────────────────────

  protected ouvrirEditMode(): void {
    const m = this.mission();
    if (!m) return;

    this.editForm.set({
      titre: m.titre || '',
      description: m.description || '',
      priorite: m.priorite || '',
      dateEcheance: m.dateEcheance || ''
    });
    this.isEditMode.set(true);
  }

  protected fermerEditMode(): void {
    this.isEditMode.set(false);
  }

  protected sauvegarderMission(): void {
    const m = this.mission();
    if (!m) return;

    const form = this.editForm();
    const changements: Partial<Pick<Mission, 'titre' | 'description' | 'dateEcheance' | 'priorite'>> = {};

    if (form.titre !== m.titre) changements.titre = form.titre;
    if (form.description !== m.description) changements.description = form.description;
    if (form.priorite !== m.priorite) changements.priorite = form.priorite as any;
    if (form.dateEcheance !== m.dateEcheance) changements.dateEcheance = form.dateEcheance as any;

    if (Object.keys(changements).length === 0) {
      this.fermerEditMode();
      return;
    }

    this.traitement.set(true);

    this.missionService
      .updateMissionDetails(m.id, changements)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.mission.set(updated);
          this.traitement.set(false);
          this.isEditMode.set(false);
        },
        error: (err) => {
          console.error('Erreur modification mission:', err);
          this.traitement.set(false);
        },
      });
  }

  // Validation
  protected validerLivrable(livrableId: string): void {
    this.traitement.set(true);

    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'VALIDE',
        commentaireCoach: 'Livrable validé par le coach.',
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          // Le WebSocket enverra LIVRABLE_VALIDE → rafraîchissement automatique via signal
          // On recharge quand même par sécurité pour la cohérence immédiate (avant l'event WS)
          this.livrableService.rechargerLivrablesMissionActive();
        },
        error: (err) => {
          console.error('Erreur validation livrable:', err);
          this.traitement.set(false);
        },
      });
  }

  // Demande de correction
  protected envoyerDemandeCorrection(livrableId: string): void {
    const form = this.correctionForms[livrableId];
    if (!form || !form.motif.trim() || !form.pointsACorriger.trim()) return;

    this.traitement.set(true);

    this.livrableService
      .evaluerLivrable(livrableId, {
        statut: 'A_CORRIGER',
        motifRefus: form.motif.trim(),
        pointsACorriger: form.pointsACorriger.trim(),
        ressourceRecommandee: form.ressourceRecommandee.trim() || undefined,
        dateEcheanceCorrection: form.dateEcheance.trim() || undefined,
        commentaireCoach: form.motif.trim(),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.traitement.set(false);
          this.fermerFormCorrection(livrableId);
          // Le WebSocket enverra LIVRABLE_REJETE → rafraîchissement automatique via signal
          this.livrableService.rechargerLivrablesMissionActive();
        },
        error: (err) => {
          console.error('Erreur demande de correction:', err);
          this.traitement.set(false);
        },
      });
  }

  // Historique
  protected toggleHistorique(livrableId: string): void {
    this.historiquesOuverts.update((prev) => ({
      ...prev,
      [livrableId]: !prev[livrableId],
    }));
  }

  protected isHistoriqueOpen(livrableId: string): boolean {
    return !!this.historiquesOuverts()[livrableId];
  }
}