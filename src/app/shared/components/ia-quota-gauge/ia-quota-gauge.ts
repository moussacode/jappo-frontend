import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { StructureContextService } from '../../../core/services/structure-context.service';
import { formaterTokens } from '../../../core/models/abonnement.model';

/**
 * Jauge de consommation IA du mois (pot commun de la structure active).
 * Ne s'affiche que si l'utilisateur a accès à l'IA avec le plan actuel.
 */
@Component({
  selector: 'app-ia-quota-gauge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ia(); as ia) {
      @if (ia.accesUtilisateur) {
        <div class="flex items-center gap-2 text-[11px] text-ink-muted" [attr.title]="titre()">
          @if (ia.tokensLimite !== null) {
            <span class="shrink-0">IA ce mois</span>
            <div
              class="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-muted"
              role="meter"
              aria-label="Consommation IA de la structure ce mois-ci"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-valuenow]="ia.pourcentage ?? 0"
            >
              <div
                class="h-full rounded-full transition-[width] duration-300"
                [class.bg-accent]="(ia.pourcentage ?? 0) < 80"
                [class.bg-amber-500]="(ia.pourcentage ?? 0) >= 80 && (ia.pourcentage ?? 0) < 100"
                [class.bg-rose-500]="(ia.pourcentage ?? 0) >= 100"
                [style.width.%]="ia.pourcentage ?? 0"
              ></div>
            </div>
            <span class="shrink-0 tabular-nums">{{ tokens(ia.tokensConsommes) }} / {{ tokens(ia.tokensLimite) }}</span>
          } @else {
            <span>IA ce mois : {{ tokens(ia.tokensConsommes) }} tokens (illimité)</span>
          }
        </div>
      }
    }
  `,
})
export class IaQuotaGauge {
  private readonly structureContext = inject(StructureContextService);

  protected readonly ia = computed(() => this.structureContext.usage()?.ia ?? null);
  protected readonly tokens = formaterTokens;

  protected readonly titre = computed(() => {
    const ia = this.ia();
    if (!ia) return '';
    const fin = new Date(ia.finPeriode).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    return `Quota partagé par toute la structure, renouvelé le ${fin}.`;
  });
}
