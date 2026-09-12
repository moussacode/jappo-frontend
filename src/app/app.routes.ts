import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { incubateurGuard } from './core/guards/incubateur.guard';

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

  // --- Auth / Onboarding (sans sidebar) ---
  {
    path: 'connexion',
    loadComponent: () => import('./features/auth/pages/connexion/connexion').then((m) => m.Connexion),
  },
  {
  path: 'mot-de-passe-oublie',
  loadComponent: () => import('./features/auth/pages/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
}
,
 
    {
    path: 'inscription/incubateur',
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
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
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
        path: 'assistant-ia',
        loadComponent: () =>
          import('./features/entrepreneur/assistant-ia/assistant-ia/assistant-ia').then((m) => m.AssistantIa),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('./features/entrepreneur/profil/profil/profil').then((m) => m.Profil),
      },{
      path: 'profil/changer-forfait',
        loadComponent: () =>
          import('./features/entrepreneur/profil/changer-forfait/changer-forfait').then((m) => m.ChangerForfait),
      },
//       {
//   path: 'pitch-deck-editor',
//   loadComponent: () =>
//     import('./features/entrepreneur/documents/pitch-deck-editor/pitch-deck-editor')
//       .then(m => m.PitchDeckEditor),
// }
      

      // documents/pitch-deck, documents/business-plan, documents/etude-marche,
      // assistant-ia, profil : à ajouter au fur et à mesure qu'on les construit
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
        path: 'cohortes/nouvelle',
        loadComponent: () =>
          import('./features/incubateur/cohortes/nouvelle-cohorte/nouvelle-cohorte').then((m) => m.NouvelleCohorte),
      },
            {
        path: 'cohortes/:id',
        loadComponent: () =>
          import('./features/incubateur/cohortes/cohorte-detail/cohorte-detail').then((m) => m.CohorteDetail),
      },
      {
        path: 'entrepreneurs',
        loadComponent: () =>
          import('./features/incubateur/entrepreneurs/entrepreneurs-list/entrepreneurs-list').then(
            (m) => m.EntrepreneursList,
          ),
      },
       {
        path: 'entrepreneurs/inviter',
        loadComponent: () =>
          import('./features/incubateur/entrepreneurs/inviter-entrepreneur/inviter-entrepreneur').then(
            (m) => m.InviterEntrepreneur,
          ),
      },
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
        path: 'missions/attribuer',
        loadComponent: () =>
          import('./features/incubateur/missions/attribuer-mission/attribuer-mission').then((m) => m.AttribuerMission),
      },
      {
    path: 'missions/:id',
    loadComponent: () => import('./features/incubateur/missions/mission-detail/mission-detail').then((m) => m.MissionDetail),
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
  path: 'parametres',
  loadComponent: () => import('./features/incubateur/parametres/parametres').then((m) => m.Parametres),
}
     
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];