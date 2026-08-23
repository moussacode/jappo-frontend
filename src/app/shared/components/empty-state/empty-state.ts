import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';


@Component({
  selector: 'app-empty-state',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-token-md)] border border-neutral-200 bg-white px-6 py-10 text-center">
      <span class="text-3xl">{{ icon() }}</span>
      <p class="text-base font-semibold text-neutral-900">{{ title() }}</p>
      <p class="max-w-sm text-sm text-neutral-700">{{ description() }}</p>
      @if (actionLabel()) {
        <app-button (click)="action.emit()">{{ actionLabel() }}</app-button>
      }
    </div>
  `,
})
export class EmptyState {
  icon = input('📭');
  title = input.required<string>();
  description = input.required<string>();
  actionLabel = input<string>();
  action = output<void>();
}