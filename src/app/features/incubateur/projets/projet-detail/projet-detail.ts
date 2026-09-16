import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { Projet, Mission } from '../../../../core/models';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [
    RouterLink,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    ModalComponent,
    BreadcrumbComponent,
],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8 font-sans">
      
      <!-- Fil d'Ariane Contextuel -->
      <app-breadcrumb [items]="breadcrumbItems()" />

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="flex flex-col gap-6 animate-pulse mt-2">
          <div class="h-20 rounded-2xl bg-surface-muted/40 border border-line"></div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            @for (i of [1, 2, 3]; track i) { <div class="h-24 rounded-2xl bg-surface-muted/40 border border-line"></div> }
          </div>
          <div class="h-64 rounded-2xl bg-surface-muted/40 border border-line"></div>
        </div>
      } @else if (projet(); as p) {
        
        <!-- EN-TÊTE DU PROJET -->
        <app-page-header
          [title]="p.nom"
          [subtitle]="'Secteur : ' + (p.secteur || 'Non renseigné') + (p.nomCohorte ? ' · Cohorte : ' + p.nomCohorte : '')"
        >
          <div class="flex items-center gap-3">
            <app-badge [status]="statutBadge(p.statut).status" size="md">
              {{ statutBadge(p.statut).label }}
            </app-badge>

            <button
              type="button"
              (click)="showArchiveModal.set(true)"
              class="rounded-lg border border-rose-500/30 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors shadow-sm"
            >
              Archiver
            </button>
          </div>
        </app-page-header>

        <!-- GRILLE DE SYNTHÈSE (KPIs / Infos clés) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <app-card padding="lg" >
            <div class="flex items-center gap-3 mb-2">
              
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted">Score de maturité</span>
            </div>
            <div class="mt-2 flex-col justify-center gap-6">
              <span class="text-3xl font-extrabold text-ink tracking-tight">{{ p.scoreMaturite }}%</span>
              <div class="flex-1 h-2 bg-line/60 rounded-full overflow-hidden">
                <div 
                  class="h-full bg-gradient-to-r from-accent to-orange-400 transition-all duration-500 ease-out" 
                  [style.width.%]="p.scoreMaturite || 0"
                ></div>
              </div>
            </div>
          </app-card>

          <app-card padding="lg">
            <div class="flex items-center gap-3 mb-2">
             
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted">Missions assignées</span>
            </div>
            <div class="mt-2 text-3xl font-extrabold text-ink tracking-tight">{{ missions().length }} <span class="text-sm font-medium text-ink-muted">jalon(s)</span></div>
          </app-card>

          <app-card padding="lg" >
            <div class="flex items-center gap-3 mb-2">
              
              <span class="text-xs font-semibold uppercase tracking-wider text-ink-muted">Phase actuelle</span>
            </div>
            <div class="mt-2 text-lg font-extrabold text-ink truncate">{{ p.statut || 'En cours' }}</div>
          </app-card>

        </div>

        <!-- SECTION MISSIONS ASSOCIÉES -->
        <div class="flex items-center justify-between mt-4">
          <h2 class="text-base font-bold text-ink flex items-center gap-2">Missions et jalons</h2>
        </div>

        <app-card padding="none" class="w-full min-w-0 overflow-hidden border border-line/60 shadow-xs rounded-2xl">
          <table class="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead>
              <tr class="border-b border-line bg-surface-muted/30 text-xs font-bold uppercase tracking-wider text-ink-muted">
                <th class="w-7/12 px-6 py-4">Titre de la mission</th>
                <th class="w-3/12 px-6 py-4 text-center">Statut</th>
                <th class="w-2/12 px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line/60 bg-surface">
              @for (mission of missions(); track mission.id) {
                <tr class="group transition-all duration-200 hover:bg-surface-muted/30 cursor-pointer" [routerLink]="['/incubateur/missions', mission.id]">
                  <td class="px-6 py-4">
                    <div class="flex flex-col">
                      <span class="font-bold text-ink transition-colors group-hover:text-accent">{{ mission.titre }}</span>
                      @if (mission.dateEcheance) {
                        <span class="text-xs text-ink-muted mt-0.5">Échéance : {{ mission.dateEcheance }}</span>
                      }
                    </div>
                  </td>
                  <td class="px-6 py-4 text-center">
                    <app-badge status="neutral" size="sm" class="font-bold">
                      {{ mission.statut || 'En cours' }}
                    </app-badge>
                  </td>
                  <td class="px-6 py-4 text-right">
                    <app-icon name="arrow-right" class="size-4 text-ink-muted transition-colors group-hover:text-accent ml-auto" />
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="3" class="p-10 text-center text-sm text-ink-muted bg-surface-muted/10">
                    <div class="flex flex-col items-center justify-center">
                      <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line/60">
                        <app-icon name="missions" class="size-5" />
                      </div>
                      <p class="font-bold text-ink">Aucune mission associée</p>
                      <p class="text-xs mt-1">Ce projet n'a pas encore de jalons pédagogiques actifs.</p>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </app-card>

      } @else {
        <!-- CAS INTROUVABLE -->
        <app-empty-state title="Projet introuvable">
          <p class="text-sm text-ink-muted mt-1">Le projet demandé n'existe pas ou a été supprimé.</p>
          <a routerLink="/incubateur/projets" class="mt-4 inline-block">
            <app-button size="sm">Retourner au portefeuille</app-button>
          </a>
        </app-empty-state>
      }

    </div>

    <!-- MODALE : ARCHIVER LE PROJET -->
    <!-- MODALE : ARCHIVER LE PROJET -->
    @if (showArchiveModal()) {
      <app-modal title="Archiver le projet" maxWidth="md" (close)="showArchiveModal.set(false)">
        <div class="flex items-start gap-3.5">
          
          <div>
            <h4 class="text-sm font-bold text-ink">Confirmation requise</h4>
            <p class="text-xs text-ink-muted mt-1 leading-relaxed">
              Êtes-vous sûr de vouloir archiver <strong>{{ projet()?.nom }}</strong> ? Il ne sera plus actif dans l'incubation et sera masqué des listes principales.
            </p>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
          <app-button variant="ghost" size="sm" (click)="showArchiveModal.set(false)">Annuler</app-button>
          <button
            class="rounded-xl bg-rose-700 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50 cursor-pointer shadow-sm"
            [disabled]="isArchiving()"
            (click)="confirmerArchivage()"
          >
            {{ isArchiving() ? 'Archivage en cours...' : 'Oui, archiver' }}
          </button>
        </div>
      </app-modal>}
  `,
})
export class ProjetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly isArchiving = signal<boolean>(false);
  protected readonly showArchiveModal = signal<boolean>(false);

  protected readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => {
    const p = this.projet();
    const items: BreadcrumbItem[] = [
      { label: 'Portefeuille', url: '/incubateur/projets' },
    ];

    if (!p) return items;

    if (p.cohorteId && p.nomCohorte) {
      items.push({
        label: p.nomCohorte,
        url: '/incubateur/cohortes',
        queryParams: { cohorteId: p.cohorteId },
      });
    }

    if (p.entrepreneurId && p.nomEntrepreneur) {
      items.push({
        label: p.nomEntrepreneur,
        url: `/incubateur/entrepreneurs/${p.entrepreneurId}`,
      });
    }

    items.push({
      label: p.nom,
    });

    return items;
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loading.set(false);
      return;
    }

    this.projetService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.projet.set(p);
          this.loading.set(false);
          // Chargement des missions associées
          this.missionService
            .getByProjet(p.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((m) => this.missions.set(m));
        },
        error: (err) => {
          console.error('Erreur projet :', err);
          this.loading.set(false);
        },
      });
  }

  protected confirmerArchivage(): void {
    const p = this.projet();
    if (!p) return;
    
    this.isArchiving.set(true);

    this.projetService.archiverProjet(p.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isArchiving.set(false);
          this.showArchiveModal.set(false);
          this.router.navigate(['/incubateur/projets']);
        },
        error: (err) => {
          console.error('Erreur lors de l\'archivage du projet:', err);
          this.isArchiving.set(false);
          this.showArchiveModal.set(false);
        },
      });
  }

  protected statutBadge(statut: string): { status: BadgeStatus; label: string } {
    switch (statut?.toUpperCase()) {
      case 'EN_INCUBATION': 
        return { status: 'success', label: 'En incubation' };
      case 'DIAGNOSTIC': 
        return { status: 'info', label: 'Diagnostic' };
      default: 
        return { status: 'neutral', label: statut || 'En cours' };
    }
  }
}