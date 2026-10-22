import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

/*
 * Graphiques légers en SVG, sans dépendance, alignés sur le design system :
 * marques fines, grille discrète, texte en tokens d'encre (jamais la couleur
 * de série), infobulle au survol et alternative textuelle pour les lecteurs d'écran.
 */

export interface VizPoint {
  label: string;
  value: number;
}

export interface VizSegment {
  label: string;
  value: number;
  /** Variable CSS de couleur, ex. 'var(--viz-1)'. */
  color: string;
}

/** Jauge circulaire pour un pourcentage unique (0–100). */
@Component({
  selector: 'app-ring-gauge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative inline-flex items-center justify-center" [style.width.px]="taille()" [style.height.px]="taille()">
      <svg [attr.viewBox]="'0 0 ' + taille() + ' ' + taille()" class="-rotate-90" role="img" [attr.aria-label]="label() + ' : ' + valeurBornee() + ' %'">
        <circle [attr.cx]="centre()" [attr.cy]="centre()" [attr.r]="rayon()" fill="none" stroke="var(--color-line)" [attr.stroke-width]="epaisseur()" />
        <circle
          [attr.cx]="centre()" [attr.cy]="centre()" [attr.r]="rayon()" fill="none"
          [attr.stroke]="couleur()" [attr.stroke-width]="epaisseur()" stroke-linecap="round"
          [attr.stroke-dasharray]="circonference()" [attr.stroke-dashoffset]="decalage()"
          class="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-2xl font-bold tracking-tight text-ink tabular-nums">{{ valeurBornee() }}<span class="text-sm text-ink-muted">%</span></span>
        @if (sousTitre()) { <span class="text-[11px] text-ink-faint">{{ sousTitre() }}</span> }
      </div>
    </div>
  `,
})
export class RingGauge {
  valeur = input.required<number>();
  label = input('Progression');
  sousTitre = input('');
  taille = input(132);
  epaisseur = input(10);
  couleur = input('var(--color-accent)');

  protected readonly valeurBornee = computed(() => Math.max(0, Math.min(100, Math.round(this.valeur() ?? 0))));
  protected readonly centre = computed(() => this.taille() / 2);
  protected readonly rayon = computed(() => (this.taille() - this.epaisseur()) / 2);
  protected readonly circonference = computed(() => 2 * Math.PI * this.rayon());
  protected readonly decalage = computed(() => this.circonference() * (1 - this.valeurBornee() / 100));
}

/** Barres horizontales classées (une seule série, une seule teinte). */
@Component({
  selector: 'app-bar-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="flex flex-col gap-3" role="list">
      @for (p of points(); track p.label) {
        <li class="group" [title]="p.label + ' : ' + p.value + ' ' + unite()">
          <div class="mb-1.5 flex items-baseline justify-between gap-3 text-xs">
            <span class="truncate font-medium text-ink">{{ p.label }}</span>
            <span class="shrink-0 font-semibold text-ink tabular-nums">{{ p.value }} <span class="font-normal text-ink-faint">{{ unite() }}</span></span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              class="h-full rounded-full transition-[width] duration-700 ease-out group-hover:brightness-110 motion-reduce:transition-none"
              [style.width.%]="largeur(p.value)"
              [style.background]="couleur()"
            ></div>
          </div>
        </li>
      }
    </ul>
  `,
})
export class BarList {
  points = input.required<VizPoint[]>();
  unite = input('');
  couleur = input('var(--viz-1)');

  private readonly max = computed(() => Math.max(1, ...this.points().map((p) => p.value)));
  protected largeur(v: number): number {
    return Math.max(2, (v / this.max()) * 100);
  }
}

