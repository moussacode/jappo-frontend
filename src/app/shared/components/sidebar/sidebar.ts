import { Component, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { IconName, Icon } from '../icon/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <aside
      [class]="
        collapsed()
          ? 'relative flex h-full w-[72px] shrink-0 flex-col border-r border-neutral-200 bg-white p-4 transition-all duration-200'
          : 'relative flex h-full w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-white p-4 transition-all duration-200'
      "
    >

      <!-- Toggle -->
      <button
        type="button"
        (click)="toggle()"
        class="
          absolute
          -right-3
          top-6
          z-10
          flex
          h-8
          w-8
          
          items-center
          justify-center
          rounded-full
          border
          border-neutral-200
          bg-white
          text-neutral-500
          shadow-sm
          transition-colors
          hover:bg-neutral-50
          hover:text-neutral-900
        "
        
        [attr.aria-label]="
          collapsed()
            ? 'Ouvrir la sidebar'
            : 'Réduire la sidebar'
        "
      >
        <app-icon
          [name]="collapsed() ? 'sidebar-left' : 'sidebar-left'"
          class="size-4 cursor-ew-resize"
        />
      </button>

      <!-- Logo -->
      <div
        class="flex h-18 items-center"
        [class.justify-center]="collapsed()"
      >
      @if (!collapsed()) {
  <img
    src="/logo.png"
    alt="JAPPO"
    class="h-full w-auto object-contain"
  />
} @else {
  <img
    src="/logomono.png"
    alt="JAPPO"
    class="h-8 w-8 object-contain"
  />
}
      </div>

      <!-- Navigation -->
      <nav 
      
       class="mt-4 flex flex-1 flex-col gap-1"
  [class.px-3]="!collapsed()"
  [class.px-0]="collapsed()"
  >
        @for (item of navItems(); track item.path) {
          <a
            [routerLink]="item.path"
            routerLinkActive
            #rla="routerLinkActive"
            [class]="
              rla.isActive
                ? 'bg-brand-50 text-brand-500'
                : 'text-neutral-700 hover:bg-neutral-50'
            "
            class="
              flex
              h-11
              items-center
              gap-3
              rounded-[var(--radius-token-sm)]
              px-3
              text-sm
              font-medium
              transition-colors
              
            "
            [class.justify-center]="collapsed()"
            [class.w-11]="collapsed()"
      [class.w-full]="!collapsed()"
      [class.justify-center]="collapsed()"
      [class.gap-3]="!collapsed()"
      [class.px-3]="!collapsed()"
      [class.mx-auto]="collapsed()"
            [title]="collapsed() ? item.label : ''"
          >
            <app-icon
              [name]="item.icon"
              class="size-5 shrink-0"
            />

            @if (!collapsed()) {
              <span>
                {{ item.label }}
              </span>
            }
          </a>
        }
      </nav>

    </aside>
  `,
})
export class Sidebar {
  navItems = input.required<NavItem[]>();

  collapsed = signal(false);

  toggle(): void {
    this.collapsed.update(value => !value);
  }
}