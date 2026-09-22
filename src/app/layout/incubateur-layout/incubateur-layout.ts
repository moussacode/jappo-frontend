import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar, NavItem } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-incubateur-layout',
  imports: [RouterOutlet, Sidebar],
  template: `
    <div class="flex flex-col h-screen">
    

      <!-- Contenu principal avec sidebar -->
      <div class="flex flex-1 overflow-hidden">
        <app-sidebar [navItems]="navItems" />
        <main class="flex-1 overflow-y-auto bg-neutral-25">
          <router-outlet />
        </main>
      </div>
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
    label: 'Parcours',
    path: '/incubateur/parcours',
    icon: 'layers',
  },
  {
    label: 'Cohortes',
    path: '/incubateur/cohortes',
    icon: 'cohortes',
  },
  {
      label: 'Projets',
      path: '/incubateur/projets',
      icon: 'folder',
    },
  {
    label: 'Entrepreneurs',
    path: '/incubateur/entrepreneurs',
    icon: 'entrepreneurs',
  },
  {
    label: 'Activités',
    path: '/incubateur/missions',
    icon: 'missions',
  },
  {
    label: 'Assistant IA',
    path: '/incubateur/assistant-ia',
    icon: 'ai',
  },
  {
    label: 'Réunions',
    path: '/incubateur/reunions',
    icon: 'video',
  },
  {
    label: 'Ressources',
    path: '/incubateur/ressources',
    icon: 'book-open',
  },
];
}