import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'brand';
export type BadgeSize = 'sm' | 'md';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class BadgeComponent {
  status = input<BadgeStatus>('neutral');
  size = input<BadgeSize>('md');
  dot = input<boolean>(false);

  protected classes = computed(() => {
    const base = 'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors shrink-0';

    const sizes: Record<BadgeSize, string> = {
      sm: 'px-2 py-0.5 text-[10px] leading-tight',
      md: 'px-2.5 py-1 text-xs leading-normal',
    };

    const variants: Record<BadgeStatus, string> = {
      success: 'bg-vivid-green/10 text-vivid-green border border-vivid-green/20',
      warning: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
      danger: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
      info: 'bg-sky-500/10 text-sky-600 border border-sky-500/20',
      brand: 'bg-accent/10 text-accent border border-accent/20',
      neutral: 'bg-surface-muted text-ink-muted border border-line',
    };

    return `${base} ${sizes[this.size()]} ${variants[this.status()] ?? variants.neutral}`;
  });

  protected dotClasses = computed(() => {
    const dots: Record<BadgeStatus, string> = {
      success: 'bg-vivid-green',
      warning: 'bg-amber-500',
      danger: 'bg-rose-500',
      info: 'bg-sky-500',
      brand: 'bg-accent',
      neutral: 'bg-ink-muted',
    };
    return `h-1.5 w-1.5 rounded-full shrink-0 ${dots[this.status()] ?? dots.neutral}`;
  });
}