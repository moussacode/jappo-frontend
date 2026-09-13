import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1 mb-6 sm:mb-8">
      @if (breadcrumb()) {
        <span class="text-xs font-medium text-ink-muted">{{ breadcrumb() }}</span>
      }
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-ink sm:text-3xl">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-1 text-xs sm:text-sm text-ink-muted leading-relaxed">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex items-center gap-2.5 shrink-0">
          <ng-content />
        </div>
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  breadcrumb = input<string>(); // 👈 Nouvel input pour le fil d'Ariane
}