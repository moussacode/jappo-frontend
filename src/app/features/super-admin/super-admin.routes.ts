import { Routes } from '@angular/router';

import { SuperAdminLayout } from '../../layout/super-admin-layout/super-admin-layout';

export const SUPER_ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: SuperAdminLayout,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./dashboard/super-admin-dashboard')
            .then(m => m.SuperAdminDashboard),
      },
      {
        path: 'structures',
        loadComponent: () =>
          import('./structures/structures-list/structures-list')
            .then(m => m.StructuresList),
      },
      {
        path: 'structures/:id',
        loadComponent: () =>
          import('./structures/structure-detail/structure-detail')
            .then(m => m.StructureDetail),
      },
      {
        path: 'transactions',
        loadComponent: () =>
          import('./transactions/transactions-list/transactions-list')
            .then(m => m.TransactionsList),
      },
      {
        path: 'abonnements',
        loadComponent: () =>
          import('./abonnements/abonnements-list/abonnements-list')
            .then(m => m.AbonnementsList),
      },
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'dashboard',
      },
    ],
  },
];