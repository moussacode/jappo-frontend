import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { ProjetService } from '../../../../core/services/projet.service';

import { Structure, Cohorte, Projet } from '../../../../core/models';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { StructureService } from '../../../../core/services/structure.service';
import { CohorteService } from '../../../../core/services/cohorte.service';

interface ProjetAffiche {
  projet: Projet;
  nomEntrepreneur: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, KpiCardComponent, BadgeComponent],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <div>
        <h1 class="text-2xl font-semibold text-ink">Vue d'ensemble</h1>
        @if (structure(); as s) {
          <p class="mt-1 text-sm text-ink-muted">{{ s.nom }}</p>
        }
      </div>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
  <app-kpi-card 
    label="Entrepreneurs suivis" 
    [value]="projetsAffiches().length" 
    trend="+15.2%"
    trendLabel="Mois"
    trendDirection="up" 
  />
  <app-kpi-card 
    label="Cohortes actives" 
    [value]="cohortes().length" 
    trend="+4.1%"
    trendLabel="Mois"
    trendDirection="up" 
  />
  <app-kpi-card
    label="Score de maturité moyen"
    [value]="scoreMoyen() + '%'"
    note="Sur l'ensemble des projets"
    noteVariant="brand"
  />
  <app-kpi-card
    label="Projets à surveiller"
    [value]="projetsAttention()"
    note="Score inférieur à 40%"
    noteVariant="neutral"
  />
</div>

      <div class="rounded-[var(--radius-token-md)] border border-line bg-surface">
        <div class="border-b border-line px-5 py-4">
          <h2 class="text-base font-semibold text-ink">Entrepreneurs suivis</h2>
        </div>
        @for (item of projetsAffiches(); track item.projet.id) {
          <a
            [routerLink]="['/incubateur/entrepreneurs', item.projet.entrepreneurId]"
            class="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0 hover:bg-surface-muted"
          >
            <div>
              <p class="text-sm font-medium text-ink">{{ item.nomEntrepreneur }}</p>
              <p class="text-xs text-ink-muted">{{ item.projet.nom }}</p>
            </div>
            <app-badge [status]="item.projet.scoreMaturite >= 40 ? 'success' : 'warning'">
              {{ item.projet.scoreMaturite }}%
            </app-badge>
          </a>
        } @empty {
          <p class="px-5 py-8 text-center text-sm text-ink-muted">Aucun entrepreneur suivi pour le moment.</p>
        }
      </div>
    </div>
  `,
})
export class Dashboard {
  private readonly authService = inject(AuthService);
  private readonly structureService = inject(StructureService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);

  protected readonly structure = signal<Structure | undefined>(undefined);
  protected readonly cohortes = signal<Cohorte[]>([]);
  protected readonly projetsAffiches = signal<ProjetAffiche[]>([]);

  protected readonly scoreMoyen = computed(() => {
    const projets = this.projetsAffiches();
    if (projets.length === 0) return 0;
    const total = projets.reduce((sum, p) => sum + p.projet.scoreMaturite, 0);
    return Math.round(total / projets.length);
  });

  protected readonly projetsAttention = computed(
    () => this.projetsAffiches().filter((p) => p.projet.scoreMaturite < 40).length,
  );

  constructor() {
    const user = this.authService.currentUser();
    if (!this.authService.isMembreEquipe(user)) return;

    const structureId = user.structureId;
    this.structureService.getById(structureId).subscribe((s) => this.structure.set(s));
    this.cohorteService.getByStructure(structureId).subscribe((cohortes) => {
      this.cohortes.set(cohortes);
      for (const cohorte of cohortes) {
        this.projetService.getByCohorte(cohorte.id).subscribe((projets) => {
          const items: ProjetAffiche[] = projets.map((projet) => ({
            projet,
            nomEntrepreneur: this.nomEntrepreneur(projet.entrepreneurId),
          }));
          this.projetsAffiches.update((existants) => [...existants, ...items]);
        });
      }
    });
  }

  private nomEntrepreneur(entrepreneurId: string): string {
    // TODO backend réel : le nom viendrait directement de la réponse API (jointure côté serveur)
    // Provisoire : mapping en dur le temps que EntrepreneurService expose un lookup par id groupé
    const noms: Record<string, string> = {
      'ent-001': 'Awa Ndiaye',
      'ent-002': 'Moussa Diop',
      'ent-003': 'Fatou Sarr',
    };
    return noms[entrepreneurId] ?? 'Entrepreneur';
  }
}