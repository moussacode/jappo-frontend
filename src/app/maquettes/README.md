# Maquettes JAPPO (import Figma via html.to.design)

Les maquettes **ne réécrivent aucune page** : chaque écran monte le vrai
composant de page de l'application (`features/…`), dans le vrai shell de son
espace (sidebar + barre du haut), avec les **données réelles du compte
connecté**. Ce qui est dans l'application est donc exactement ce qui est dans
la maquette.

| URL | Lot | Compte à connecter |
| --- | --- | --- |
| `/maquettes/lot-1` | Public, auth & paiement | aucun (ou connecté) |
| `/maquettes/lot-2` | Espace Entrepreneur | entrepreneur |
| `/maquettes/lot-3` | Incubateur — pilotage | administrateur de structure |
| `/maquettes/lot-4` | Incubateur — suivi | administrateur de structure |
| `/maquettes/lot-5` | Super-admin & modales | super-admin (5.01–5.06) puis admin (5.07–5.11) |

## Utilisation

1. Lancer l'application et se connecter avec le compte du lot.
2. Ouvrir `/maquettes/lot-N` dans le même navigateur.
3. Importer la page avec l'**extension Chrome** html.to.design (elle capture la
   page telle qu'affichée, avec votre session), largeur 1600 px.

## Fonctionnement

- `kit/mq-page.ts` affiche un composant de page réel : il fournit un faux
  `ActivatedRoute` (identifiants réels), bloque les navigations pour rester sur
  la planche, et met en surbrillance la bonne entrée de menu.
- `donnees-reelles.ts` récupère, en lecture seule, le premier élément existant
  (cohorte, programme, projet…) pour les pages de détail. S'il n'y en a pas,
  l'écran l'indique au lieu d'inventer des données.
- Les modales réelles sont affichées par-dessus leur page, confinées au cadre.

Ajouter un écran : `<mq-screen …><mq-page [composant]="…" url="…" /></mq-screen>`
dans le lot voulu. Une page ne doit jamais être recopiée ici.

Non inclus : la salle de réunion vidéo (elle rejoindrait réellement l'appel).
