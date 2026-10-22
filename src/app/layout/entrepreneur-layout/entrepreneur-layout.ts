import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { NavItem } from '../../shared/components/sidebar/sidebar';
import { AppShell } from '../../shared/components/app-shell/app-shell';
import { EntrepreneurAssistantWidget } from '../../features/entrepreneur/assistant/entrepreneur-assistant-widget';

/** Menu de l'espace (partagé avec les maquettes). */
export const ENTREPRENEUR_NAV: NavItem[] = [
    {
      label: 'entrepreneur.nav.parcours',
      group: 'Pilotage',
      path: '/entrepreneur/mon-parcours',
      icon: 'layers',
    },
    {
      label: 'entrepreneur.nav.dashboard',
      group: 'Pilotage',
      path: '/entrepreneur/dashboard',
      icon: 'dashboard',
    },
    {
      label: 'entrepreneur.nav.activites',
      group: 'Mon travail',
      path: '/entrepreneur/missions',
      icon: 'missions',
    },
    {
      label: 'entrepreneur.nav.projets',
      group: 'Mon travail',
      path: '/entrepreneur/projets',
      icon: 'projects',
    },
    {
      label: 'entrepreneur.nav.livrables',
      group: 'Mon travail',
      path: '/entrepreneur/documents',
      icon: 'documents',
    },
    {
      label: 'entrepreneur.nav.reunions',
      group: 'Collaboration',
      path: '/entrepreneur/reunions',
      icon: 'video',
    },
    {
      label: 'entrepreneur.nav.ressources',
      group: 'Collaboration',
      path: '/entrepreneur/ressources',
      icon: 'book-open',
    },
    {
      label: 'entrepreneur.nav.assistantIa',
      group: 'Collaboration',
      path: '/entrepreneur/assistant',
      icon: 'ai',
    },
  ];

@Component({
  selector: 'app-entrepreneur-layout',
  imports: [
    RouterOutlet,
    AppShell,
    EntrepreneurAssistantWidget,
  ],
  template: `
    <app-shell [navItems]="navItems">
      <router-outlet />
    </app-shell>
    <app-entrepreneur-assistant-widget />
  `,
})
export class EntrepreneurLayout {
  protected readonly navItems = ENTREPRENEUR_NAV;
}