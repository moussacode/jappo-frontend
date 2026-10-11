import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  Sidebar,
  NavItem,
} from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-super-admin-layout',
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="flex h-dvh min-h-0 flex-col">
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <app-sidebar [navItems]="navItems" />

        <main class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-neutral-25">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class SuperAdminLayout {

  protected readonly navItems: NavItem[] = [
    {
      label: "Vue d'ensemble",
      path: '/super-admin/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'Structures',
      path: '/super-admin/structures',
      icon: 'layers',
    },
    {
      label: 'Transactions',
      path: '/super-admin/transactions',
      icon: 'missions',
    },
    {
      label: 'Abonnements',
      path: '/super-admin/abonnements',
      icon: 'book-open',
    },
  ];
}