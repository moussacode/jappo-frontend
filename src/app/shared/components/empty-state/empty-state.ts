import { Component, input } from '@angular/core';
import { Icon, IconName } from '../icon/icon';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="sticky left-0 flex max-w-[calc(100vw-6.5rem)] flex-col items-center justify-center px-6 py-10 text-center md:max-w-none">
      @if (iconName()) {
        <div class="mb-4 flex size-12 items-center justify-center rounded-2xl border border-line bg-surface text-ink-muted">
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