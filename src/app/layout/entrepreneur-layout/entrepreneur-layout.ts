import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  Sidebar,
  NavItem,
} from '../../shared/components/sidebar/sidebar';

import { TranslatePipe } from '../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-entrepreneur-layout',
  imports: [
    RouterOutlet,
    Sidebar,
    TranslatePipe,
  ],
  template: `
    <div class="flex h-screen flex-col">
      <div class="flex flex-1 overflow-hidden">
        <app-sidebar [navItems]="navItems" />

        <main class="flex-1 overflow-y-auto bg-surface-muted">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class EntrepreneurLayout {
  protected readonly navItems: NavItem[] = [
    {
      label: 'entrepreneur.nav.parcours',
      path: '/entrepreneur/mon-parcours',
      icon: 'layers',
    },
    {
      label: 'entrepreneur.nav.dashboard',
      path: '/entrepreneur/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'entrepreneur.nav.activites',
      path: '/entrepreneur/missions',
      icon: 'missions',
    },
    {
      label: 'entrepreneur.nav.projets',
      path: '/entrepreneur/projets',
      icon: 'projects',
    },
    {
      label: 'entrepreneur.nav.reunions',
      path: '/entrepreneur/reunions',
      icon: 'video',
    },
    {
      label: 'entrepreneur.nav.livrables',
      path: '/entrepreneur/documents',
      icon: 'documents',
    },
  ];
}