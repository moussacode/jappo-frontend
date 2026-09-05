import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { Entrepreneur, Projet, Cohorte } from '../../../../core/models';
import { Icon } from "../../../../shared/components/icon/icon";

interface LigneEntrepreneur {
  entrepreneur: Entrepreneur;
  projet: Projet | undefined;
  nomCohorte: string;
}

@Component({
  selector: 'app-entrepreneurs-list',
  imports: [RouterLink, Icon],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-[24px] font-normal leading-[1.33] text-ink">Entrepreneurs</h1>
          <p class="mt-1 text-sm text-ink-muted">{{ lignes().length }} entrepreneurs suivis</p>
        </div>
        <a
          routerLink="/incubateur/entrepreneurs/inviter"
          class="rounded-[var(--radius-button)] flex items-center gap-2 bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90"
        >
          <app-icon
            name="plus"
            class="size-4 flex items-center justify-center text-white"
          /> Inviter un entrepreneur
        </a>
      </div>

      <div class="rounded-[var(--radius-card)] border border-line bg-surface">
        <div class="grid grid-cols-[1fr_180px_140px_100px] gap-3 border-b border-line px-5 py-3 text-xs font-medium text-ink-faint">
          <span>ENTREPRENEUR</span>
          <span>COHORTE</span>
          <span>PROJET</span>
          <span>SCORE</span>
        </div>
        @for (ligne of lignes(); track ligne.entrepreneur.id) {
          <a
            [routerLink]="['/incubateur/entrepreneurs', ligne.entrepreneur.id]"
            class="grid grid-cols-[1fr_180px_140px_100px] items-center gap-3 border-b border-line px-5 py-3.5 last:border-0 hover:bg-surface-muted"
          >
            <span class="text-sm font-medium text-ink">{{ ligne.entrepreneur.nom }}</span>
            <span class="text-sm text-ink-muted">{{ ligne.nomCohorte }}</span>
            <span class="text-sm text-ink-muted">{{ ligne.projet?.nom ?? '—' }}</span>
            <span class="text-sm font-medium text-ink">{{ ligne.projet?.scoreMaturite ?? 0 }}%</span>
          </a>
        } @empty {
          <p class="px-5 py-8 text-center text-sm text-ink-muted">Aucun entrepreneur pour le moment.</p>
        }
      </div>
    </div>
  `,
})
export class EntrepreneursList {
  private readonly authService = inject(AuthService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly cohorteService = inject(CohorteService);

  protected readonly lignes = signal<LigneEntrepreneur[]>([]);

  constructor() {
    const user = this.authService.currentUser();
    if (!this.authService.isMembreEquipe(user)) return;

    this.cohorteService.getByStructure(user.structureId).subscribe((cohortes) => {
      const cohortesParId = new Map<string, Cohorte>(cohortes.map((c) => [c.id, c]));

      for (const cohorte of cohortes) {
        this.projetService.getByCohorte(cohorte.id).subscribe((projets) => {
          for (const projet of projets) {
            this.entrepreneurService.getById(projet.entrepreneurId).subscribe((entrepreneur) => {
              if (!entrepreneur) return;
              this.lignes.update((existantes) => [
                ...existantes,
                { entrepreneur, projet, nomCohorte: cohortesParId.get(projet.cohorteId ?? '')?.nom ?? '—' },
              ]);
            });
          }
        });
      }
    });
  }
}