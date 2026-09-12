import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { Cohorte, Projet } from '../../../../core/models';

interface ProjetAffiche {
  projet: Projet;
  nomEntrepreneur: string;
}

@Component({
  selector: 'app-cohorte-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a
        routerLink="/incubateur/cohortes"
        class="text-sm font-medium text-ink-muted hover:text-ink transition-colors"
      >
        ← Cohortes
      </a>

      @if (isLoading()) {
        <div class="flex items-center justify-center py-12 text-sm text-ink-muted">
          Chargement des détails de la cohorte...
        </div>
      } @else if (cohorte(); as c) {
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-[24px] font-normal leading-[1.33] text-ink">{{ c.nom }}</h1>
            <p class="mt-1 text-sm text-ink-muted">
              {{ c.description || c.secteur || 'Aucune description' }} · 
              Démarrée le {{ c.dateDebut || c.dateDemarrage || 'Date non définie' }}
            </p>
          </div>
          <a
            routerLink="/incubateur/missions/attribuer"
            class="rounded-[var(--radius-button)] bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90 transition-opacity"
          >
            + Attribuer une mission
          </a>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Entrepreneurs / Projets</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ projetsAffiches().length }}</p>
          </div>
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Score moyen</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ scoreMoyen() }}%</p>
          </div>
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-4">
            <p class="text-xs text-ink-muted">Projets à faible score (< 40%)</p>
            <p class="mt-1 text-2xl font-medium text-ink">{{ projetsAttention() }}</p>
          </div>
        </div>

        <div class="rounded-[var(--radius-card)] border border-line bg-surface">
          <div class="border-b border-line px-5 py-4">
            <h2 class="text-sm font-semibold text-ink">Membres et Projets de la cohorte</h2>
          </div>
          @for (item of projetsAffiches(); track item.projet.id) {
            <a
              [routerLink]="['/incubateur/entrepreneurs', item.projet.entrepreneurId || item.projet.id]"
              class="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-0 hover:bg-surface-muted transition-colors"
            >
              <div>
                <p class="text-sm font-medium text-ink">{{ item.nomEntrepreneur }}</p>
                <p class="text-xs text-ink-faint">{{ item.projet.nom }}</p>
              </div>
              <span
                class="rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-medium"
                [class]="(item.projet.scoreMaturite || 0) >= 40 ? 'bg-soft-mint text-vivid-green' : 'bg-accent-soft text-accent-strong'"
              >
                {{ item.projet.scoreMaturite || 0 }}%
              </span>
            </a>
          } @empty {
            <p class="px-5 py-8 text-center text-sm text-ink-muted">
              Aucun projet n'est rattaché à cette cohorte pour le moment.
            </p>
          }
        </div>
      } @else {
        <div class="rounded-[var(--radius-card)] border border-dashed border-line p-8 text-center">
          <p class="text-sm font-medium text-ink">Cohorte introuvable</p>
          <p class="mt-1 text-xs text-ink-muted">
            La cohorte demandée n'existe pas ou n'appartient pas à votre structure active.
          </p>
        </div>
      }
    </div>
  `,
})
export class CohorteDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cohorteId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly isLoading = signal<boolean>(true);
  protected readonly cohorte = signal<Cohorte | undefined>(undefined);
  protected readonly projetsAffiches = signal<ProjetAffiche[]>([]);

  protected readonly scoreMoyen = computed(() => {
    const projets = this.projetsAffiches();
    if (projets.length === 0) return 0;
    return Math.round(
      projets.reduce((s, p) => s + (p.projet.scoreMaturite || 0), 0) / projets.length
    );
  });

  protected readonly projetsAttention = computed(
    () => this.projetsAffiches().filter((p) => (p.projet.scoreMaturite || 0) < 40).length,
  );

  ngOnInit(): void {
    if (!this.cohorteId) {
      this.isLoading.set(false);
      return;
    }

    // Chargement des détails de la cohorte depuis Spring Boot
    this.cohorteService
      .getById(this.cohorteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.cohorte.set(data);
          this.loadProjets();
        },
        error: (err) => {
          console.error('Erreur chargement cohorte detail:', err);
          this.isLoading.set(false);
        },
      });
  }

  private loadProjets(): void {
    this.projetService
      .getByCohorte(this.cohorteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projets: Projet[]) => {
          this.projetsAffiches.set(
            projets.map((projet) => ({
              projet,
              nomEntrepreneur: projet.nomEntrepreneur ?? 'Entrepreneur',
            }))
          );
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des projets de la cohorte:', err);
          this.isLoading.set(false);
        },
      });
  }
}