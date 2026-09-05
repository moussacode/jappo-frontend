import { Routes } from '@angular/router';

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
    path: 'inscription',
    loadComponent: () => import('./features/auth/pages/inscription/inscription').then((m) => m.Inscription),
  },
    {
    path: 'inscription/incubateur',
    loadComponent: () =>
      import('./features/auth/pages/inscription-structure/inscription-structure').then((m) => m.InscriptionStructure),
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
        path: 'parcours',
        loadComponent: () =>
          import('./features/entrepreneur/parcours/parcours/parcours').then((m) => m.Parcours),
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
          import('./features/entrepreneur/documents/documents-hub/documents-hub').then((m) => m.DocumentsHub),
      },
      {
        path: 'documents/bmc',
        loadComponent: () => import('./features/entrepreneur/documents/bmc/bmc').then((m) => m.Bmc),
      },
      {
        path: 'documents/pitch-deck',
        loadComponent: () =>
          import('./features/entrepreneur/documents/pitch-deck/pitch-deck').then((m) => m.PitchDeck),
      },
      {
        path: 'documents/business-plan',
        loadComponent: () =>
          import('./features/entrepreneur/documents/business-plan/business-plan').then((m) => m.BusinessPlan),
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
        path: 'entrepreneurs/:id',
        loadComponent: () =>
          import('./features/incubateur/entrepreneurs/entrepreneur-detail/entrepreneur-detail').then(
            (m) => m.EntrepreneurDetail,
          ),
      },
    ],
  },

  {
    path: '**',
    redirectTo: '',
  },
];