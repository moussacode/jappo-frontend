import { NgComponentOutlet } from '@angular/common';
import { Component, Injector, OnInit, Type, computed, inject, input, signal } from '@angular/core';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Observable, catchError, of, take } from 'rxjs';

import { AppShell } from '../../shared/components/app-shell/app-shell';
import { NavItem } from '../../shared/components/sidebar/sidebar';
import { ENTREPRENEUR_NAV } from '../../layout/entrepreneur-layout/entrepreneur-layout';
import { INCUBATEUR_NAV } from '../../layout/incubateur-layout/incubateur-layout';
import { SUPER_ADMIN_NAV } from '../../layout/super-admin-layout/super-admin-layout';
import { EntrepreneurAssistantWidget } from '../../features/entrepreneur/assistant/entrepreneur-assistant-widget';

export type MqEspace = 'public' | 'entrepreneur' | 'incubateur' | 'super-admin';

/** Données réelles nécessaires à un écran (identifiants de route, objets pour une modale…). */
export type MqDonnees = Record<string, unknown>;
export type MqResolveur = (injector: Injector) => Observable<MqDonnees | null>;

const NAV: Record<Exclude<MqEspace, 'public'>, NavItem[]> = {
  entrepreneur: ENTREPRENEUR_NAV,
  incubateur: INCUBATEUR_NAV,
  'super-admin': SUPER_ADMIN_NAV,
};

/**
 * Affiche une vraie page de l'application dans une maquette : le composant
 * de page réel, dans le shell réel de son espace, avec les données du compte
 * connecté. Rien n'est réécrit : seule la route est simulée.
 */
@Component({
  selector: 'mq-page',
  imports: [NgComponentOutlet, AppShell, EntrepreneurAssistantWidget],
  host: { class: 'flex flex-1 flex-col' },
  template: `
    @if (etat() === 'chargement') {
      <div class="flex h-[900px] items-center justify-center text-sm text-ink-muted">Chargement des données réelles…</div>
    } @else if (etat() === 'vide') {
      <div class="flex h-[900px] flex-col items-center justify-center gap-1 text-center">
        <p class="text-sm font-medium text-ink">Aucune donnée réelle pour cet écran</p>
        <p class="text-xs text-ink-muted">{{ manque() }}</p>
      </div>
    } @else {
      @if (espace() === 'public') {
        <ng-container *ngComponentOutlet="composant(); injector: injecteur()" />
      } @else {
        <app-shell
          class="flex-1"
          [navItems]="nav()"
          [urlSimulee]="urlReelle()"
          [integre]="true"
          [espace]="espace() === 'super-admin' ? 'Administration JAPPO' : undefined"
        >
          <ng-container *ngComponentOutlet="composant(); injector: injecteur()" />
        </app-shell>
        @if (espace() === 'entrepreneur') {
          <app-entrepreneur-assistant-widget />
        }
      }
      @if (modale(); as m) {
        <ng-container *ngComponentOutlet="m; inputs: entreesModale(); injector: injecteur()" />
      }
    }
  `,
})
export class MqPage implements OnInit {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);

  /** Composant de page réel à afficher. */
  composant = input.required<Type<unknown>>();
  espace = input<MqEspace>('incubateur');
  /** Route réelle de la page, avec ses paramètres (ex. « /incubateur/cohortes/:id »). */
  url = input('');
  /** Paramètres de requête statiques (?token=…). */
  query = input<Record<string, string>>({});
  /** Récupère les données réelles (identifiants…) nécessaires à l'écran. */
  resoudre = input<MqResolveur>();
  /** Explication affichée si aucune donnée n'est disponible. */
  manque = input('Créez d’abord les données correspondantes dans l’application.');
  /** Modale réelle affichée par-dessus la page. */
  modale = input<Type<unknown>>();
  entrees = input<(d: MqDonnees) => Record<string, unknown>>(() => ({}));

  protected readonly etat = signal<'chargement' | 'pret' | 'vide'>('chargement');
  private readonly donnees = signal<MqDonnees>({});

  protected readonly nav = computed(() => NAV[this.espace() as Exclude<MqEspace, 'public'>] ?? []);
  protected readonly entreesModale = computed(() => this.entrees()(this.donnees()));

  /** Route avec les vrais identifiants, pour la sidebar et le fil d'Ariane. */
  protected readonly urlReelle = computed(() =>
    this.url().replace(/:(\w+)/g, (_, cle: string) => String(this.donnees()[cle] ?? cle)),
  );

  protected readonly injecteur = computed(() => {
    const params = Object.fromEntries(
      Object.entries(this.donnees()).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>;
    const query = this.query();
    const route = {
      snapshot: { paramMap: convertToParamMap(params), queryParamMap: convertToParamMap(query), params, queryParams: query, data: {} },
      paramMap: of(convertToParamMap(params)),
      queryParamMap: of(convertToParamMap(query)),
      params: of(params),
      queryParams: of(query),
      data: of({}),
    };
    // Les pages ne doivent pas quitter la planche de maquettes (redirections, liens).
    const routeur = new Proxy(this.router, {
      get: (cible, prop) =>
        prop === 'navigate' || prop === 'navigateByUrl'
          ? () => Promise.resolve(true)
          : (Reflect.get(cible, prop) as unknown) instanceof Function
            ? (Reflect.get(cible, prop) as (...a: unknown[]) => unknown).bind(cible)
            : Reflect.get(cible, prop),
    });
    return Injector.create({
      providers: [
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: routeur },
      ],
      parent: this.injector,
    });
  });

  ngOnInit(): void {
    const resoudre = this.resoudre();
    if (!resoudre) {
      this.etat.set('pret');
      return;
    }
    resoudre(this.injector)
      .pipe(
        take(1),
        catchError(() => of(null)),
      )
      .subscribe((d) => {
        if (!d) {
          this.etat.set('vide');
          return;
        }
        this.donnees.set(d);
        this.etat.set('pret');
      });
  }
}
