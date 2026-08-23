import { Component, input, computed } from '@angular/core';

export type KpiNoteVariant = 'brand' | 'success' | 'neutral';


@Component({
  selector: 'app-kpi-card',
  imports: [],
  templateUrl: './kpi-card.html',
  styleUrl: './kpi-card.css',
})

export class KpiCardComponent {
  label = input.required<string>();
  value = input.required<string | number>();
  note = input<string>();
  noteVariant = input<KpiNoteVariant>('neutral');

  protected noteColorClass = computed(() => {
    const map: Record<KpiNoteVariant, string> = {
      brand: 'text-brand-500',
      success: 'text-success-500',
      neutral: 'text-neutral-500',
    };
    return map[this.noteVariant()];
  });
  
}
