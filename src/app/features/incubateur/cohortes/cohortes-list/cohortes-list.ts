import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { Cohorte, Projet } from '../../../../core/models';
import { Icon } from '../../../../shared/components/icon/icon';

interface CohorteAffichee {
  cohorte: Cohorte;
  nbProjets: number;
  scoreMoyen: number;
}

@Component({
  selector: 'app-cohortes-list',
  imports: [RouterLink, Icon],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[24px] font-normal leading-[1.33] text-ink">Cohortes</h1>
          <p class="mt-1 text-sm text-ink-muted">{{ cohortesAffichees().length }} cohortes actives</p>
        </div>
        <a
          routerLink="/incubateur/cohortes/nouvelle"
          class="rounded-[var(--radius-button)] flex items-center gap-2 bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90"
        >
          <app-icon
            name="plus"
            class="size-4 flex items-center justify-center text-white"
          /> Nouvelle cohorte
        </a>
      </div>

      <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
        @for (item of cohortesAffichees(); track item.cohorte.id) {
          <a
            [routerLink]="['/incubateur/cohortes', item.cohorte.id]"
            class="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-4 hover:border-line-strong"
          >
            <div class="flex items-center justify-between">
              <h2 class="text-sm font-semibold text-ink">{{ item.cohorte.nom }}</h2>
              <span class="rounded-[var(--radius-pill)] bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-strong">
                {{ item.nbProjets }} projets
              </span>
            </div>
            <p class="text-xs text-ink-faint">{{ item.cohorte.secteur }}</p>
            <div class="flex items-center justify-between border-t border-line pt-3">
              <span class="text-xs text-ink-muted">Score moyen</span>
              <span class="text-sm font-medium text-ink">{{ item.scoreMoyen }}%</span>
            </div>
          </a>
        } @empty {
          <p class="col-span-full py-8 text-center text-sm text-ink-muted">Aucune cohorte pour le moment.</p>
        }
      </div>
    </div>
  `,
})
export class CohortesList {
  private readonly authService = inject(AuthService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);

  private readonly cohortes = signal<Cohorte[]>([]);
  private readonly projetsParCohorte = signal<Record<string, Projet[]>>({});

  protected readonly cohortesAffichees = computed<CohorteAffichee[]>(() =>
    this.cohortes().map((cohorte) => {
      const projets = this.projetsParCohorte()[cohorte.id] ?? [];
      const scoreMoyen =
        projets.length === 0 ? 0 : Math.round(projets.reduce((s, p) => s + p.scoreMaturite, 0) / projets.length);
      return { cohorte, nbProjets: projets.length, scoreMoyen };
    }),
  );

  constructor() {
    const user = this.authService.currentUser();
    console.log('USER CONNECTÉ :', user);
  
  console.log('EST MEMBRE :', this.authService.isMembreEquipe(user));
    if (!this.authService.isMembreEquipe(user)) return;

    this.cohorteService.getByStructure(user.structureId).subscribe((cohortes) => {
      this.cohortes.set(cohortes);
      for (const cohorte of cohortes) {
        this.projetService.getByCohorte(cohorte.id).subscribe((projets) => {
          this.projetsParCohorte.update((map) => ({ ...map, [cohorte.id]: projets }));
        });
      }
    });
  }
}