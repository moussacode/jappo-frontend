import { Component, input, computed } from '@angular/core';

export type BadgeStatus = 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'app-badge',
  imports: [],
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})

export class BadgeComponent {
  status = input<BadgeStatus>('neutral');

  protected classes = computed(() => {
    const base = 'inline-flex items-center rounded-full  px-2.5 py-1 text-xs font-medium';
    const variants: Record<BadgeStatus, string> = {
      success: 'bg-success-100 text-success-500',
      warning: 'bg-warning-100 text-warning-500',
      danger: 'bg-danger-100 text-danger-500',
      neutral: 'bg-neutral-100 text-neutral-500',
    };
    return `${base} ${variants[this.status()]}`;
  });
}
