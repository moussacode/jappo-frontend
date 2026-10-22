import { Component, computed, input } from '@angular/core';

import {
  FeuilleRouteProjet,
  StatutFeuilleRoute,
} from '../../../core/models/parcours.model';
import { BadgeComponent } from '../badge/badge';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-parcours-progress',
  standalone: true,
  imports: [BadgeComponent, TranslatePipe],
  template: `
    @if (feuilleRoute(); as route) {
      @if (route.phases.length === 0) {
        <div class="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
          <h3 class="text-sm font-semibold text-ink">
            {{ 'progression.parcours.indisponible' | translate }}
          </h3>
          <p class="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-ink-muted">
            {{ 'progression.parcours.indisponibleDescription' | translate }}
          </p>
        </div>
      } @else {
        <div class="overflow-hidden rounded-2xl border border-line bg-surface">
          <header class="border-b border-line bg-surface-muted/30 p-5 sm:p-6">
            <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
              <div class="min-w-0">
                <p class="text-[11px] font-bold uppercase tracking-wider text-accent">
                  {{ 'progression.parcours.surtitre' | translate }}
                </p>
                <h2 class="mt-1 text-lg font-bold tracking-tight text-ink">
                  {{ route.nomParcours || ('progression.parcours.titre' | translate) }}
                </h2>
                @if (route.nomProgramme) {
                  <p class="mt-1 text-xs text-ink-muted">
                    {{ 'progression.parcours.programme' | translate }} · {{ route.nomProgramme }}
                  </p>
                }
              </div>

              <div class="w-full sm:max-w-56">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="text-xs font-semibold text-ink-muted">
                    {{ 'progression.parcours.avancementGlobal' | translate }}
                  </span>
                  <strong class="text-lg font-extrabold tabular-nums text-ink">{{ avancement() }}%</strong>
                </div>
                <div
                  class="mt-2 h-2 overflow-hidden rounded-full bg-line"
                  role="progressbar"
                  [attr.aria-label]="'progression.parcours.avancementGlobal' | translate"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  [attr.aria-valuenow]="avancement()"
                >
                  <div
                    class="h-full rounded-full bg-accent transition-[width] duration-700 motion-reduce:transition-none"
                    [style.width.%]="avancement()"
                  ></div>
                </div>
              </div>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-muted">
              <span>
                <strong class="text-ink">{{ etapesTerminees() }}/{{ totalEtapes() }}</strong>
                {{ 'progression.parcours.etapesValidees' | translate }}
              </span>
              <span>
                <strong class="text-ink">{{ route.phases.length }}</strong>
                {{ 'progression.parcours.phases' | translate }}
              </span>
              @if (route.statutProgression) {
                <app-badge [status]="badgeStatus(route.statutProgression)" size="sm">
                  {{ statutKey(route.statutProgression) | translate }}
                </app-badge>
              }
            </div>
          </header>

          <div class="space-y-5 p-4 sm:p-6">
            @for (phase of route.phases; track phase.id) {
              <section
                class="overflow-hidden rounded-xl border border-line"
                [attr.aria-label]="('progression.parcours.phase' | translate) + ' ' + phase.ordre + ': ' + phase.nom"
              >
                <div class="flex flex-wrap items-center justify-between gap-3 bg-surface-muted/30 px-4 py-3 sm:px-5">
                  <div class="flex min-w-0 items-center gap-3">
                    <span
                      class="flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-extrabold"
                      [class]="isComplete(phase.statut)
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : isCurrent(phase.statut)
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line bg-surface text-ink-muted'"
                    >
                      {{ isComplete(phase.statut) ? '✓' : phase.ordre }}
                    </span>
                    <div class="min-w-0">
                      <p class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                        {{ 'progression.parcours.phase' | translate }} {{ phase.ordre }}
                      </p>
                      <h3 class="truncate text-sm font-bold text-ink">{{ phase.nom }}</h3>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-bold tabular-nums text-ink-muted">{{ clamp(phase.pourcentageAvancement) }}%</span>
                    <app-badge [status]="badgeStatus(phase.statut)" size="sm">
                      {{ statutKey(phase.statut) | translate }}
                    </app-badge>
                  </div>
                </div>

                <div class="px-4 pb-4 pt-3 sm:px-5">
                  <div class="mb-4 h-1 overflow-hidden rounded-full bg-surface-muted">
                    <div
                      class="h-full rounded-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
                      [style.width.%]="clamp(phase.pourcentageAvancement)"
                    ></div>
                  </div>

                  @if (phase.etapes.length === 0) {
                    <p class="py-3 text-xs text-ink-muted">
                      {{ 'progression.parcours.aucuneEtape' | translate }}
                    </p>
                  } @else {
                    <ol class="space-y-1">
                      @for (etape of phase.etapes; track etape.id; let lastEtape = $last) {
                        <li
                          class="relative pb-3 pl-11 last:pb-0"
                          [attr.aria-current]="isCurrent(etape.statut) ? 'step' : null"
                        >
                          @if (!lastEtape) {
                            <span
                              class="absolute bottom-0 left-3.75 top-8 w-0.5 rounded-full"
                              [class]="isComplete(etape.statut) ? 'bg-emerald-400' : 'bg-line'"
                              aria-hidden="true"
                            ></span>
                          }
                          <span
                            class="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full border-2 text-[11px] font-extrabold"
                            [class]="nodeClasses(etape.statut)"
                            [attr.aria-label]="statutKey(etape.statut) | translate"
                          >
                            @if (isComplete(etape.statut)) {
                              <span aria-hidden="true">✓</span>
                            } @else {
                              {{ etape.ordre }}
                            }
                          </span>

                          <div
                            class="rounded-xl border p-3 transition-colors sm:p-4"
                            [class]="stepCardClasses(etape.statut)"
                          >
                            <div class="flex flex-wrap items-start justify-between gap-2">
                              <div class="min-w-0">
                                <p class="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                  {{ 'progression.parcours.etape' | translate }} {{ etape.ordre }}
                                  @if (!etape.obligatoire) {
                                    · {{ 'progression.parcours.optionnelle' | translate }}
                                  }
                                </p>
                                <h4 class="mt-0.5 text-sm font-bold text-ink">{{ etape.nom }}</h4>
                              </div>
                              <app-badge [status]="badgeStatus(etape.statut)" size="sm">
                                {{ statutKey(etape.statut) | translate }}
                              </app-badge>
                            </div>

                            @if (etape.description) {
                              <p class="mt-1.5 text-xs leading-relaxed text-ink-muted">{{ etape.description }}</p>
                            }
                            @if (etape.motif && !isComplete(etape.statut)) {
                              <p class="mt-2 text-xs leading-relaxed text-ink-muted">{{ etape.motif }}</p>
                            }

                            @if (etape.missions.length > 0) {
                              <div class="mt-3 border-t border-line/70 pt-2">
                                <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                                  {{ 'progression.parcours.missions' | translate }}
                                  ({{ etape.missions.length }})
                                </p>
                                <ul class="flex flex-wrap gap-1.5">
                                  @for (mission of etape.missions; track mission.id) {
                                    <li
                                      class="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1 text-[11px]"
                                    >
                                      <span
                                        class="size-1.5 shrink-0 rounded-full"
                                        [class]="isComplete(mission.statut) ? 'bg-emerald-500' : isCurrent(mission.statut) ? 'bg-accent' : 'bg-line'"
                                        aria-hidden="true"
                                      ></span>
                                      <span class="truncate text-ink">{{ mission.titre }}</span>
                                      <span class="shrink-0 text-ink-muted">{{ statutKey(mission.statut) | translate }}</span>
                                    </li>
                                  }
                                </ul>
                              </div>
                            }
                          </div>
                        </li>
                      }
                    </ol>
                  }
                </div>
              </section>
            }
          </div>
        </div>
      }
    } @else {
      <div class="rounded-2xl border border-dashed border-line bg-surface p-8 text-center">
        <h3 class="text-sm font-semibold text-ink">
          {{ 'progression.parcours.indisponible' | translate }}
        </h3>
        <p class="mx-auto mt-1 max-w-lg text-xs leading-relaxed text-ink-muted">
          {{ 'progression.parcours.indisponibleDescription' | translate }}
        </p>
      </div>
    }
  `,
})
export class ParcoursProgressComponent {
  readonly feuilleRoute = input<FeuilleRouteProjet | null>(null);

