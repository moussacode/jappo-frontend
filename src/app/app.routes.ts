import { Routes } from '@angular/router';
import { Diagnostic } from './features/auth/pages/diagnostic/diagnostic';
import { Dashboard } from './features/entrepreneur/dashboard/dashboard/dashboard';
import { Bienvenue } from './features/auth/pages/bienvenue/bienvenue';

export const routes: Routes = [
    {
    path: '',
    redirectTo: 'connexion',
    pathMatch: 'full',
  },
  {
    path: 'connexion',
    loadComponent: () =>
      import('./features/auth/pages/connexion/connexion')
        .then(m => m.Connexion),
  },
  {
    path: 'inscription',
    loadComponent: () =>
      import('./features/auth/pages/inscription/inscription')
        .then(m => m.Inscription),
  },
  {
    path:'diagnostic',
    component:Diagnostic
  }
  ,
  {
    path:'entrepreneur/dashboard',
    component:Dashboard
  },
  {
    path:'bienvenue',
    component:Bienvenue
  },
  
  {
    path: '**',
    redirectTo: 'connexion',
  },
];
