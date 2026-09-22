import { Component, input, output } from '@angular/core';

export interface TabOption<T = string> {
  value: T;
  label: string;
  count?: number;
}

@Component({
  selector: 'app-tab-filter',
  standalone: true,
  template: `
    <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-semibold shadow-xs">
      @for (tab of options(); track tab.value) {
        <button
          type="button"
          (click)="valueChange.emit(tab.value)"
          [class]="
            value() === tab.value
              ? 'bg-accent text-white shadow-xs'
              : 'text-ink-muted hover:text-ink'
          "
          class="cursor-pointer rounded-lg px-3 py-1.5 transition-all duration-150"
        >
          {{ tab.label }}
          @if (tab.count !== undefined) {
            <span [class]="value() === tab.value ? 'text-white/80' : 'text-ink-muted'">
              ({{ tab.count }})
            </span>
          }
        </button>
      }
    </div>
  `
})
export class TabFilterComponent<T = string> {
  options = input.required<TabOption<T>[]>();
  value = input.required<T>();
  valueChange = output<T>();
}