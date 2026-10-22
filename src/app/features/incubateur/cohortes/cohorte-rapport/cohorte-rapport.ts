import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CohorteService } from '../../../../core/services/cohorte.service';
import {
  RapportCohorte,
  RapportCohorteLigne,
  SituationRapport,
  libelleStade,
} from '../../../../core/models/cohorte.model';
import { downloadCsv } from '../../../../core/utils/csv-export';
import { BreadcrumbComponent, BreadcrumbItem } from '../../../../shared/components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { LoadingState } from '../../../../shared/components/loading-state/loading-state';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ENTETES_CSV_RAPPORT, LIBELLES_SITUATION, lignesCsvRapport } from './cohorte-rapport-csv';

type FiltreSituation = 'TOUS' | SituationRapport;

const BADGES_SITUATION: Record<SituationRapport, BadgeStatus> = {
  EN_COURS: 'info',
  PROMU: 'primary',
  DIPLOME: 'success',
  ABANDON: 'danger',
  RETIRE: 'neutral',
};

@Component({
  selector: 'app-cohorte-rapport',
  imports: [
    RouterLink,
    DatePipe,
    BreadcrumbComponent,
    PageHeaderComponent,
    ButtonComponent,
    Icon,
    KpiCardComponent,
    BadgeComponent,
    CardComponent,
    TabFilterComponent,
    LoadingState,
    ErrorState,
    EmptyStateComponent,
  ],
  template: `
<div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
  <app-breadcrumb [items]="breadcrumb()" />

  @if (chargement()) {
    <app-loading-state message="Génération du rapport..." />
  } @else if (erreur()) {
    <app-error-state
      title="Rapport indisponible"
      [description]="erreur()!"
      (retry)="charger()"
    />
  } @else if (rapport(); as r) {
    <app-page-header [title]="'Rapport · ' + r.nomCohorte" [subtitle]="sousTitre(r)">
      <app-button
        variant="primary"
        size="sm"
        [disabled]="r.projets.length === 0"
        (click)="exporterCsv()"
      >
        <app-icon name="download" class="mr-1.5 size-4" />
        Exporter CSV
      </app-button>
    </app-page-header>

    <p class="-mt-3 text-xs text-ink-muted">
      @if (r.dateDebut) { Du {{ r.dateDebut | date: 'dd/MM/yyyy' }} }
      @if (r.dateFin) { au {{ r.dateFin | date: 'dd/MM/yyyy' }} · }
      Généré le {{ r.dateGeneration | date: 'dd/MM/yyyy à HH:mm' }}
    </p>

    <!-- Synthèse -->
    <section aria-labelledby="titre-synthese" class="flex flex-col gap-3">
      <h2 id="titre-synthese" class="text-sm font-semibold text-ink">Synthèse</h2>
      <div class="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <app-kpi-card label="Projets accueillis" [value]="r.synthese.projets"
          [note]="r.synthese.enCours + ' en cours'" />
        <app-kpi-card label="Promus" [value]="r.synthese.promus" note="Vers une phase supérieure" />
        <app-kpi-card label="Diplômés" [value]="r.synthese.diplomes" noteVariant="success"
          [note]="tauxSur(r.synthese.diplomes, r.synthese.projets) + ' des projets'" />
        <app-kpi-card label="Abandons" [value]="r.synthese.abandons"
          [note]="r.synthese.retires > 0 ? r.synthese.retires + ' autre(s) retrait(s)' : tauxSur(r.synthese.abandons, r.synthese.projets) + ' des projets'" />
        <app-kpi-card label="Missions validées" [value]="r.synthese.tauxValidationMissions + ' %'"
          [note]="r.synthese.missionsValidees + ' / ' + r.synthese.missionsTotal" />
        <app-kpi-card label="Avancement moyen" [value]="r.synthese.avancementMoyen !== null ? r.synthese.avancementMoyen + ' %' : '—'"
          note="Sur le parcours" />
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <app-card padding="md">
          <div class="flex items-start gap-3">
            <app-icon name="warning" class="mt-0.5 size-5 shrink-0" [class]="r.synthese.missionsEnRetard > 0 ? 'text-danger' : 'text-ink-faint'" />
            <div>
              <p class="text-sm font-semibold text-ink">
                {{ r.synthese.missionsEnRetard }} mission(s) en retard
              </p>
              <p class="text-xs text-ink-muted">
                {{ r.synthese.projetsEnRetard }} projet(s) concerné(s) — non validées, échéance dépassée.
              </p>
            </div>
          </div>
        </app-card>
        <app-card padding="md">
          <div class="flex items-start gap-3">
            <app-icon name="document-text" class="mt-0.5 size-5 shrink-0" [class]="aTraiter(r) > 0 ? 'text-warning' : 'text-ink-faint'" />
            <div>
              <p class="text-sm font-semibold text-ink">{{ aTraiter(r) }} livrable(s) à traiter</p>
              <p class="text-xs text-ink-muted">
                {{ r.synthese.livrablesEnAttente }} en attente d'évaluation · {{ r.synthese.livrablesACorriger }} à corriger ·
                {{ r.synthese.livrablesValides }} validé(s)
              </p>
            </div>
          </div>
        </app-card>
      </div>
    </section>

    <!-- Détail par projet -->
    <section aria-labelledby="titre-projets" class="flex flex-col gap-3">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="titre-projets" class="text-sm font-semibold text-ink">Projets</h2>
        <app-tab-filter
          [options]="optionsFiltre()"
          [value]="filtre()"
          (valueChange)="filtre.set($event)"
          class="w-full sm:w-fit"
        />
      </div>

      @if (lignesFiltrees().length === 0) {
        <app-empty-state
          iconName="folder"
          title="Aucun projet"
          [description]="r.projets.length === 0 ? 'Aucun projet n\\'est encore passé par cette cohorte.' : 'Aucun projet dans cette situation.'"
        />
      } @else {
        <div class="overflow-x-auto rounded-card border border-line bg-surface">
          <table class="w-full min-w-[56rem] text-left text-sm">
            <caption class="sr-only">Détail des projets de la cohorte {{ r.nomCohorte }}</caption>
            <thead class="border-b border-line bg-surface-muted text-xs uppercase tracking-wide text-ink-muted">
              <tr>
                <th scope="col" class="px-4 py-3 font-semibold">Projet</th>
                <th scope="col" class="px-4 py-3 font-semibold">Situation</th>
                <th scope="col" class="px-4 py-3 font-semibold">Phase actuelle</th>
                <th scope="col" class="px-4 py-3 text-right font-semibold">Missions</th>
                <th scope="col" class="px-4 py-3 text-right font-semibold">En retard</th>
                <th scope="col" class="px-4 py-3 text-right font-semibold">Livrables</th>
                <th scope="col" class="px-4 py-3 text-right font-semibold">Avancement</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              @for (l of lignesFiltrees(); track l.projetId) {
                <tr class="align-top">
                  <th scope="row" class="px-4 py-3 font-normal">
                    <a [routerLink]="['/incubateur/projets', l.projetId]"
                      class="font-semibold text-ink hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                      {{ l.nomProjet }}
                    </a>
                    <p class="text-xs text-ink-muted">{{ l.nomEntrepreneur ?? '—' }}</p>
                  </th>
                  <td class="px-4 py-3">
                    <app-badge [status]="badgeSituation(l.situation)" size="sm">{{ libelleSituation(l.situation) }}</app-badge>
                    <p class="mt-1 text-xs text-ink-muted">
                      {{ l.dateEntree | date: 'dd/MM/yyyy' }}
                      @if (l.dateSortie) { → {{ l.dateSortie | date: 'dd/MM/yyyy' }} }
                    </p>
                    @if (l.raisonSortie) {
                      <p class="mt-0.5 max-w-56 text-xs text-ink-muted" [title]="l.raisonSortie">{{ l.raisonSortie }}</p>
                    }
                  </td>
                  <td class="px-4 py-3">
                    <span class="text-ink">{{ l.phaseActuelle ?? '—' }}</span>
                    @if (libelleStade(l.stadeActuel); as stade) {
                      <p class="text-xs text-ink-muted">{{ stade }}</p>
                    }
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums text-ink">{{ l.missionsValidees }} / {{ l.missionsTotal }}</td>
                  <td class="px-4 py-3 text-right tabular-nums" [class]="l.missionsEnRetard > 0 ? 'font-semibold text-danger' : 'text-ink-muted'">
                    {{ l.missionsEnRetard }}
                  </td>
                  <td class="px-4 py-3 text-right text-xs text-ink-muted">
                    <span class="tabular-nums text-ink">{{ l.livrablesValides }}</span> validé(s)
                    @if (l.livrablesEnAttente + l.livrablesACorriger > 0) {
                      <p class="text-warning">{{ l.livrablesEnAttente + l.livrablesACorriger }} à traiter</p>
                    }
                  </td>
                  <td class="px-4 py-3 text-right tabular-nums text-ink">{{ l.avancement !== null ? l.avancement + ' %' : '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </section>
  }
</div>
  `,
})
export class CohorteRapport implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly cohorteService = inject(CohorteService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly cohorteId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly rapport = signal<RapportCohorte | null>(null);
  readonly chargement = signal(true);
  readonly erreur = signal<string | null>(null);
  readonly filtre = signal<FiltreSituation>('TOUS');
  readonly libelleStade = libelleStade;

  readonly breadcrumb = computed<BreadcrumbItem[]>(() => [
    { label: 'Cohortes', url: '/incubateur/cohortes' },
    { label: this.rapport()?.nomCohorte ?? 'Cohorte', url: `/incubateur/cohortes/${this.cohorteId}` },
    { label: 'Rapport' },
  ]);

  readonly optionsFiltre = computed<TabOption<FiltreSituation>[]>(() => {
    const lignes = this.rapport()?.projets ?? [];
    const compter = (s: SituationRapport) => lignes.filter((l) => l.situation === s).length;
    const options: TabOption<FiltreSituation>[] = [{ label: 'Tous', value: 'TOUS', count: lignes.length }];
    (Object.keys(LIBELLES_SITUATION) as SituationRapport[])
      .filter((s) => compter(s) > 0)
      .forEach((s) => options.push({ label: LIBELLES_SITUATION[s], value: s, count: compter(s) }));
    return options;
  });

  readonly lignesFiltrees = computed<RapportCohorteLigne[]>(() => {
    const lignes = this.rapport()?.projets ?? [];
    const filtre = this.filtre();
    return filtre === 'TOUS' ? lignes : lignes.filter((l) => l.situation === filtre);
  });

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.cohorteService
      .getRapport(this.cohorteId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (r) => {
          this.rapport.set(r);
          this.chargement.set(false);
        },
        error: (err) => {
          this.erreur.set(err?.error?.message ?? 'Impossible de générer le rapport pour le moment.');
          this.chargement.set(false);
        },
      });
  }

  exporterCsv(): void {
    const r = this.rapport();
    if (!r) return;
    const date = r.dateGeneration.slice(0, 10);
    downloadCsv(`rapport-${r.nomCohorte}-${date}`, ENTETES_CSV_RAPPORT, lignesCsvRapport(r));
  }

  sousTitre(r: RapportCohorte): string {
    return [r.nomProgramme, r.nomParcours, r.nomPhase, libelleStade(r.stade)].filter(Boolean).join(' · ');
  }

  aTraiter(r: RapportCohorte): number {
    return r.synthese.livrablesEnAttente + r.synthese.livrablesACorriger;
  }

  tauxSur(valeur: number, total: number): string {
    return total === 0 ? '0 %' : `${Math.round((valeur * 100) / total)} %`;
  }

  libelleSituation(s: SituationRapport): string {
    return LIBELLES_SITUATION[s] ?? s;
  }

  badgeSituation(s: SituationRapport): BadgeStatus {
    return BADGES_SITUATION[s] ?? 'neutral';
  }
}
