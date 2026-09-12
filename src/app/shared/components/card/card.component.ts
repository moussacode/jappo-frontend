import { Component, input, computed } from '@angular/core';

export type CardPadding = 'none' | 'sm' | 'md' | 'lg';
export type CardVariant = 'default' | 'muted' | 'flat';

@Component({
  selector: 'app-card',
  standalone: true,
  template: `
    <div [class]="classes()">
      <ng-content />
    </div>
  `,
})
export class CardComponent {
  // Inputs modernes avec Angular Signals
  readonly padding = input<CardPadding>('md');
  readonly hoverable = input<boolean>(false);
  readonly variant = input<CardVariant>('default');

  protected readonly classes = computed(() => {
    const base = 'rounded-2xl transition-all duration-200';
    
    // Variantes de fond et de bordure
    const variants: Record<CardVariant, string> = {
      default: 'border border-line bg-surface shadow-2xs',
      muted: 'border border-line/60 bg-surface-muted/30 shadow-none',
      flat: 'border-0 bg-transparent shadow-none',
    };

    // États interactifs (hover & focus clavier)
    const hover = this.hoverable()
      ? ' hover:border-line-strong hover:shadow-xs cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
      : '';

    // Gestion des espacements intérieurs
    const paddings: Record<CardPadding, string> = {
      none: 'p-0 overflow-hidden',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8 sm:p-10',
    };

    return `${base} ${variants[this.variant()]} ${paddings[this.padding()]} ${hover}`.trim();
  });
}