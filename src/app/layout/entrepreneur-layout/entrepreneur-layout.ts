import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import {
  Sidebar,
  NavItem,
} from '../../shared/components/sidebar/sidebar';

import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { EntrepreneurAssistantWidget } from '../../features/entrepreneur/assistant/entrepreneur-assistant-widget';

@Component({
  selector: 'app-entrepreneur-layout',
  imports: [
    RouterOutlet,
    Sidebar,
    TranslatePipe,
    EntrepreneurAssistantWidget,
  ],
  template: `
    <div class="flex h-dvh min-h-0 flex-col">
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <app-sidebar [navItems]="navItems" />

        <main class="min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface-muted">
          <router-outlet />
        </main>
        <app-entrepreneur-assistant-widget />
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
    {
      label: 'entrepreneur.nav.ressources',
      path: '/entrepreneur/ressources',
      icon: 'book-open',
    },
    {
      label: 'entrepreneur.nav.assistantIa',
      path: '/entrepreneur/assistant',
      icon: 'ai',
    },
  ];
}