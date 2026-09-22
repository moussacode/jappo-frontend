import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-line bg-surface">
      @if (iconName()) {
        <div class="flex size-12 items-center justify-center rounded-xl bg-surface-muted text-ink-muted mb-4">
          <app-icon [name]="iconName()!" class="size-6" />
        </div>
      }
      <h3 class="text-sm font-semibold text-ink">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-1 text-xs text-ink-muted max-w-sm">{{ description() }}</p>
      }
      <div class="mt-4 flex items-center gap-2">
        <ng-content />
      </div>
    </div>
  `
})
export class EmptyStateComponent {
  title = input.required<string>();
  description = input<string>();
  iconName = input<IconName>();
}