  protected readonly totalEtapes = computed(() =>
    this.feuilleRoute()?.phases.reduce(
      (total, phase) => total + phase.etapes.filter((etape) => etape.statut !== 'ARCHIVEE').length,
      0,
    ) ?? 0,
  );
  protected readonly etapesTerminees = computed(() =>
    this.feuilleRoute()?.phases.reduce(
      (total, phase) => total + phase.etapes.filter(
        (etape) => etape.statut !== 'ARCHIVEE' && this.isComplete(etape.statut),
      ).length,
      0,
    ) ?? 0,
  );
  protected readonly avancement = computed(() =>
    this.clamp(this.feuilleRoute()?.pourcentageAvancement ?? 0),
  );

  protected isComplete(statut: string): boolean {
    return ['TERMINEE', 'VALIDEE', 'VALIDE'].includes(statut);
  }

  protected isCurrent(statut: string): boolean {
    return ['ACTIVE', 'EN_COURS'].includes(statut);
  }

  protected clamp(value: number): number {
    return Math.min(100, Math.max(0, Math.round(value)));
  }

  protected badgeStatus(statut: string): 'success' | 'info' | 'neutral' | 'warning' | 'danger' {
    if (this.isComplete(statut)) return 'success';
    if (this.isCurrent(statut)) return 'info';
    if (['A_ACTIVER', 'ACCESSIBLE', 'SOUMIS', 'EN_ATTENTE'].includes(statut)) return 'warning';
    if (['A_REVOIR', 'A_CORRIGER', 'REJETE', 'INCOMPLETE'].includes(statut)) return 'danger';
    return 'neutral';
  }

