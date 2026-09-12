import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CardComponent } from "../card/card.component";
import { BadgeComponent, BadgeStatus } from "../badge/badge";

@Component({
  selector: 'app-entity-card',
  standalone: true,
  imports: [RouterLink, CardComponent, BadgeComponent],
  template: `
    <a [routerLink]="routerLink()" class="block h-full group">
      <app-card padding="md" [hoverable]="true" class="flex flex-col justify-between gap-4 h-full">
        
        <!-- En-tête : Catégorie / Titre / Badge -->
        <div class="flex items-start justify-between pb-2 gap-3 min-w-0">
          <div class="flex flex-col min-w-0">
            @if (subtitle()) {
              <span class="text-[11px] font-semibold text-accent uppercase tracking-wider truncate">
                {{ subtitle() }}
              </span>
            }
            <h2 class="truncate text-base font-bold text-ink transition-colors group-hover:text-accent mt-0.5">
              {{ title() }}
            </h2>
          </div>

          @if (badgeLabel()) {
            <app-badge [status]="badgeStatus()" size="sm" class="shrink-0">
              {{ badgeLabel() }}
            </app-badge>
          }
        </div>

        <!-- Corps : Contenu personnalisable via ng-content ou lignes de métadonnées -->
        <div class="flex flex-col gap-1.5 rounded-xl border border-line bg-surface-muted/40 p-3  text-xs">
          <ng-content select="[card-body]" />
        </div>

        <!-- Pied de carte : Slot pour progression, dates ou actions -->
        <div class="flex items-center justify-between border-line pt-4 text-xs">
          <ng-content select="[card-footer]" />
        </div>

      </app-card>
    </a>
  `,
})
export class EntityCardComponent {
  // Inputs génériques partagés par toutes les entités
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly routerLink = input.required<any[]>();
  readonly badgeLabel = input<string>();
  readonly badgeStatus = input<BadgeStatus>('neutral');
}