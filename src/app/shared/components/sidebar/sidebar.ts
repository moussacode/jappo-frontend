import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  path: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="flex h-full w-[260px] shrink-0 flex-col gap-8 border-r border-neutral-200 bg-white p-4">
      <span class="text-xl font-semibold text-brand-500">JAPPO</span>
      <nav class="flex flex-col gap-1">
        @for (item of navItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive
            #rla="routerLinkActive"
            [class]="
              rla.isActive
                ? 'rounded-[var(--radius-token-sm)] px-3 py-2.5 text-sm font-medium bg-brand-50 text-brand-500'
                : 'rounded-[var(--radius-token-sm)] px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50'
            "
          >
            {{ item.label }}
          </a>
        }
      </nav>
    </aside>
  `,
})
export class Sidebar {
  navItems = input.required<NavItem[]>();
}