import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-1 mb-4 sm:mb-6 lg:mb-8">
      @if (breadcrumb() && typeof breadcrumb() === 'string') {
        <span class="text-xs font-medium text-ink-muted">{{ breadcrumb() }}</span>
      } @else if (breadcrumbItems()) {
        <nav class="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
          @for (item of breadcrumbItems(); track item.label; let isLast = $last) {
            @if (item.path && !isLast) {
              <a [routerLink]="item.path" class="hover:text-accent transition-colors">
                {{ item.label }}
              </a>
            } @else {
              <span [class.text-ink]="isLast">{{ item.label }}</span>
            }
            @if (!isLast) {
              <span class="text-ink-muted/40">/</span>
            }
          }
        </nav>
      }
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <h1 class="text-lg font-bold tracking-tight text-ink sm:text-xl lg:text-2xl xl:text-3xl break-words">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="mt-1 text-xs sm:text-sm text-ink-muted leading-relaxed truncate">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
          <ng-content />
        </div>
      </div>
    </div>
  `
})
export class PageHeaderComponent {
  title = input.required<string>();
  subtitle = input<string>();
  breadcrumb = input<string | BreadcrumbItem[]>();

  protected readonly breadcrumbItems = computed(() => {
    const bc = this.breadcrumb();
    if (typeof bc === 'string') return null;
    return bc;
  });
}