  protected statutKey(statut: StatutFeuilleRoute | string): string {
    const keys: Record<string, string> = {
      TERMINE: 'progression.statut.terminee',
      TERMINEE: 'progression.statut.terminee',
      VALIDEE: 'progression.statut.validee',
      VALIDE: 'progression.statut.validee',
      EN_COURS: 'progression.statut.enCours',
      ACTIVE: 'progression.statut.enCours',
      ACCESSIBLE: 'progression.statut.accessible',
      A_ACTIVER: 'progression.statut.aActiver',
      NON_DEMARREE: 'progression.statut.nonDemarree',
      VERROUILLEE: 'progression.statut.verrouillee',
      INCOMPLETE: 'progression.statut.incomplete',
      ARCHIVEE: 'progression.statut.archivee',
      NON_ASSIGNEE: 'progression.statut.nonAssignee',
      A_FAIRE: 'progression.statut.aFaire',
      SOUMIS: 'progression.statut.soumis',
      A_REVOIR: 'progression.statut.aRevoir',
      EN_ATTENTE: 'progression.statut.enAttente',
      A_CORRIGER: 'progression.statut.aCorriger',
      REJETE: 'progression.statut.rejete',
      EN_PAUSE: 'progression.statut.enPause',
      ABANDONNE: 'progression.statut.abandonne',
    };
    return keys[statut] ?? statut;
  }

  protected nodeClasses(statut: StatutFeuilleRoute): string {
    if (this.isComplete(statut)) return 'border-emerald-500 bg-emerald-500 text-white';
    if (this.isCurrent(statut)) return 'border-accent bg-surface text-accent shadow-[0_0_0_4px_var(--color-accent-soft)]';
    if (['ACCESSIBLE', 'A_ACTIVER', 'A_FAIRE'].includes(statut)) return 'border-accent/40 bg-accent-soft text-accent';
    return 'border-line bg-surface-muted text-ink-muted';
  }

  protected stepCardClasses(statut: StatutFeuilleRoute): string {
    if (this.isComplete(statut)) return 'border-emerald-500/20 bg-emerald-500/[0.035]';
    if (this.isCurrent(statut)) return 'border-accent/40 bg-accent-soft/25';
    if (['VERROUILLEE', 'NON_DEMARREE', 'ARCHIVEE'].includes(statut)) return 'border-line/70 bg-surface-muted/25';
    return 'border-line bg-surface';
  }
}
