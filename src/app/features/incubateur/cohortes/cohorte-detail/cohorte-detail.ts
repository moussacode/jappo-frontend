import {
  Component, inject, signal, computed, DestroyRef, OnInit
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { RessourceService } from '../../../../core/services/ressource.service';
import { MeetingService } from '../../../../core/services/meeting.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { Cohorte } from '../../../../core/models/cohorte.model';
import { Projet, PromouvoirProjetRequest, PromotionGroupeeRequest, PromotionGroupeeResultat } from '../../../../core/models/projet.model';
import { MissionCohorteResponse } from '../../../../core/models/mission.model';
import { Ressource } from '../../../../core/models/ressource.model';
import { Meeting } from '../../../../core/models/meeting.model';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { CardComponent } from '../../../../shared/components/card/card.component';

import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';

type OngletId = 'projets' | 'missions' | 'ressources' | 'reunions';

interface MissionNonValidee { titre: string; statut: string; }
interface Promotion409 {
  message: string;
  missionsNonValidees: MissionNonValidee[];
}

@Component({
  selector: 'app-cohorte-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    Icon, ButtonComponent, BadgeComponent, PageHeaderComponent,
    EmptyStateComponent, CardComponent, ModalComponent,
    LoadingState
],
  template: `
<div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

  <!-- Chargement -->
  @if (chargement()) {
    <app-loading-state message="Chargement de la cohorte..." />
  }

  @if (!chargement() && cohorte()) {

    <!-- En-tête -->
    <div class="flex flex-col sm:flex-row sm:items-start gap-4">
      <div class="flex-1 min-w-0">
        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <a routerLink="/incubateur/cohortes" class="hover:text-indigo-500">Cohortes</a>
          <app-icon name="chevron-right" class="w-3 h-3" />
          <span class="text-gray-400">{{ cohorte()!.nom }}</span>
        </nav>
        <h1 class="text-xl font-bold text-gray-900 dark:text-white truncate">{{ cohorte()!.nom }}</h1>
        <div class="flex items-center gap-2 mt-1 flex-wrap">
          <span class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
            {{ cohorte()!.phase?.nom ?? 'Phase inconnue' }}
          </span>
          <span class="text-gray-400">·</span>
          <span class="text-sm text-gray-500 dark:text-gray-400">{{ projets().length }} projet(s)</span>
        </div>
      </div>
      <div class="flex items-center gap-2 flex-shrink-0">
        @if (isAdminOrCoach()) {
          <app-button variant="secondary" size="sm" (click)="ouvrirInvitation()">
            <app-icon name="plus" class="w-4 h-4 mr-1" />
            Inviter des entrepreneurs
          </app-button>
        }
      </div>
    </div>

    <!-- Onglets -->
    <div class="border-b border-gray-200 dark:border-white/10">
      <nav class="flex gap-1 -mb-px">
        @for (onglet of onglets; track onglet.id) {
          <button
            (click)="ongletActif.set(onglet.id)"
            class="px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap"
            [class]="ongletActif() === onglet.id
              ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'"
          >
            {{ onglet.label }}
          </button>
        }
      </nav>
    </div>

    <!-- ─── ONGLET PROJETS ─── -->
    @if (ongletActif() === 'projets') {
      <div class="flex flex-col gap-4">

        @if (chargementProjets()) {
          <app-loading-state message="Chargement des projets..." />
        } @else if (projets().length === 0) {
          <app-empty-state
            icon="users"
            title="Aucun projet dans cette cohorte"
            description="Invitez des entrepreneurs pour créer des projets."
          />
        } @else {
          <!-- Tableau projets -->
          <div class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <table class="w-full text-sm">
              <thead class="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th class="w-10 px-4 py-3">
                    <input type="checkbox"
                      [checked]="tousSelectionnes()"
                      (change)="toggleTousSelectionnes($event)"
                      class="rounded border-gray-300 text-indigo-600" />
                  </th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Projet</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Entrepreneur</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Score</th>
                  <th class="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Missions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-white/5">
                @for (p of projets(); track p.id) {
                  <tr class="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td class="px-4 py-3">
                      <input type="checkbox"
                        [checked]="selectionnes().has(p.id)"
                        (change)="toggleSelection(p.id)"
                        class="rounded border-gray-300 text-indigo-600" />
                    </td>
                    <td class="px-4 py-3">
                      <a [routerLink]="['/incubateur/projets', p.id]" class="font-medium text-gray-900 dark:text-white hover:text-indigo-500">
                        {{ p.nom }}
                      </a>
                    </td>
                    <td class="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{{ p.nomEntrepreneur ?? '—' }}</td>
                    <td class="px-4 py-3 hidden md:table-cell">
                      <span class="text-gray-700 dark:text-gray-300 font-mono text-xs">{{ p.scoreMaturite ?? '—' }}</span>
                    </td>
                    <td class="px-4 py-3">
                      @if ((p.nombreMissionsTotal ?? 0) > 0) {
                        <span class="text-xs" [class]="
                          p.nombreMissionsValidees === p.nombreMissionsTotal
                            ? 'text-green-600 dark:text-green-400 font-semibold'
                            : 'text-gray-600 dark:text-gray-400'
                        ">
                          {{ p.nombreMissionsValidees ?? 0 }}/{{ p.nombreMissionsTotal }}
                        </span>
                      } @else {
                        <span class="text-xs text-gray-400">—</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Bouton promouvoir -->
          @if (isAdminOrCoach() && selectionnes().size > 0) {
            <div class="flex justify-end">
              <app-button variant="primary" (click)="ouvrirPromotion()">
                <!-- <app-icon name="arrow-up-circle" class="w-4 h-4 mr-1" /> -->
                Promouvoir la sélection ({{ selectionnes().size }})
              </app-button>
            </div>
          }
        }
      </div>
    }

    <!-- ─── ONGLET MISSIONS ─── -->
    @if (ongletActif() === 'missions') {
      <div class="flex flex-col gap-4">
        <div class="flex justify-end">
          <a [routerLink]="['/incubateur/missions']" [queryParams]="{cohorteId: cohorteId()}" class="text-sm text-indigo-500 hover:underline">
            Voir toutes les missions de cette cohorte →
          </a>
        </div>
        @if (chargementMissions()) {
          <app-loading-state message="Chargement des missions..." />
        } @else if (missions().length === 0) {
          <app-empty-state icon="check-square" title="Aucune mission" description="Créez des missions pour cette cohorte." />
        } @else {
          <div class="grid grid-cols-1 gap-3">
            @for (m of missions(); track m.id) {
              <app-card>
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ m.titre }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{ m.nombreValides }}/{{ m.nombreProjetsConcernes }} validée(s)
                    </p>
                  </div>
                  <a [routerLink]="['/incubateur/missions-cohorte', m.id]" class="text-xs text-indigo-500 hover:underline flex-shrink-0">Détail</a>
                </div>
              </app-card>
            }
          </div>
        }
      </div>
    }

    <!-- ─── ONGLET RESSOURCES ─── -->
    @if (ongletActif() === 'ressources') {
      <div class="flex flex-col gap-4">
        @if (chargementRessources()) {
          <app-loading-state message="Chargement des ressources..." />
        } @else if (ressources().length === 0) {
          <app-empty-state icon="book-open" title="Aucune ressource" description="Aucune ressource associée à cette cohorte." />
        } @else {
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            @for (r of ressources(); track r.id) {
              <app-card>
                <div class="flex items-start gap-3">
                  <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <app-icon [name]="r.type === 'LIEN' ? 'external-link' : 'file'" class="w-4 h-4 text-indigo-500" />
                  </div>
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ r.titre }}</p>
                    @if (r.url) {
                      <a [href]="r.url" target="_blank" class="text-xs text-indigo-500 hover:underline truncate block">{{ r.url }}</a>
                    }
                  </div>
                </div>
              </app-card>
            }
          </div>
        }
      </div>
    }

    <!-- ─── ONGLET RÉUNIONS ─── -->
    @if (ongletActif() === 'reunions') {
      <div class="flex flex-col gap-4">
        <div class="flex justify-end">
          @if (isAdminOrCoach()) {
            <app-button variant="primary" size="sm" (click)="planifierReunion()">
              <app-icon name="calendar" class="w-4 h-4 mr-1" />
              Planifier une réunion
            </app-button>
          }
        </div>
        @if (chargementReunions()) {
          <app-loading-state message="Chargement des réunions..." />
        } @else if (reunions().length === 0) {
          <app-empty-state icon="calendar" title="Aucune réunion" description="Planifiez une réunion pour cette cohorte." />
        } @else {
          <div class="grid grid-cols-1 gap-3">
            @for (r of reunions(); track r.id) {
              <app-card>
                <div class="flex items-center justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-gray-900 dark:text-white truncate">{{ r.title }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {{ r.scheduledAt | date:'dd/MM/yyyy HH:mm' }} · {{ r.durationMinutes }} min
                    </p>
                  </div>
                  <a [routerLink]="['/incubateur/reunions', r.id]" class="text-xs text-indigo-500 hover:underline flex-shrink-0">Rejoindre</a>
                </div>
              </app-card>
            }
          </div>
        }
      </div>
    }

  }<!-- fin if cohorte -->

  <!-- ─── MODALE INVITATION ─── -->
  @if (invitationOuverte()) {
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="fixed inset-0 bg-black/40" (click)="invitationOuverte.set(false)"></div>
      <div class="relative z-10 w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6 space-y-4">
        <h2 class="text-base font-semibold text-gray-900 dark:text-white">Inviter des entrepreneurs</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400">
          Saisissez les adresses e-mail séparées par des virgules ou une par ligne.
        </p>
        <textarea
          [(ngModel)]="emailsInvitation"
          rows="4"
          placeholder="fatou@example.com&#10;cheikh@example.com"
          class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        ></textarea>
        <div class="flex justify-end gap-3">
          <app-button variant="secondary" (click)="invitationOuverte.set(false)">Annuler</app-button>
          <app-button variant="primary"  (click)="envoyerInvitations()">Envoyer</app-button>
        </div>
      </div>
    </div>
  }

  <!-- ─── PANNEAU PROMOTION ─── -->
  @if (promotionOuverte()) {
    <div class="fixed inset-0 z-50 flex items-start justify-end">
      <div class="fixed inset-0 bg-black/40 backdrop-blur-sm" (click)="promotionOuverte.set(false)"></div>
      <div class="relative z-10 w-full max-w-lg h-full bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto flex flex-col">

        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-white/10 sticky top-0 bg-white dark:bg-gray-900">
          <h2 class="text-base font-semibold text-gray-900 dark:text-white">Promouvoir la sélection</h2>
          <button (click)="promotionOuverte.set(false)" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500">
            <app-icon name="x" class="w-5 h-5" />
          </button>
        </div>

        <div class="flex-1 px-6 py-6 space-y-6">

          <!-- Projets sélectionnés -->
          <div>
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Projets à promouvoir</p>
            <div class="space-y-1">
              @for (id of selectionnes(); track id) {
                @if (projetParId(id); as p) {
                  <div class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <app-icon name="check" class="w-4 h-4 text-indigo-500 flex-shrink-0" />
                    {{ p.nom }}
                  </div>
                }
              }
            </div>
          </div>

          <!-- Cohorte cible -->
          <div>
            <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Cohorte cible *</p>
            @if (chargementEligibles()) {
              <p class="text-sm text-gray-400">Chargement...</p>
            } @else if (cohortesEligibles().length === 0) {
              <p class="text-sm text-gray-400 italic">Aucune cohorte éligible (phase d'ordre supérieur).</p>
              <p class="text-xs text-indigo-500 mt-1 cursor-pointer hover:underline" routerLink="/incubateur/cohortes">+ Créer une nouvelle cohorte</p>
            } @else {
              <div class="space-y-2">
                @for (c of cohortesEligibles(); track c.id) {
                  <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                    [class]="cohorteCibleId() === c.id
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10'
                      : 'border-gray-200 dark:border-white/10 hover:border-indigo-300'">
                    <input type="radio" [value]="c.id" [checked]="cohorteCibleId() === c.id" (change)="cohorteCibleId.set(c.id)" class="text-indigo-600" />
                    <div>
                      <p class="text-sm font-medium text-gray-900 dark:text-white">{{ c.nom }}</p>
                      <p class="text-xs text-gray-500 dark:text-gray-400">Phase : {{ c.phase?.nom ?? '—' }} (ordre {{ c.phase?.ordre ?? '?' }})</p>
                    </div>
                  </label>
                }
              </div>
            }
          </div>

          <!-- Raison -->
          <div>
            <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Raison {{ forcer() ? '*' : '' }}
            </label>
            <textarea
              [(ngModel)]="raisonPromotion"
              rows="2"
              placeholder="Raison de la promotion..."
              class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            ></textarea>
          </div>

          <!-- Erreur 409 : missions non validées -->
          @if (promotion409()) {
            <div class="rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/10 p-4 space-y-3">
              <div class="flex items-center gap-2">
                <app-icon name="alert-circle" class="w-5 h-5 text-amber-500 flex-shrink-0" />
                <p class="text-sm font-semibold text-amber-800 dark:text-amber-300">Missions non validées</p>
              </div>
              <ul class="space-y-1">
                @for (m of promotion409()!.missionsNonValidees; track m.titre) {
                  <li class="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>
                    {{ m.titre }} — {{ m.statut }}
                  </li>
                }
              </ul>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [(ngModel)]="forcerPromotion" class="rounded text-amber-500" />
                <span class="text-sm font-medium text-amber-800 dark:text-amber-300">Promouvoir quand même</span>
              </label>
              @if (forcerPromotion) {
                <p class="text-xs text-amber-600 dark:text-amber-400">Une raison est obligatoire ci-dessus.</p>
              }
            </div>
          }

          <!-- Résultats -->
          @if (resultatsPromotion().length > 0) {
            <div class="space-y-2">
              <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Résultats</p>
              @for (r of resultatsPromotion(); track r.projetId) {
                <div class="flex items-center gap-2 text-sm p-2 rounded-lg"
                  [class]="r.succes ? 'bg-green-50 dark:bg-green-500/10 text-green-800 dark:text-green-300' : 'bg-red-50 dark:bg-red-500/10 text-red-800 dark:text-red-300'">
                  <!-- <app-icon [name]="r.succes ? 'check-circle' : 'x-circle'" class="w-4 h-4 flex-shrink-0" /> -->
                  <span class="font-medium">{{ r.nomProjet }}</span>
                  <span class="text-xs ml-auto">{{ r.message }}</span>
                </div>
              }
            </div>
          }

        </div>

        <div class="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-900">
          <app-button variant="secondary" (click)="promotionOuverte.set(false)">Annuler</app-button>
          <app-button
            variant="primary"
           
            [disabled]="!cohorteCibleId() || (forcerPromotion && !raisonPromotion.trim())"
            (click)="lancerPromotion()"
          >
            <!-- <app-icon name="arrow-left" class="w-4 h-4 mr-1" /> -->
            {{ forcer() ? 'Forcer la promotion' : 'Promouvoir' }}
          </app-button>
        </div>

      </div>
    </div>
  }

</div>
  `,
})
export class CohorteDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly ressourceService = inject(RessourceService);
  private readonly meetingService = inject(MeetingService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly cohorteId = signal<string>('');
  readonly cohorte = signal<Cohorte | null>(null);
  readonly projets = signal<Projet[]>([]);
  readonly missions = signal<MissionCohorteResponse[]>([]);
  readonly ressources = signal<Ressource[]>([]);
  readonly reunions = signal<Meeting[]>([]);
  readonly cohortesEligibles = signal<Cohorte[]>([]);

  readonly chargement = signal(true);
  readonly chargementProjets = signal(false);
  readonly chargementMissions = signal(false);
  readonly chargementRessources = signal(false);
  readonly chargementReunions = signal(false);
  readonly chargementEligibles = signal(false);

  readonly ongletActif = signal<OngletId>('projets');
  readonly selectionnes = signal<Set<string>>(new Set());
  readonly tousSelectionnes = computed(() => this.projets().length > 0 && this.selectionnes().size === this.projets().length);

  // Invitation
  readonly invitationOuverte = signal(false);
  readonly invitationEnCours = signal(false);
  emailsInvitation = '';

  // Promotion
  readonly promotionOuverte = signal(false);
  readonly promotionEnCours = signal(false);
  readonly cohorteCibleId = signal<string>('');
  raisonPromotion = '';
  readonly promotion409 = signal<Promotion409 | null>(null);
  readonly forcerPromotion = false;
  forcer = computed(() => this.promotion409() !== null && (this as any).forcerPromotion);
  readonly resultatsPromotion = signal<PromotionGroupeeResultat[]>([]);

  readonly onglets = [
    { id: 'projets' as OngletId, label: 'Projets' },
    { id: 'missions' as OngletId, label: 'Missions' },
    { id: 'ressources' as OngletId, label: 'Ressources' },
    { id: 'reunions' as OngletId, label: 'Réunions' },
  ];

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    this.cohorteId.set(id);
    this.charger(id);
  }

  private charger(id: string): void {
    this.chargement.set(true);
    this.cohorteService.getCohorteById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cohorte.set(c); this.chargement.set(false); this.chargerProjets(); },
        error: () => { this.chargement.set(false); },
      });
  }

  chargerProjets(): void {
    this.chargementProjets.set(true);
    this.projetService.getByCohorte(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (p) => { this.projets.set(p); this.chargementProjets.set(false); }, error: () => this.chargementProjets.set(false) });
  }

  chargerMissions(): void {
    if (this.missions().length > 0) return;
    this.chargementMissions.set(true);
    this.missionService.getMissionsCohorteAgregees()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (all) => { this.missions.set(all.filter(m => m.cohorteId === this.cohorteId())); this.chargementMissions.set(false); },
        error: () => this.chargementMissions.set(false),
      });
  }

  chargerRessources(): void {
    if (this.ressources().length > 0) return;
    this.chargementRessources.set(true);
    this.ressourceService.getByCohorte(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { this.ressources.set(r); this.chargementRessources.set(false); }, error: () => this.chargementRessources.set(false) });
  }

  chargerReunions(): void {
    if (this.reunions().length > 0) return;
    this.chargementReunions.set(true);
    this.meetingService.getMeetings(this.cohorteId())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: (r) => { this.reunions.set(r); this.chargementReunions.set(false); }, error: () => this.chargementReunions.set(false) });
  }

  changerOnglet(id: OngletId): void {
    this.ongletActif.set(id);
    if (id === 'missions') this.chargerMissions();
    if (id === 'ressources') this.chargerRessources();
    if (id === 'reunions') this.chargerReunions();
  }

  isAdminOrCoach(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }

  isAdmin(): boolean {
    return this.structureCtx.activeRole() === 'ADMIN_STRUCTURE';
  }

  toggleSelection(id: string): void {
    this.selectionnes.update(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  toggleTousSelectionnes(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.selectionnes.set(checked ? new Set(this.projets().map(p => p.id)) : new Set());
  }

  projetParId(id: string): Projet | undefined {
    return this.projets().find(p => p.id === id);
  }

  ouvrirInvitation(): void {
    this.emailsInvitation = '';
    this.invitationOuverte.set(true);
  }

  envoyerInvitations(): void {
    const emails = this.emailsInvitation
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    if (emails.length === 0) return;
    this.invitationEnCours.set(true);
    this.cohorteService.inviterEntrepreneurs(this.cohorteId(), { emails })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.invitationEnCours.set(false); this.invitationOuverte.set(false); },
        error: () => { this.invitationEnCours.set(false); alert('Erreur lors de l\'envoi des invitations.'); },
      });
  }

  ouvrirPromotion(): void {
    this.promotion409.set(null);
    this.resultatsPromotion.set([]);
    this.raisonPromotion = '';
    this.cohorteCibleId.set('');
    // Charger cohortes éligibles depuis le 1er projet sélectionné
    const ids = [...this.selectionnes()];
    if (ids.length === 0) return;
    this.promotionOuverte.set(true);
    this.chargementEligibles.set(true);
    this.projetService.getCohortesEligibles(ids[0])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cohortesEligibles.set(c); this.chargementEligibles.set(false); },
        error: () => { this.cohortesEligibles.set([]); this.chargementEligibles.set(false); },
      });
  }

  lancerPromotion(): void {
    if (!this.cohorteCibleId()) return;
    const forcer = (this as any).forcerPromotion as boolean;
    if (forcer && !this.raisonPromotion.trim()) { alert('Une raison est obligatoire pour forcer la promotion.'); return; }

    this.promotionEnCours.set(true);
    this.promotion409.set(null);
    this.resultatsPromotion.set([]);

    const req: PromotionGroupeeRequest = {
      projetIds: [...this.selectionnes()],
      cohorteCibleId: this.cohorteCibleId(),
      raison: this.raisonPromotion.trim() || undefined,
      forcer,
    };

    this.cohorteService.promotionGroupee(this.cohorteId(), req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (resultats) => {
          this.resultatsPromotion.set(resultats);
          this.promotionEnCours.set(false);
          const tousSucces = resultats.every(r => r.succes);
          if (tousSucces) {
            this.selectionnes.set(new Set());
            this.chargerProjets();
          }
        },
        error: (err: HttpErrorResponse) => {
          this.promotionEnCours.set(false);
          if (err.status === 409) {
            this.promotion409.set(err.error);
          } else {
            alert('Erreur lors de la promotion : ' + (err.error?.message ?? err.message));
          }
        },
      });
  }

  planifierReunion(): void {
    this.router.navigate(['/incubateur/reunions/nouvelle'], { queryParams: { cohorteId: this.cohorteId() } });
  }
}