/** Courbe en aire (évolution temporelle) avec réticule et infobulle. */
@Component({
  selector: 'app-area-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" (pointerleave)="survol.set(null)">
      <svg
        [attr.viewBox]="'0 0 ' + L + ' ' + H"
        preserveAspectRatio="none"
        class="h-56 w-full overflow-visible"
        role="img"
        [attr.aria-label]="titre()"
        (pointermove)="onSurvol($event)"
      >
        <defs>
          <linearGradient [attr.id]="idDegrade" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" [attr.stop-color]="couleur()" stop-opacity="0.28" />
            <stop offset="100%" [attr.stop-color]="couleur()" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (g of [0, 1, 2, 3]; track g) {
          <line x1="0" [attr.x2]="L" [attr.y1]="8 + g * (H - 16) / 3" [attr.y2]="8 + g * (H - 16) / 3" stroke="var(--color-line)" stroke-dasharray="3 4" vector-effect="non-scaling-stroke" />
        }
        <path [attr.d]="aire()" [attr.fill]="'url(#' + idDegrade + ')'" />
        <path [attr.d]="ligne()" fill="none" [attr.stroke]="couleur()" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" />
        @if (survol() !== null) {
          <line [attr.x1]="x(survol()!)" [attr.x2]="x(survol()!)" y1="0" [attr.y2]="H" stroke="var(--color-ink-faint)" stroke-width="1" vector-effect="non-scaling-stroke" />
        }
      </svg>

      @if (survol() !== null) {
        <div
          class="lg-surface-strong pointer-events-none absolute top-2 z-10 -translate-x-1/2 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap"
          [style.left.%]="(x(survol()!) / L) * 100"
        >
          <p class="font-semibold text-ink tabular-nums">{{ format()(points()[survol()!].value) }}</p>
          <p class="text-ink-muted">{{ points()[survol()!].label }}</p>
        </div>
        <span
          class="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
          [style.background]="couleur()"
          [style.left.%]="(x(survol()!) / L) * 100"
          [style.top.%]="(y(points()[survol()!].value) / H) * 100"
        ></span>
      }

      <div class="mt-2 flex justify-between text-[10px] font-medium text-ink-faint">
        @for (p of points(); track $index) { <span>{{ p.label }}</span> }
      </div>

      <table class="sr-only">
        <caption>{{ titre() }}</caption>
        @for (p of points(); track $index) { <tr><th>{{ p.label }}</th><td>{{ format()(p.value) }}</td></tr> }
      </table>
    </div>
  `,
})
export class AreaChart {
  points = input.required<VizPoint[]>();
  titre = input('Évolution');
  couleur = input('var(--viz-1)');
  format = input<(v: number) => string>((v) => String(v));

  protected readonly L = 600;
  protected readonly H = 220;
  protected readonly idDegrade = 'aire-' + Math.random().toString(36).slice(2, 8);
  protected readonly survol = signal<number | null>(null);

  private readonly max = computed(() => Math.max(1, ...this.points().map((p) => p.value)) * 1.1);

  protected x(i: number): number {
    const n = this.points().length;
    return n <= 1 ? this.L / 2 : (i / (n - 1)) * this.L;
  }

  protected y(v: number): number {
    return this.H - 8 - (v / this.max()) * (this.H - 16);
  }

  protected readonly ligne = computed(() =>
    this.points().map((p, i) => `${i ? 'L' : 'M'} ${this.x(i)} ${this.y(p.value)}`).join(' '),
  );

  protected readonly aire = computed(() => {
    const n = this.points().length;
    return n ? `${this.ligne()} L ${this.x(n - 1)} ${this.H} L ${this.x(0)} ${this.H} Z` : '';
  });

  protected onSurvol(event: PointerEvent): void {
    const svg = event.currentTarget as SVGElement;
    const rect = svg.getBoundingClientRect();
    const n = this.points().length;
    if (!n || !rect.width) return;
    const ratio = (event.clientX - rect.left) / rect.width;
    this.survol.set(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  }
}

/** Histogramme vertical (comptes par période). */
@Component({
  selector: 'app-column-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-48 items-end gap-2" role="img" [attr.aria-label]="titre()">
      @for (p of points(); track $index) {
        <div class="group relative flex h-full flex-1 flex-col justify-end" tabindex="0" [attr.aria-label]="p.label + ' : ' + p.value">
          <div
            class="w-full rounded-t-[4px] transition-[height,filter] duration-500 group-hover:brightness-110 motion-reduce:transition-none"
            [style.height.%]="hauteur(p.value)"
            [style.background]="couleur()"
            [style.opacity]="$last ? 1 : 0.55"
          ></div>
          <div class="lg-surface-strong pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md px-2 py-1 text-[11px] whitespace-nowrap group-hover:block group-focus:block">
            <span class="font-semibold text-ink">{{ p.value }}</span> <span class="text-ink-muted">· {{ p.label }}</span>
          </div>
        </div>
      }
    </div>
    <div class="mt-2 flex gap-2 text-[10px] font-medium text-ink-faint">
      @for (p of points(); track $index) { <span class="flex-1 truncate text-center">{{ p.label }}</span> }
    </div>
  `,
})
export class ColumnChart {
  points = input.required<VizPoint[]>();
  titre = input('Répartition');
  couleur = input('var(--viz-1)');

  private readonly max = computed(() => Math.max(1, ...this.points().map((p) => p.value)));
  protected hauteur(v: number): number {
    return v ? Math.max(3, (v / this.max()) * 100) : 1.5;
  }
}

/** Barre segmentée (parts d'un tout) avec légende chiffrée. */
@Component({
  selector: 'app-segment-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex h-3 w-full gap-[2px] overflow-hidden rounded-full bg-surface-muted" role="img" [attr.aria-label]="resume()">
      @for (s of segmentsVisibles(); track s.label) {
        <div class="h-full first:rounded-l-full last:rounded-r-full" [style.flex-grow]="s.value" [style.background]="s.color" [title]="s.label + ' : ' + s.value"></div>
      }
    </div>
    <ul class="mt-4 flex flex-col gap-2.5">
      @for (s of segments(); track s.label) {
        <li class="flex items-center gap-2.5 text-xs">
          <span class="size-2.5 shrink-0 rounded-[3px]" [style.background]="s.color"></span>
          <span class="flex-1 truncate text-ink-muted">{{ s.label }}</span>
          <span class="font-semibold text-ink tabular-nums">{{ s.value }}</span>
          <span class="w-10 text-right text-ink-faint tabular-nums">{{ pourcentage(s.value) }}%</span>
        </li>
      }
    </ul>
  `,
})
export class SegmentBar {
  segments = input.required<VizSegment[]>();

  private readonly total = computed(() => this.segments().reduce((t, s) => t + s.value, 0));
  protected readonly segmentsVisibles = computed(() => this.segments().filter((s) => s.value > 0));
  protected readonly resume = computed(() => this.segments().map((s) => `${s.label} ${s.value}`).join(', '));

  protected pourcentage(v: number): number {
    return this.total() ? Math.round((v / this.total()) * 100) : 0;
  }
}

export const VIZ = [RingGauge, BarList, AreaChart, ColumnChart, SegmentBar] as const;
