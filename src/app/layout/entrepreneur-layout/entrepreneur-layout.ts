import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar, NavItem } from '../../shared/components/sidebar/sidebar';

@Component({
  selector: 'app-entrepreneur-layout',
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
export class EntrepreneurLayout {
  protected readonly navItems: NavItem[] = [
    { label: 'Tableau de bord', path: '/entrepreneur/dashboard' },
    { label: 'Mon parcours', path: '/entrepreneur/parcours' },
    { label: 'Mes missions', path: '/entrepreneur/missions' },
    { label: 'Mes documents', path: '/entrepreneur/documents' },
    { label: 'Assistant IA', path: '/entrepreneur/assistant-ia' },
    { label: 'Mon profil', path: '/entrepreneur/profil' },
  ];
}