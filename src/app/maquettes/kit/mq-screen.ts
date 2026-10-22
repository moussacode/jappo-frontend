import { Component, input } from '@angular/core';

/**
 * Cadre d'un écran de maquette : étiquette (numéro, titre, route réelle)
 * puis un artboard de taille fixe. html.to.design importe chaque cadre
 * comme un groupe distinct qu'on peut transformer en frame Figma.
 * Le `transform` confine les éléments `fixed` (modales, widgets) au cadre.
 */
@Component({
  selector: 'mq-screen',
  template: `
    <section class="mq-screen">
      <header class="mb-4 flex items-baseline gap-3">
        <span class="font-mono text-sm font-bold text-neutral-900">{{ numero() }}</span>
        <h2 class="text-lg font-semibold text-neutral-900">{{ titre() }}</h2>
        <span class="font-mono text-xs text-neutral-500">{{ route() }}</span>
      </header>

      <div
        class="relative flex flex-col overflow-hidden rounded-xl bg-surface text-ink ring-1 ring-black/10 [transform:translateZ(0)]"
        [style.width.px]="largeur()"
        [style.height.px]="hauteur()"
        [style.min-height.px]="hauteur() ? null : 900"
      >
        <ng-content />
      </div>
    </section>
  `,
})
export class MqScreen {
  numero = input.required<string>();
  titre = input.required<string>();
  route = input<string>('');
  largeur = input<number>(1440);
  /** Hauteur fixe en px ; sans valeur, le cadre suit la hauteur de la page (900 px minimum). */
  hauteur = input<number | null>(null);
}
