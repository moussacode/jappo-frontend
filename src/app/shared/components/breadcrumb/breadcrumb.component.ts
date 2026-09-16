import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
  queryParams?: Record<string, any>;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [RouterLink],
  template: `
    <nav aria-label="Fil d'Ariane" class="flex items-center flex-wrap gap-1.5 text-xs">
      @for (item of items(); track $index; let last = $last) {
        <div class="flex items-center gap-1.5 min-w-0">
          @if ($index > 0) {
            <span class="text-ink-muted/60 select-none font-normal">›</span>
          }
          @if (!last && item.url) {
            <a
              [routerLink]="item.url"
              [queryParams]="item.queryParams"
              class="font-medium text-ink-muted hover:text-accent transition-colors truncate max-w-[220px] cursor-pointer"
              [title]="item.label"
            >
              {{ item.label }}
            </a>
          } @else {
            <span
              class="font-semibold text-ink truncate max-w-[260px]"
              [title]="item.label"
              [attr.aria-current]="last ? 'page' : null"
            >
              {{ item.label }}
            </span>
          }
        </div>
      }
    </nav>
  `,
})
export class BreadcrumbComponent {
  items = input.required<BreadcrumbItem[]>();
}
