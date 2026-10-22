import {
  Component,
  computed,
  inject,
} from '@angular/core';

import { RouterOutlet } from '@angular/router';

import { NavItem } from '../../shared/components/sidebar/sidebar';
import { AppShell } from '../../shared/components/app-shell/app-shell';

import { AuthService } from '../../core/services/auth.service';

import {
  StructureContextService,
} from '../../core/services/structure-context.service';


/** Menu de l'espace Incubateur (partagé avec les maquettes). */
export const INCUBATEUR_NAV: NavItem[] = [

        {
          label: 'incubateur.nav.dashboard',
          group: 'Pilotage',
          path: '/incubateur/dashboard',
          icon: 'dashboard',
        },

        {
          label: 'incubateur.nav.cohortes',
          group: 'Pilotage',
          path: '/incubateur/cohortes',
          icon: 'cohortes',
        },
         {
          label: 'incubateur.nav.programmes',
          group: 'Pilotage',
          path: '/incubateur/programmes',
          icon: 'layers',
        },

        {
          label: 'incubateur.nav.entrepreneurs',
          group: 'Suivi',
          path: '/incubateur/entrepreneurs',
          icon: 'entrepreneurs',
        },

        {
          label: 'incubateur.nav.activites',
          group: 'Suivi',
          path: '/incubateur/missions',
          icon: 'missions',
        },

        {
          label: 'incubateur.nav.projets',
          group: 'Suivi',
          path: '/incubateur/projets',
          icon: 'folder',
        },

        {
          label: 'incubateur.nav.reunions',
          group: 'Collaboration',
          path: '/incubateur/reunions',
          icon: 'video',
        },

        {
          label: 'incubateur.nav.ressources',
          group: 'Collaboration',
          path: '/incubateur/ressources',
          icon: 'book-open',
        },

        {
          label: 'incubateur.nav.assistantIa',
          group: 'Collaboration',
          path: '/incubateur/assistant-ia',
          icon: 'ai',
        },
      ];

@Component({
  selector: 'app-incubateur-layout',

  imports: [
    RouterOutlet,
    AppShell,
  ],

  template: `
    <app-shell [navItems]="navItems()">
      <router-outlet />
    </app-shell>
  `,
})
export class IncubateurLayout {

  private readonly authService =
    inject(AuthService);

  private readonly structureContext =
    inject(StructureContextService);


  protected readonly navItems =
    computed<NavItem[]>(() => {

      const structureId =
        this.structureContext.getActiveStructureId();

      const membership =
        this.authService
          .memberships()
          .find(
            (m) =>
              m.structure.id === structureId
          );

      const role = membership?.role;


      const items: NavItem[] = [...INCUBATEUR_NAV];


      /*
       * Le parcours est accessible uniquement
       * à l'administrateur de la structure.
       */
      // if (role === 'ADMIN_STRUCTURE') {

      //   items.splice(2, 0, {
      //     label: 'incubateur.nav.parcours',
      //     path: '/incubateur/parcours',
      //     icon: 'layers',
      //   });

      // }


      return items;
    });
}