import { Routes } from '@angular/router';

/**
 * Routes des maquettes statiques (aucun guard, aucun appel API).
 * Chaque lot regroupe ses écrans sur une seule page à importer
 * dans Figma avec html.to.design.
 */
export const MAQUETTES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./maquettes-index').then((m) => m.MaquettesIndex),
  },
  {
    path: 'lot-1',
    title: 'JAPPO · Lot 1 — Public & auth',
    loadComponent: () => import('./lots/lot-1-public').then((m) => m.Lot1Public),
  },
  {
    path: 'lot-2',
    title: 'JAPPO · Lot 2 — Entrepreneur',
    loadComponent: () => import('./lots/lot-2-entrepreneur').then((m) => m.Lot2Entrepreneur),
  },
  {
    path: 'lot-3',
    title: 'JAPPO · Lot 3 — Incubateur pilotage',
    loadComponent: () => import('./lots/lot-3-incubateur-pilotage').then((m) => m.Lot3IncubateurPilotage),
  },
  {
    path: 'lot-4',
    title: 'JAPPO · Lot 4 — Incubateur suivi',
    loadComponent: () => import('./lots/lot-4-incubateur-suivi').then((m) => m.Lot4IncubateurSuivi),
  },
  {
    path: 'lot-5',
    title: 'JAPPO · Lot 5 — Super-admin & modales',
    loadComponent: () => import('./lots/lot-5-super-admin').then((m) => m.Lot5SuperAdmin),
  },
];
