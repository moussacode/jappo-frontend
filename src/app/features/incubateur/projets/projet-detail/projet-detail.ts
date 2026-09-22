import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';

import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { Projet, ParticipationCohorteResponse, PromouvoirProjetRequest } from '../../../../core/models/projet.model';
import { Mission } from '../../../../core/models/mission.model';
import { Cohorte } from '../../../../core/models/cohorte.model';

import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';

interface Promotion409 {
  message: string;
  missionsNonValidees: { titre: string; statut: string }[];
}

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [
    RouterLink, FormsModule, DatePipe,
    BadgeComponent, Icon, CardComponent, PageHeaderComponent,
    ButtonComponent, EmptyStateComponent, ModalComponent,
    BreadcrumbComponent,
    LoadingState
  ],
  template: `
<div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
  <app-breadcrumb [items]="breadcrumbItems()" />
  <app-loading-state *ngIf="loading()" message="Chargement du projet..." />

  @if (!loading() && projet(); as p) {
    <app-page-header [title]="p.nom" [subtitle]="soustitre(p)">
      <div class="flex items-center gap-2">
        @if (canPromote()) {
          <app-button variant="secondary" size="sm" (click)="ouvrirPromotion()">
           Promouvoir
          </app-button>
        }
        @if (!p.archive) {
          <app-button variant="ghost" size="sm" (click)="showArchiveModal.set(true)">Archiver</app-button>
        } @else {
          <app-button variant="ghost" size="sm" (click)="restaurer()">Restaurer</app-button>
        }
      </div>
    </app-page-header>

    <!-- KPIs -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Phase actuelle</p>
        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ p.nomPhase || '—' }}</p>
      </app-card>
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Missions validées</p>
        <p class="text-xl font-extrabold text-gray-900 dark:text-white">
          {{ p.nombreMissionsValidees ?? 0 }}<span class="text-sm font-normal text-gray-400">/{{ p.nombreMissionsTotal ?? 0 }}</span>
        </p>
      </app-card>
      <app-card padding="lg">
        <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Entrepreneur</p>
        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">{{ p.nomEntrepreneur ?? '—' }}</p>
      </app-card>
    </div>

    <!-- Frise historique -->
    <div>
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-ink-muted">Historique de parcours</h2>
        @if (!loadingHistorique() && historique().length > 0) {
          <span class="text-xs font-semibold text-ink-muted">{{ historique().length }} phase(s)</span>
        }
      </div>

      @if (loadingHistorique()) {
        <p class="text-xs text-ink-muted animate-pulse">Chargement de l'historique...</p>
      } @else if (historique().length === 0) {
        <p class="text-xs text-ink-muted italic">Aucun historique de parcours enregistré.</p>
      } @else {
        <app-card padding="none" class=" overflow-hidden ">
          <div class="overflow-x-auto p-4 sm:p-5 custom-scrollbar">
            <ol class="flex items-start min-w-max sm:min-w-0">
              @for (part of historiqueInverse(); track part.id; let i = $index; let last = $last) {
                <li
                  class="relative flex-1 pr-6 last:pr-0 min-w-[200px]"
                  [attr.aria-current]="part.active ? 'step' : null"
                >
                  <!-- Ligne de connexion horizontale centrée sur la pastille -->
                  @if (!last) {
                    <div class="absolute left-3.5 top-3.5 h-0.5 w-full bg-line/80 z-0">
                      @if (!part.active) {
                        <div class="absolute inset-0 bg-emerald-500"></div>
                      }
                    </div>
                  }

                  <!-- Pastille numérotée (1, 2, 3...) de gauche à droite -->
                  <div class="relative z-10 flex size-7 items-center justify-center">
                    @if (!part.active) {
                      <span class="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shadow-2xs">
                        {{ i + 1 }}
                      </span>
                    } @else {
                      <span class="absolute size-7 rounded-full bg-accent/20 motion-reduce:hidden animate-pulse"></span>
                      <span class="relative flex size-7 items-center justify-center rounded-full border-2 border-accent bg-surface text-accent text-xs font-bold shadow-2xs">
                        {{ i + 1 }}
                      </span>
                    }
                  </div>

                  <!-- Contenu de l'étape -->
                  <div class="mt-3 flex flex-col gap-1">
                    <div class="flex items-center gap-1.5">
                      <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-surface-muted text-ink-muted border border-line/60">
                        Phase {{ i + 1 }}
                      </span>
                      <p class="text-[10px] font-bold uppercase tracking-wider text-ink-muted truncate">
                        {{ part.nomCohorte }}
                      </p>
                    </div>
                    
                    <p class="text-xs font-bold text-ink leading-tight">
                      {{ part.nomPhase }}
                    </p>

                    <p class="text-[11px] text-ink-muted">
                      {{ part.dateEntree | date:'dd/MM/yyyy' }}
                      @if (part.dateSortie) { → {{ part.dateSortie | date:'dd/MM/yyyy' }} }
                    </p>

                    @if (part.motifSortie) {
                      <p class="text-[11px] font-medium text-ink">
                        Motif : {{ part.motifSortie }}
                      </p>
                    }

                    @if (part.raison) {
                      <p class="text-[11px] text-ink-muted italic bg-surface-muted/50 p-2 rounded-lg border border-line/40 mt-1">
                        « {{ part.raison }} »
                      </p>
                    }

                    <div class="mt-2">
                      @if (part.active) {
                        <app-badge status="info" size="sm" class="w-fit font-bold">En cours</app-badge>
                      } @else {
                        <app-badge status="success" size="sm" class="w-fit font-bold">Terminée</app-badge>
                      }
                    </div>
                  </div>
                </li>
              }
            </ol>
          </div>
        </app-card>
      }
    </div>

    <!-- Missions -->
    <div>
      <h2 class="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">Missions</h2>
      @if (missions().length === 0) {
        <p class="text-sm text-gray-400 italic">Aucune mission assignée.</p>
      } @else {
        <div class="rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <table class="w-full text-sm">
            <tbody class="divide-y divide-gray-100 dark:divide-white/5">
              @for (m of missions(); track m.id) {
                <tr class="hover:bg-gray-50 dark:hover:bg-white/5">
                  <td class="px-4 py-3">
                    <a [routerLink]="['/incubateur/missions', m.id]" class="font-medium text-gray-900 dark:text-white hover:text-indigo-500">{{ m.titre }}</a>
                  </td>
                  <td class="px-4 py-3 text-xs text-gray-400">{{ m.dateEcheance ?? '' }}</td>
                  <td class="px-4 py-3 text-right">
                    <app-badge size="sm">{{ m.statut }}</app-badge>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  }

  @if (!loading() && !projet()) {
    <app-empty-state icon="folder" title="Projet introuvable" description="Ce projet n'existe pas ou a été supprimé.">
      <app-button variant="secondary" routerLink="/incubateur/projets">Retour</app-button>
    </app-empty-state>
  }
</div>

<!-- Modale archivage -->
@if (showArchiveModal()) {
  <app-modal title="Archiver le projet" maxWidth="md" (close)="showArchiveModal.set(false)">
    <p class="text-sm text-gray-600 dark:text-gray-300">
      Archiver <strong>{{ projet()?.nom }}</strong> ? Il sera masqué des listes principales.
    </p>
    <div class="mt-4 flex justify-end gap-3">
      <app-button variant="ghost" (click)="showArchiveModal.set(false)">Annuler</app-button>
      <app-button variant="primary" (click)="confirmerArchivage()">Archiver</app-button>
    </div>
  </app-modal>
}

<!-- Modale de promotion (remplacement du panneau latéral) -->
@if (promotionOuverte()) {
  <app-modal
    title="Promouvoir ce projet"
    subtitle="Sélectionnez la cohorte cible pour faire avancer le projet."
    maxWidth="md"
    (close)="promotionOuverte.set(false)"
  >
    <div class="space-y-5">
      <div>
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Cohorte cible *</p>
        @if (loadingEligibles()) {
          <p class="text-sm text-gray-400">Chargement...</p>
        } @else if (cohortesEligibles().length === 0) {
          <p class="text-sm text-gray-400 italic">Aucune cohorte éligible.</p>
        } @else {
          <div class="space-y-2 max-h-60 overflow-y-auto pr-1">
            @for (c of cohortesEligibles(); track c.id) {
              <label class="flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                [class]="cohorteCibleId() === c.id ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'border-gray-200 dark:border-white/10'">
                <input type="radio" [value]="c.id" [checked]="cohorteCibleId() === c.id" (change)="cohorteCibleId.set(c.id)" class="text-indigo-600"/>
                <div>
                  <p class="text-sm font-medium text-gray-900 dark:text-white">{{ c.nom }}</p>
                  <p class="text-xs text-gray-500">Phase : {{ c.phase?.nom ?? '—' }}</p>
                </div>
              </label>
            }
          </div>
        }
      </div>

      <div>
        <label class="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Raison</label>
        <textarea [(ngModel)]="raisonPromotion" rows="2" placeholder="Raison optionnelle..."
          class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"></textarea>
      </div>

      @if (promotion409()) {
        <div class="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-500/10 p-4 space-y-3">
          <p class="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
            <app-icon name="alert-circle" class="w-4 h-4"/>Missions non validées
          </p>
          <ul class="space-y-1">
            @for (m of promotion409()!.missionsNonValidees; track m.titre) {
              <li class="text-xs text-amber-700 dark:text-amber-400">• {{ m.titre }} — {{ m.statut }}</li>
            }
          </ul>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" [(ngModel)]="forcerPromotion" class="rounded text-amber-500"/>
            <span class="text-sm text-amber-800 dark:text-amber-300 font-medium">Promouvoir quand même</span>
          </label>
        </div>
      }
    </div>

    <div class="mt-6 flex justify-end gap-3 border-t border-gray-200 dark:border-white/10 pt-4">
      <app-button variant="secondary" size="sm" (click)="promotionOuverte.set(false)">Annuler</app-button>
      <app-button variant="primary" size="sm" [disabled]="!cohorteCibleId() || promotionEnCours()" (click)="lancerPromotion()">
        {{ promotionEnCours() ? 'Promotion...' : 'Promouvoir' }}
      </app-button>
    </div>
  </app-modal>
}
  `,
})
export class ProjetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  readonly projet = signal<Projet | undefined>(undefined);
  readonly missions = signal<Mission[]>([]);
  readonly historique = signal<ParticipationCohorteResponse[]>([]);
  
  // Computed pour inverser l'ordre de l'historique (le plus ancien en premier, le plus récent en dernier)
  readonly historiqueInverse = computed(() => [...this.historique()].reverse());

  readonly cohortesEligibles = signal<Cohorte[]>([]);
  readonly loading = signal(true);
  readonly loadingHistorique = signal(false);
  readonly loadingEligibles = signal(false);
  readonly isArchiving = signal(false);
  readonly showArchiveModal = signal(false);
  readonly promotionOuverte = signal(false);
  readonly promotionEnCours = signal(false);
  readonly cohorteCibleId = signal('');
  raisonPromotion = '';
  forcerPromotion = false;
  readonly promotion409 = signal<Promotion409 | null>(null);

  readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const p = this.projet();
    const items: BreadcrumbItem[] = [{ label: 'Projets', url: '/incubateur/projets' }];
    if (p?.cohorteId && p.nomCohorte) items.push({ label: p.nomCohorte, url: `/incubateur/cohortes/${p.cohorteId}` });
    if (p) items.push({ label: p.nom });
    return items;
  });

  canPromote(): boolean {
    const r = this.structureCtx.activeRole();
    return r === 'ADMIN_STRUCTURE' || r === 'COACH';
  }

  soustitre(p: Projet): string {
    const parts: string[] = [];
    if (p.nomParcours) parts.push(p.nomParcours);
    if (p.nomPhase) parts.push(`Phase : ${p.nomPhase}`);
    else if (p.nomCohorte) parts.push(`Cohorte : ${p.nomCohorte}`);
    return parts.join(' · ');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.loading.set(false); return; }
    this.projetService.getById(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (p) => {
        this.projet.set(p); this.loading.set(false);
        this.missionService.getByProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: m => this.missions.set(m), error: () => {} });
        this.loadingHistorique.set(true);
        this.projetService.getHistorique(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: h => { this.historique.set(h); this.loadingHistorique.set(false); }, error: () => this.loadingHistorique.set(false) });
      },
      error: () => this.loading.set(false),
    });
  }

  ouvrirPromotion(): void {
    const p = this.projet(); if (!p) return;
    this.promotion409.set(null); this.cohorteCibleId.set(''); this.raisonPromotion = ''; this.forcerPromotion = false;
    this.promotionOuverte.set(true); this.loadingEligibles.set(true);
    this.projetService.getCohortesEligibles(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: c => { this.cohortesEligibles.set(c); this.loadingEligibles.set(false); }, error: () => this.loadingEligibles.set(false) });
  }

  lancerPromotion(): void {
    const p = this.projet(); if (!p || !this.cohorteCibleId()) return;
    if (this.forcerPromotion && !this.raisonPromotion.trim()) { alert('Raison obligatoire.'); return; }
    this.promotionEnCours.set(true); this.promotion409.set(null);
    const req: PromouvoirProjetRequest = { cohorteCibleId: this.cohorteCibleId(), raison: this.raisonPromotion.trim() || undefined, forcer: this.forcerPromotion };
    this.projetService.promouvoir(p.id, req).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: updated => { this.projet.set(updated); this.promotionEnCours.set(false); this.promotionOuverte.set(false); this.projetService.getHistorique(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe(h => this.historique.set(h)); },
      error: (err: HttpErrorResponse) => { this.promotionEnCours.set(false); if (err.status === 409) this.promotion409.set(err.error); else alert('Erreur : ' + (err.error?.message ?? err.message)); },
    });
  }

  confirmerArchivage(): void {
    const p = this.projet(); if (!p) return;
    this.isArchiving.set(true);
    this.projetService.archiverProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => { this.isArchiving.set(false); this.showArchiveModal.set(false); this.router.navigate(['/incubateur/projets']); }, error: () => { this.isArchiving.set(false); alert('Erreur lors de l\'archivage.'); } });
  }

  restaurer(): void {
    const p = this.projet(); if (!p) return;
    this.projetService.restaurerProjet(p.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({ next: () => this.projet.update(x => x ? { ...x, archive: false } : x), error: () => alert('Erreur restauration.') });
  }

  statutBadge(statut: string): 'success' | 'warning' | 'neutral' | 'danger' {
    const m: Record<string, 'success' | 'warning' | 'neutral' | 'danger'> = { VALIDE: 'success', EN_COURS: 'warning', A_FAIRE: 'neutral', A_REVOIR: 'danger', SOUMIS: 'warning' };
    return m[statut] ?? 'neutral';
  }
}