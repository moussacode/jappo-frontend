import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { incubateurGuard } from './core/guards/incubateur.guard';
import { publicGuard } from './core/guards/public.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '',
    pathMatch: 'full',
  },
  {
    path: '',
    loadComponent: () => import('./features/landing/landing-page/landing-page').then((m) => m.LandingPage),
  },


  {
  path: 'paiement/succes',
  loadComponent: () =>
    import('./features/paiement/pages/paiement-succes/paiement-succes')
      .then(m => m.PaiementSucces)
},

{
  path: 'paiement/annule',
  loadComponent: () =>
    import('./features/paiement/pages/paiement-annule/paiement-annule')
      .then(m => m.PaiementAnnule)
},

{
  path: 'upgrade',
  loadComponent: () =>
    import('./features/paiement/pages/upgrade-premium/upgrade-premium')
      .then(m => m.UpgradePremium)
},
  // --- Auth / Onboarding (sans sidebar) ---
  {
    path: 'connexion',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/pages/connexion/connexion').then((m) => m.Connexion),
  },
  {
  path: 'mot-de-passe-oublie',
  canActivate: [publicGuard],
  loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
}
,
 
    {
    path: 'inscription/incubateur',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./features/auth/pages/inscription-structure/inscription-structure').then((m) => m.InscriptionStructure),
  },
  {
    path: 'auth/accept-invitation',
    loadComponent: () =>
      import('./features/auth/accept-invitation/accept-invitation').then(
        (m) => m.AcceptInvitationComponent
      ),
  },
  {
  path: 'onboarding/projet',
  loadComponent: () =>
    import('./features/auth/pages/onboarding-projet/onboarding-projet')
      .then((m) => m.OnboardingProjetComponent),
  canActivate: [authGuard],
},
  {
  path: 'choisir-structure',
  canActivate: [authGuard],
  loadComponent: () =>
    import(
      './features/auth/choisir-structure/choisir-structure'
    ).then(
      (m) => m.ChoisirStructure
    ),
},
  // {
  //   path: 'diagnostic',
  //   loadComponent: () => import('./features/auth/pages/diagnostic/diagnostic').then((m) => m.Diagnostic),
  // },
  // {
  //   path: 'bienvenue',
  //   loadComponent: () => import('./features/auth/pages/bienvenue/bienvenue').then((m) => m.Bienvenue),
  // },

  // --- Espace Entrepreneur (avec sidebar) ---
  {
    path: 'entrepreneur',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/entrepreneur-layout/entrepreneur-layout').then((m) => m.EntrepreneurLayout),
    children: [
      { path: '', redirectTo: 'mon-parcours', pathMatch: 'full' },
      {
        path: 'mon-parcours',
        loadComponent: () =>
          import('./features/entrepreneur/mon-parcours/mon-parcours').then((m) => m.MonParcours),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/entrepreneur/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'missions',
        loadComponent: () =>
          import('./features/entrepreneur/missions/missions-list/missions-list').then((m) => m.MissionsList),
      },
      {
        path: 'missions/:id',
        loadComponent: () =>
          import('./features/entrepreneur/missions/mission-detail/mission-detail').then((m) => m.MissionDetail),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./features/entrepreneur/documents/mes-documents/mes-documents').then((m) => m.MesDocuments),
      },
      {
        path: 'reunions',
        loadComponent: () =>
          import('./features/entrepreneur/meetings/entrepreneur-meetings-list/entrepreneur-meetings-list').then((m) => m.EntrepreneurMeetingsListComponent),
      },
      {
        path: 'projets',
        loadComponent: () =>
          import('./features/entrepreneur/projets/entrepreneur-projets-list/entrepreneur-projets-list').then((m) => m.EntrepreneurProjetsListComponent),
      },
      {
        path: 'projets/:id/modifier',
        loadComponent: () =>
          import('./features/entrepreneur/projets/entrepreneur-projet-edit/entrepreneur-projet-edit').then((m) => m.EntrepreneurProjetEditComponent),
      },
    ],
  },

    {
    path: 'incubateur',
    loadComponent: () =>
      import('./layout/incubateur-layout/incubateur-layout').then((m) => m.IncubateurLayout),
    canActivate: [incubateurGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/incubateur/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
      },
            {
        path: 'cohortes',
        loadComponent: () =>
          import('./features/incubateur/cohortes/cohortes-list/cohortes-list').then((m) => m.CohortesList),
      },
      {
        path: 'cohortes/:id',
        loadComponent: () =>
          import('./features/incubateur/cohortes/cohorte-detail/cohorte-detail').then((m) => m.CohorteDetail),
      },
      {
        path: 'parcours',
        loadComponent: () =>
          import('./features/incubateur/parcours/parcours-list/parcours-list').then((m) => m.ParcoursList),
      },
      {
        path: 'entrepreneurs',
        loadComponent: () =>
          import('./features/incubateur/entrepreneurs/entrepreneurs-list/entrepreneurs-list').then(
            (m) => m.EntrepreneursList,
          ),
      },
      //  {
      //   path: 'entrepreneurs/inviter',
      //   loadComponent: () =>
      //     import('./features/incubateur/entrepreneurs/inviter-entrepreneur/inviter-entrepreneur').then(
      //       (m) => m.InviterEntrepreneur,
      //     ),
      // },
      {
        path: 'entrepreneurs/:id',
        loadComponent: () =>
          import('./features/incubateur/entrepreneurs/entrepreneur-detail/entrepreneur-detail').then(
            (m) => m.EntrepreneurDetail,
          ),
      },

      {
        path: 'missions',
        loadComponent: () =>
          import('./features/incubateur/missions/missions-list/missions-list').then((m) => m.MissionsList),
      },
      {
    path: 'missions/:id',
    loadComponent: () => import('./features/incubateur/missions/mission-detail/mission-detail').then((m) => m.MissionDetail),
  },
      {
        path: 'missions-cohorte/:id',
        loadComponent: () => import('./features/incubateur/missions/mission-cohorte-detail/mission-cohorte-detail').then((m) => m.MissionCohorteDetail),
  },
      {
        path: 'projets',
        loadComponent: () =>
          import('./features/incubateur/projets/projets-list/projets-list').then((m) => m.ProjetsList),
      },
       {
        path: 'projets/:id',
        loadComponent: () =>
          import('./features/incubateur/projets/projet-detail/projet-detail').then(
            (m) => m.ProjetDetail,
          ),
      },
       {
        path: 'assistant-ia',
        loadComponent: () =>
          import('./features/incubateur/assistant-ia/assistant-ia/assistant-ia').then((m) => m.AssistantIa),
      },
      {
        path: 'parametres',
        loadComponent: () => import('./features/incubateur/parametres/parametres').then((m) => m.Parametres),
      },
      {
        path: 'reunions',
        loadComponent: () =>
          import('./features/incubateur/meetings/meetings-list/meetings-list').then((m) => m.MeetingsListComponent),
      },
      {
        path: 'reunions/nouvelle',
        loadComponent: () =>
          import('./features/incubateur/meetings/meeting-planning/meeting-planning').then((m) => m.MeetingPlanningComponent),
      },
      {
        path: 'ressources',
        loadComponent: () =>
          import('./features/incubateur/ressources/ressources-list/ressources-list').then((m) => m.RessourcesList),
      },
    
    ],
  },
  
  {
  path: 'entrepreneur/reunions/:id',
  canActivate: [authGuard],
  loadComponent: () =>
    import('./features/incubateur/meetings/meeting-room/meeting-room')
      .then(m => m.MeetingRoomComponent),
},

{
  path: 'incubateur/reunions/:id',
  canActivate: [incubateurGuard],
  loadComponent: () =>
    import('./features/incubateur/meetings/meeting-room/meeting-room')
      .then(m => m.MeetingRoomComponent),
},

{
  path: 'super-admin',
  loadChildren: () =>
    import('./features/super-admin/super-admin.routes')
      .then(m => m.SUPER_ADMIN_ROUTES),
},
{
  path: 'assistance',
  loadComponent: () =>
    import('./features/assistance/assistance-page')
      .then(m => m.AssistancePage),
},

  {
    path: '**',
    redirectTo: '',
  },
];