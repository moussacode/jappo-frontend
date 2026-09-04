import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { Cohorte, Projet } from '../../../../core/models';

interface ProjetAffiche {
  projet: Projet;
  nomEntrepreneur: string;
}

@Component({
  selector: 'app-cohorte-detail',
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a routerLink="/incubateur/cohortes" class="text-sm font-medium text-ink-muted hover:text-ink"> ← Cohortes </a>

      @if (cohorte(); as c) {
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-[24px] font-normal leading-[1.33] text-ink">{{ c.nom }}</h1>
            <p class="mt-1 text-sm text-ink-muted">{{ c.secteur }} · Démarrée le {{ c.dateDemarrage }}</p>
          </div>
          <a
            routerLink="/incubateur/missions/attribuer"
            class="rounded-[var(--radius-button)] bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90"
          >
            + Attribuer une mission
          </a>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Entrepreneurs</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ projetsAffiches().length }}</p>
          </div>
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Score moyen</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ scoreMoyen() }}%</p>
          </div>
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Projets à faible score</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ projetsAttention() }}</p>
          </div>
        </div>

        <div class="rounded-[var(--radius-card)] border border-line bg-surface">
          <div class="border-b border-line px-5 py-4">
            <h2 class="text-sm font-semibold text-ink">Membres de la cohorte</h2>
          </div>
          @for (item of projetsAffiches(); track item.projet.id) {
            <a
              [routerLink]="['/incubateur/entrepreneurs', item.projet.entrepreneurId]"
              class="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0 hover:bg-surface-muted"
            >
              <div>
                <p class="text-sm font-medium text-ink">{{ item.nomEntrepreneur }}</p>
                <p class="text-xs text-ink-faint">{{ item.projet.nom }}</p>
              </div>
              <span
                class="rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium"
                [class]="item.projet.scoreMaturite >= 40 ? 'bg-soft-mint text-vivid-green' : 'bg-accent-soft text-accent-strong'"
              >
                {{ item.projet.scoreMaturite }}%
              </span>
            </a>
          } @empty {
            <p class="px-5 py-8 text-center text-sm text-ink-muted">Aucun entrepreneur dans cette cohorte.</p>
          }
        </div>
      }
    </div>
  `,
})
export class CohorteDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);

  private readonly cohorteId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly cohorte = signal<Cohorte | undefined>(undefined);
  protected readonly projetsAffiches = signal<ProjetAffiche[]>([]);

  protected readonly scoreMoyen = computed(() => {
    const projets = this.projetsAffiches();
    if (projets.length === 0) return 0;
    return Math.round(projets.reduce((s, p) => s + p.projet.scoreMaturite, 0) / projets.length);
  });

  protected readonly projetsAttention = computed(
    () => this.projetsAffiches().filter((p) => p.projet.scoreMaturite < 40).length,
  );

  constructor() {
    this.cohorteService.getById(this.cohorteId).subscribe((c) => this.cohorte.set(c));
    this.projetService.getByCohorte(this.cohorteId).subscribe((projets) => {
      // TODO backend réel : le nom de l'entrepreneur devrait être joint côté API,
      // même limitation que sur le Dashboard (voir son TODO pour le détail).
      const noms: Record<string, string> = {
        'ent-001': 'Awa Ndiaye',
        'ent-002': 'Moussa Diop',
        'ent-003': 'Fatou Sarr',
      };
      this.projetsAffiches.set(projets.map((projet) => ({ projet, nomEntrepreneur: noms[projet.entrepreneurId] ?? 'Entrepreneur' })));
    });
  }
}