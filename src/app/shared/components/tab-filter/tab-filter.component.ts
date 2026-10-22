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
    <div role="tablist" class="inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl bg-surface-muted p-1 text-xs font-medium ring-1 ring-line ring-inset [scrollbar-width:none]">
      @for (tab of options(); track tab.value) {
        <button
          type="button"
          role="tab"
          [attr.aria-selected]="value() === tab.value"
          (click)="valueChange.emit(tab.value)"
          [class]="
            value() === tab.value
              ? 'bg-surface font-semibold text-ink shadow-[0_0_0_1px_var(--color-line)]'
              : 'text-ink-muted hover:text-ink'
          "
          class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 transition-all duration-150"
        >
          {{ tab.label }}
          @if (tab.count !== undefined) {
            <span class="rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums" [class]="value() === tab.value ? 'bg-accent-soft text-accent-strong' : 'bg-surface/70 text-ink-faint'">{{ tab.count }}</span>
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