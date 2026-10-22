import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'mq-index',
  imports: [RouterLink],
  template: `
    <div class="mq-lot min-h-screen bg-neutral-100 px-20 py-16 font-sans">
      <p class="font-mono text-sm font-semibold text-accent">JAPPO · Maquettes</p>
      <h1 class="mt-2 text-4xl font-bold tracking-tight text-neutral-900">5 lots d'écrans à importer</h1>
      <p class="mt-2 max-w-2xl text-neutral-500">
        Chaque écran affiche la vraie page de l'application avec les données du compte connecté. Connectez-vous avec le bon compte, ouvrez un lot, puis importez-le dans Figma avec l'extension html.to.design (largeur 1600 px).
      </p>
      <div class="mt-10 grid grid-cols-5 gap-4">
        @for (l of lots; track l.chemin) {
          <a [routerLink]="l.chemin" class="rounded-2xl border border-neutral-200 bg-white p-6 transition hover:border-neutral-400">
            <p class="font-mono text-xs text-neutral-500">/maquettes/{{ l.chemin }}</p>
            <p class="mt-2 text-lg font-semibold text-neutral-900">{{ l.titre }}</p>
            <p class="mt-1 text-sm text-neutral-500">{{ l.ecrans }} écrans</p>
            <p class="mt-3 text-xs text-neutral-500">Compte à connecter : <strong class="text-neutral-800">{{ l.compte }}</strong></p>
          </a>
        }
      </div>
    </div>
  `,
})
export class MaquettesIndex {
  protected lots = [
    { chemin: 'lot-1', titre: 'Public, auth & paiement', ecrans: 11, compte: 'Aucun (ou connecté)' },
    { chemin: 'lot-2', titre: 'Espace Entrepreneur', ecrans: 10, compte: 'Entrepreneur' },
    { chemin: 'lot-3', titre: 'Incubateur — pilotage', ecrans: 12, compte: 'Administrateur' },
    { chemin: 'lot-4', titre: 'Incubateur — suivi', ecrans: 10, compte: 'Administrateur' },
    { chemin: 'lot-5', titre: 'Super-admin & modales', ecrans: 11, compte: 'Super-admin puis admin' },
  ];
}
