import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
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

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [
    RouterLink,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-8 p-4 sm:p-6 lg:p-10">
      
      <!-- Bouton Retour -->
      <div>
        <a
          routerLink="/incubateur/projets"
          class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink cursor-pointer"
        >
          <app-icon name="arrow-left" class="size-3.5" />
          <span>Retour aux projets</span>
        </a>
      </div>

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <app-card padding="lg" class="flex flex-col gap-6 animate-pulse p-8">
          <div class="h-8 w-1/3 rounded-lg bg-line/40"></div>
          <div class="h-24 rounded-xl bg-line/30"></div>
          <div class="h-48 rounded-xl bg-line/20"></div>
        </app-card>
      } @else if (projet(); as p) {
        
        <!-- EN-TÊTE DU PROJET -->
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-6">
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center gap-3">
              <h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">{{ p.nom }}</h1>
              <app-badge [status]="statutBadge(p.statut).status" size="md">
                {{ statutBadge(p.statut).label }}
              </app-badge>
            </div>
            <p class="text-xs sm:text-sm text-ink-muted">
              Secteur : <strong class="text-ink font-medium">{{ p.secteur || 'Non renseigné' }}</strong> 
              @if (p.nomCohorte) {
                <span>· Cohorte : <strong class="text-ink font-medium">{{ p.nomCohorte }}</strong></span>
              }
            </p>
          </div>
        </div>

        <!-- GRILLE DE SYNTHÈSE (KPIs / Infos clés) -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-6">
          
          <app-card class="flex flex-col justify-between gap-3 p-6 shadow-2xs">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Score de maturité</span>
            <div class="flex items-center gap-3">
              <span class="text-2xl font-bold text-accent">{{ p.scoreMaturite || 0 }}%</span>
              <div class="flex-1 h-2 bg-line rounded-full overflow-hidden">
                <div 
                  class="h-full bg-accent rounded-full transition-all duration-300" 
                  [style.width.%]="p.scoreMaturite || 0"
                ></div>
              </div>
            </div>
          </app-card>

          <app-card class="flex flex-col justify-between gap-3 p-6 shadow-2xs">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Missions assignées</span>
            <span class="text-2xl font-bold text-ink">{{ missions().length }} jalon(s)</span>
          </app-card>

          <app-card class="flex flex-col justify-between gap-3 p-6 shadow-2xs">
            <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Phase actuelle</span>
            <span class="text-sm font-bold text-ink truncate">{{ p.statut || 'En cours' }}</span>
          </app-card>

        </div>

        <!-- SECTION MISSIONS ASSOCIÉES -->
        <!-- SECTION MISSIONS ASSOCIÉES -->
        <app-card padding="none" class="overflow-hidden shadow-2xs">
          <div class="flex items-center justify-between border-b border-line px-6 py-4 bg-surface-muted/30">
            <h2 class="text-sm font-bold text-ink">Missions et jalons du projet</h2>
            <span class="text-xs text-ink-muted">{{ missions().length }} mission(s)</span>
          </div>

          <div class="divide-y divide-line">
            @for (mission of missions(); track mission.id) {
              <a 
                [routerLink]="['/incubateur/missions', mission.id]"
                class="flex items-center justify-between px-6 py-4 transition-colors hover:bg-surface-muted/30 gap-4 cursor-pointer"
              >
                <div class="flex flex-col min-w-0">
                  <span class="text-xs sm:text-sm font-semibold text-ink truncate">{{ mission.titre }}</span>
                  @if (mission.dateEcheance) {
                    <span class="mt-0.5 text-[11px] text-ink-muted">Échéance : {{ mission.dateEcheance }}</span>
                  }
                </div>

                <div class="flex items-center gap-3 shrink-0">
                  <app-badge status="neutral" size="sm">
                    {{ mission.statut || 'En cours' }}
                  </app-badge>
                  <app-icon name="arrow-right" class="size-3.5 text-ink-muted" />
                </div>
              </a>
            } @empty {
              <div class="p-12 text-center flex flex-col items-center justify-center">
                <div class="flex size-10 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-2 border border-line">
                  <app-icon name="missions" class="size-5" />
                </div>
                <p class="text-xs font-semibold text-ink">Aucune mission associée</p>
                <p class="text-[11px] text-ink-muted mt-0.5">Ce projet n'a pas encore de jalons pédagogiques actifs.</p>
              </div>
            }
          </div>
        </app-card>

      } @else {
        <!-- CAS INTROUVABLE -->
        <app-card padding="lg" class="text-center py-16 shadow-2xs">
          <h2 class="text-base font-bold text-ink">Projet introuvable</h2>
          <p class="text-xs text-ink-muted mt-1">Le projet demandé n'existe pas ou a été supprimé.</p>
          <a routerLink="/incubateur/projets" class="mt-4 inline-block text-xs font-semibold text-accent hover:underline">
            Retourner à la liste des projets
          </a>
        </app-card>
      }

    </div>
  `,
})
export class ProjetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | null>(null);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly loading = signal(true);

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