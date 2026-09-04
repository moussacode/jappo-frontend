import { Component, input, computed } from '@angular/core';

export type KpiNoteVariant = 'brand' | 'success' | 'neutral';
export type TrendDirection = 'up' | 'down' | 'neutral';
@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [],
  templateUrl: './kpi-card.html',
})
export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  note = input<string>();
  noteVariant = input<KpiNoteVariant>('neutral');

  protected noteColorClass = computed(() => {
    const map: Record<KpiNoteVariant, string> = {
      brand: 'text-accent',
      success: 'text-vivid-green',
      neutral: 'text-ink-muted',
    };
    return map[this.noteVariant()];
  });

  trend = input<string>();                 // Ex: "+15.2%"
  trendLabel = input<string>('Month');     // Ex: "Month"
  trendDirection = input<TrendDirection>('up'); // 'up' ou 'down'

  protected trendColorClass = computed(() => {
    switch (this.trendDirection()) {
      case 'up':
        return 'text-vivid-green';
      case 'down':
        return 'text-danger-500';
      default:
        return 'text-ink-muted';
    }
  });
}