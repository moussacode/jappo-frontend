import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar, NavItem } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-incubateur-layout',
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="flex h-screen">
      <app-sidebar [navItems]="navItems" />
      <main class="flex-1 overflow-y-auto bg-neutral-25">
        <router-outlet />
      </main>
    </div>
  `,
})
export class IncubateurLayout {
  protected readonly navItems: NavItem[] = [
  {
    label: "Vue d'ensemble",
    path: '/incubateur/dashboard',
    icon: 'dashboard',
  },
  {
    label: 'Cohortes',
    path: '/incubateur/cohortes',
    icon: 'cohortes',
  },
  {
    label: 'Entrepreneurs',
    path: '/incubateur/entrepreneurs',
    icon: 'entrepreneurs',
  },
  {
    label: 'Missions',
    path: '/incubateur/missions',
    icon: 'missions',
  },
  {
    label: 'Rapports',
    path: '/incubateur/rapports',
    icon: 'documents',
  },
  {
    label: 'Paramètres',
    path: '/incubateur/parametres',
    icon: 'settings',
  },
];
}