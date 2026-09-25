import {
  Component,
  computed,
  inject,
} from '@angular/core';

import { RouterOutlet } from '@angular/router';

import {
  Sidebar,
  NavItem,
} from '../../shared/components/sidebar/sidebar';

import { AuthService } from '../../core/services/auth.service';

import {
  StructureContextService,
} from '../../core/services/structure-context.service';


@Component({
  selector: 'app-incubateur-layout',

  imports: [
    RouterOutlet,
    Sidebar,
  ],

  template: `
    <div class="flex h-screen flex-col">

      <div class="flex flex-1 overflow-hidden">

        <app-sidebar
          [navItems]="navItems()"
        />

        <main
          class="flex-1 overflow-y-auto bg-surface-muted"
        >
          <router-outlet />
        </main>

      </div>

    </div>
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


      const items: NavItem[] = [

        {
          label: 'incubateur.nav.dashboard',
          path: '/incubateur/dashboard',
          icon: 'dashboard',
        },

        {
          label: 'incubateur.nav.cohortes',
          path: '/incubateur/cohortes',
          icon: 'cohortes',
        },

        {
          label: 'incubateur.nav.entrepreneurs',
          path: '/incubateur/entrepreneurs',
          icon: 'entrepreneurs',
        },

        {
          label: 'incubateur.nav.activites',
          path: '/incubateur/missions',
          icon: 'missions',
        },

        {
          label: 'incubateur.nav.projets',
          path: '/incubateur/projets',
          icon: 'folder',
        },

        {
          label: 'incubateur.nav.reunions',
          path: '/incubateur/reunions',
          icon: 'video',
        },

        {
          label: 'incubateur.nav.ressources',
          path: '/incubateur/ressources',
          icon: 'book-open',
        },

        {
          label: 'incubateur.nav.assistantIa',
          path: '/incubateur/assistant-ia',
          icon: 'ai',
        },
      ];


      /*
       * Le parcours est accessible uniquement
       * à l'administrateur de la structure.
       */
      if (role === 'ADMIN_STRUCTURE') {

        items.splice(2, 0, {
          label: 'incubateur.nav.parcours',
          path: '/incubateur/parcours',
          icon: 'layers',
        });

      }


      return items;
    });
}