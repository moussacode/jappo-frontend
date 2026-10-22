import { Component, OnDestroy, OnInit, input } from '@angular/core';

/**
 * Page d'un lot : titre puis pile verticale d'écrans.
 * Force le thème clair pendant l'affichage (imports Figma homogènes)
 * et restaure le thème de l'utilisateur en quittant la page.
 */
@Component({
  selector: 'mq-lot',
  template: `
    <div class="min-h-screen bg-neutral-100 px-20 py-16 font-sans">
      <header class="mb-14">
        <p class="font-mono text-sm font-semibold text-accent">JAPPO · Maquettes · Lot {{ numero() }}</p>
        <h1 class="mt-2 text-4xl font-bold tracking-tight text-neutral-900">{{ titre() }}</h1>
        <p class="mt-2 max-w-3xl text-base text-neutral-500">{{ description() }}</p>
      </header>
      <div class="flex flex-col gap-20">
        <ng-content />
      </div>
    </div>
  `,
})
export class MqLot implements OnInit, OnDestroy {
  numero = input.required<number>();
  titre = input.required<string>();
  description = input('');

  private themePrecedent: { sombre: boolean; theme: string | null } | null = null;

  ngOnInit(): void {
    const html = document.documentElement;
    this.themePrecedent = { sombre: html.classList.contains('dark'), theme: html.getAttribute('data-theme') };
    html.classList.remove('dark');
    html.setAttribute('data-theme', 'light');
  }

  ngOnDestroy(): void {
    const html = document.documentElement;
    if (!this.themePrecedent) return;
    html.classList.toggle('dark', this.themePrecedent.sombre);
    if (this.themePrecedent.theme) html.setAttribute('data-theme', this.themePrecedent.theme);
  }
}
