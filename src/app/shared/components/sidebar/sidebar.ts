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
          ? 'relative flex h-full w-[80px] shrink-0 flex-col border-r border-line bg-surface p-4 transition-all duration-200'
          : 'relative flex h-full w-[260px] shrink-0 flex-col border-r border-line bg-surface p-4 transition-all duration-200'
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
          rounded-pill
          border
          border-line
          bg-surface
          text-ink-muted
          shadow-subtle
          transition-colors
          hover:bg-surface-muted
          hover:text-ink
        "
        [attr.aria-label]="
          collapsed()
            ? 'Ouvrir la sidebar'
            : 'Réduire la sidebar'
        "
      >
        <app-icon
          [name]="'sidebar-left'"
          class="size-4 cursor-ew-resize"
        />
      </button>

      <!-- Logo -->
      
      <div class="mb-5 flex h-10 items-center px-2" [class.justify-center]="collapsed()">
        @if (!collapsed()) {
          <img src="/logo.png" alt="JAPPO" class="h-10 w-auto object-contain" />
        } @else {
          <img src="/logomono.png" alt="JAPPO" class="h-7 w-7 object-contain" />
        }
      </div>

      <!-- Navigation -->
      <div class="custom-scrollbar flex flex-1 flex-col ">
        @if (!collapsed()) {
          <span
          class="block px-3 text-[11px] font-semibold tracking-wider text-gray-400 uppercase mb-2"
          [class.text-center]="collapsed()"
          [class.px-0]="collapsed()"
        >
          Menu
        </span>
        }
        @else {
          <div class="flex justify-center mb-2">
           <span
          class=" px-3 text-[11px] flex font-semibold tracking-wider text-gray-400 uppercase mb-2"
          [class.text-center]="collapsed()"
          [class.px-0]="collapsed()"
        >
          Menu
        </span>
          </div>

        }

        <nav class="flex  flex-col gap-1.5">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              class="flex h-11 items-center rounded-xl px-3 text-sm font-medium transition-all"
              [class]="
                rla.isActive
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              "
              [class.justify-center]="collapsed()"
              [class.px-0]="collapsed()"
              [title]="collapsed() ? item.label : ''"
            >
              <app-icon [name]="item.icon" class=" shrink-0" />
              @if (!collapsed()) {
                <span class="ml-3 truncate">{{ item.label }}</span>
              }
            </a>
          }
        </nav>
      </div>
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