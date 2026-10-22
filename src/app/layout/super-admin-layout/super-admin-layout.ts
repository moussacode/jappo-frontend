import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavItem } from '../../shared/components/sidebar/sidebar';
import { AppShell } from '../../shared/components/app-shell/app-shell';

/** Menu de l'espace (partagé avec les maquettes). */
export const SUPER_ADMIN_NAV: NavItem[] = [
    {
      label: "Vue d'ensemble",
      group: 'Plateforme',
      path: '/super-admin/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'Structures',
      group: 'Plateforme',
      path: '/super-admin/structures',
      icon: 'layers',
    },
    {
      label: 'Transactions',
      group: 'Facturation',
      path: '/super-admin/transactions',
      icon: 'missions',
    },
    {
      label: 'Abonnements',
      group: 'Facturation',
      path: '/super-admin/abonnements',
      icon: 'book-open',
    },
    {
      label: 'Plans',
      group: 'Facturation',
      path: '/super-admin/plans',
      icon: 'sparkles',
    },
  ];

@Component({
  selector: 'app-super-admin-layout',
  imports: [RouterOutlet, AppShell],
  template: `
    <app-shell [navItems]="navItems" espace="Administration JAPPO">
      <router-outlet />
    </app-shell>
  `,
})
export class SuperAdminLayout {

  protected readonly navItems = SUPER_ADMIN_NAV;
}