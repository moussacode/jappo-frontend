import { Component, ChangeDetectionStrategy, input, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IconName, Icon } from '../icon/icon';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside
      class="relative flex h-full shrink-0 flex-col border-r border-line bg-surface p-4 transition-all duration-300 ease-in-out"
      [class.w-[260px]]="!collapsed()"
      [class.w-[80px]]="collapsed()"
    >
      <!-- Bouton Toggle -->
      <button
        type="button"
        (click)="toggle()"
        class="absolute -right-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-sm transition-all hover:bg-surface-muted hover:text-ink cursor-pointer"
        [attr.aria-label]="collapsed() ? 'Ouvrir la sidebar' : 'Réduire la sidebar'"
      >
        <app-icon
          name="sidebar-left"
          class="size-3.5 transition-transform duration-200"
          [class.rotate-180]="collapsed()"
        />
      </button>

      <!-- Logo -->
      <div 
        class="mb-6 flex h-10 items-center px-2 transition-all"
        [class.justify-center]="collapsed()"
      >
        @if (!collapsed()) {
          <img src="/logo.png" alt="JAPPO" class="h-8 w-auto object-contain" />
        } @else {
          <img src="/logomono.png" alt="JAPPO" class="h-7 w-7 object-contain" />
        }
      </div>

      <!-- Navigation -->
      <div class="custom-scrollbar flex flex-1 flex-col">
        <span
          class="block mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted transition-all"
          [class.px-3]="!collapsed()"
          [class.text-center]="collapsed()"
        >
          Menu
        </span>

        <nav class="flex flex-col gap-1">
          @for (item of navItems(); track item.path) {
            <a
              [routerLink]="item.path"
              routerLinkActive
              #rla="routerLinkActive"
              class="flex h-10 items-center rounded-xl px-3 text-xs font-medium transition-colors"
              [class]="
                rla.isActive
                  ? 'bg-surface-muted text-ink font-semibold shadow-xs'
                  : 'text-ink-muted hover:bg-surface-muted/60 hover:text-ink'
              "
              [class.justify-center]="collapsed()"
              [class.px-0]="collapsed()"
              [title]="collapsed() ? item.label : ''"
            >
              <app-icon [name]="item.icon" class="size-4 shrink-0" />
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
    this.collapsed.update((value) => !value);
  }
}