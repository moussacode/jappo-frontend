# Design system JAPPO

Ce document est la référence visuelle et pratique pour toute création ou
refonte d'écran dans `jappo-frontend`. Il décrit l'état actuel du code et les
conventions à suivre pour harmoniser les pages sans modifier leur métier.

## Principes pour les prochains écrans

1. Réutiliser les composants de `src/app/shared/components` avant de créer un
   nouveau composant visuel. Étendre un composant partagé seulement si le besoin
   est réellement commun à plusieurs pages.
2. Utiliser les tokens sémantiques (`bg-surface`, `text-ink`,
   `border-line`, `text-accent`...) plutôt que des couleurs arbitraires ou des
   valeurs hexadécimales dans les templates.
3. Conserver les layouts, routes, traductions, états métier et actions
   existantes. Une refonte visuelle ne doit pas changer le comportement.
4. Respecter le thème actif et les modes clair/sombre. Ne pas ajouter un
   traitement spécifique à une page si un token sémantique existe déjà.
5. Rendre chaque écran responsive, utilisable au clavier, et prévoir ses états
   chargement, vide, erreur et données.
6. Avant de modifier une page, lire son template et sa logique, identifier ses
   composants existants, puis ne modifier que la couche visuelle nécessaire.

## Identité et tokens

Les tokens sont définis dans `src/styles.css` avec Tailwind CSS v4. La police
globale est **Plus Jakarta Sans**.

### Palette sémantique à utiliser

| Token CSS | Utilitaire Tailwind | Usage |
| --- | --- | --- |
| `--color-surface` | `bg-surface` | Surface principale, cartes et panneaux |
| `--color-surface-muted` | `bg-surface-muted` | Fond secondaire et arrière-plan des espaces connectés |
| `--color-surface-subtle` | `bg-surface-subtle` | Surface discrète |
| `--color-line` | `border-line`, `divide-line` | Bordures et séparateurs |
| `--color-line-strong` | `border-line-strong` | Bordure renforcée / survol |
| `--color-input-border` | `border-input-border` | Bordure de champ de formulaire |
| `--color-ink` | `text-ink` | Texte principal |
| `--color-ink-muted` | `text-ink-muted` | Texte secondaire |
| `--color-ink-faint` | `text-ink-faint` | Texte de faible emphase |
| `--color-accent` | `bg-accent`, `text-accent`, `border-accent` | Action et accent principaux |
| `--color-accent-strong` | `bg-accent-strong`, `text-accent-strong` | Accent renforcé / survol |
| `--color-accent-soft` | `bg-accent-soft` | Fond doux associé à l’accent |

La palette par défaut des tokens sémantiques est l'identité récente dite
« Dub » : surfaces blanches/gris clair, texte charbon et accent bleu
électrique (`#2563eb`). Les thèmes définis dans `ThemeService` sont `system`,
`light`, `dark`, `ocean`, `forest` et `glass`. La feuille de style et
`ThemeService` font foi pour leur comportement réel.

### Couleurs d'état existantes

Les couleurs d'état sont disponibles via les tokens de couleur dans
`src/styles.css` (notamment `success`, `warning`, `danger` et `info`). Utiliser
les classes d'état cohérentes avec les composants et leur sens métier : succès,
attention, erreur et information. Ne pas coder un état uniquement par la
couleur ; conserver aussi un libellé ou une icône compréhensible.

### Rayon et ombres

| Token | Valeur actuelle | Usage |
| --- | --- | --- |
| `--radius-button` | `8px` | Boutons partagés |
| `--radius-input` | `6px` | Token prévu pour les champs |
| `--radius-card` | `12px` | Cartes |
| `--radius-card-lg` | `16px` | Cartes larges |
| `--radius-pill` | `9999px` | Pastilles |
| `--shadow-subtle` | `0 1px 2px ...` | Ombre très légère |

Privilégier les bordures fines et les surfaces sobres. Les rayons existants
dans quelques composants ne sont pas encore strictement uniformes ; pour les
nouveaux écrans, utiliser les tokens ou `app-card` plutôt que d'ajouter de
nouveaux rayons arbitraires.

### Échelle visuelle recommandée

- Titre de page unique et explicite (`h1`), généralement `text-xl` à
  `text-3xl` selon la largeur disponible.
- Titres de section courts et hiérarchiquement inférieurs au titre de page.
- Texte courant lisible ; `text-ink-muted` pour les descriptions et métadonnées,
  pas pour les informations indispensables.
- Espacement basé sur l'échelle Tailwind (`gap-4`, `gap-6`, `p-4`, `p-6`).
  Les vues principales utilisent souvent un conteneur centré `max-w-7xl`,
  avec un padding responsive.
- Transitions courtes et discrètes ; respecter `prefers-reduced-motion`.

Cette échelle est une convention de cohérence pour les nouvelles refontes,
pas une affirmation que toutes les pages actuelles la suivent déjà.

## Composants partagés

Chemin racine : `src/app/shared/components/`. Vérifier le composant avant
d'écrire son équivalent dans une page.

### Briques de mise en page et contenu

| Sélecteur | Composant | Utilisation |
| --- | --- | --- |
| `<app-sidebar>` | `sidebar/sidebar.ts` | Navigation des espaces connectés ; reçoit `navItems` avec `label`, `path`, `icon` et éventuellement `children` |
| `<app-page-header>` | `page-header/page-header.component.ts` | Titre, sous-titre, fil d'Ariane facultatif et actions via `ng-content` |
| `<app-breadcrumb>` | `breadcrumb/breadcrumb.component.ts` | Fil d'Ariane avec tableau d'éléments `label`, `url` et paramètres optionnels |
| `<app-card>` | `card/card.component.ts` | Carte partagée ; `padding`: `none/sm/md/lg`, `variant`: `default/muted/flat`, `hoverable` |
| `<app-kpi-card>` | `kpi-card/kpi-card.ts` | Indicateur chiffré (`label`, `value`, `note`, tendance éventuelle) |
| `<app-entity-card>` | `entity-card/entity-card.component.ts` | Carte navigable d'entité, badge, zones projetées `card-body` et `card-footer` |
| `<app-avatar>` | `avatar/avatar.component.ts` | Avatar par URL d'image ou initiales ; tailles `sm/md/lg/xl` |
| `<app-view-switcher>` | `view-switcher/view-switcher.component.ts` | Choix de vue `grid/table`, événement `modeChange` |
| `<app-tab-filter>` | `tab-filter/tab-filter.component.ts` | Filtres sous forme d'onglets, options avec valeur, libellé et compteur facultatif |
| `<app-icon>` | `icon/icon.ts` | Icône typée ; utiliser une valeur de `IconName` et une taille adaptée |

### Actions, formulaire et retours d'état

| Sélecteur | Composant | Utilisation |
| --- | --- | --- |
| `<app-button>` | `button/button.component.ts` | Bouton partagé ; variantes `primary/secondary/ghost`, tailles `xs/sm/md/lg`, largeur pleine facultative |
| `<app-badge>` | `badge/badge.ts` | Statut compact ; valeurs `primary/warning/success/danger/info/neutral/purple/pink` |
| `<app-input>` | `input/input.component.ts` | Champ compatible `ControlValueAccessor` ; types usuels et état `invalid` |
| `<app-form-field>` | `input/form-field.component.ts` | Libellé, champ projeté, indication ou erreur, état requis |
| `<app-modal>` | `modal/modal.component.ts` | Dialogue avec titre/sous-titre, largeur, fermeture par bouton, backdrop ou Échap |
| `<app-empty-state>` | `empty-state/empty-state.ts` | État vide avec titre, description, icône facultative et actions projetées |
| `<app-loading-state>` | `loading-state/loading-state.ts` | État de chargement avec texte et barres de squelette configurables |
| `<app-error-state>` | `error-state/error-state.ts` | Erreur avec texte et action de nouvelle tentative |

Autres composants réutilisables présents : `app-header`,
`app-notification-bell`, `app-structure-switcher`, `app-parametres-modal`,
`app-voice-modal`, `app-etape-timeline`, `app-parcours-progress` (frise
responsive des phases, étapes et missions d'un projet) et
`app-websocket-diagnostic`.
Consulter leurs fichiers avant usage pour vérifier leur rôle et leur API.

## Squelettes d'écran

### Pages d'espace connecté

- Conserver le layout associé à l'espace ; il fournit déjà la sidebar et le
  conteneur scrollable.
- Placer le contenu dans un conteneur centré et responsive, avec une largeur
  maîtrisée et des espacements cohérents.
- Commencer par un en-tête (de préférence `app-page-header`), avec les actions
  principales à proximité du titre.
- Structurer les pages de liste ainsi : en-tête, barre de recherche/filtres,
  contenu (cartes ou tableau), pagination si elle existe.
- Structurer les détails ainsi : retour/fil d'Ariane, titre et statut, actions,
  puis informations réparties en sections.
- Utiliser le même composant d'état pour les chargements, listes vides et
  erreurs au sein d'un parcours.

### Pages publiques, authentification et paiement

Ces pages n'utilisent pas nécessairement la sidebar. Garder une composition
plus focalisée, préserver leurs parcours spécifiques et réutiliser les mêmes
tokens, typographie, boutons et champs.

## Référence des layouts

Les layouts sont actuellement définis dans :

- `src/app/layout/entrepreneur-layout/entrepreneur-layout.ts` : sidebar
  Entrepreneur et conteneur `bg-surface-muted`.
- `src/app/layout/incubateur-layout/incubateur-layout.ts` : sidebar
  Incubateur, navigation liée au contexte de structure et conteneur
  `bg-surface-muted`.
- `src/app/layout/super-admin-layout/super-admin-layout.ts` : sidebar
  Super-admin et conteneur utilisant encore `bg-neutral-25`.

Le composant `app-header` existe mais n'est pas le shell utilisé par ces trois
layouts actuellement. Ne pas en ajouter un automatiquement lors d'une refonte.

## Inventaire des pages à harmoniser

Les routes ci-dessous viennent de `src/app/app.routes.ts` et
`src/app/features/super-admin/super-admin.routes.ts`. Les paramètres `:id`
représentent les variantes de détail, pas des pages statiques supplémentaires.

### Public, authentification et paiement

| Route | Écran |
| --- | --- |
| `/` | Page d'accueil / landing |
| `/connexion` | Connexion |
| `/mot-de-passe-oublie` | Mot de passe oublié |
| `/inscription/incubateur` | Inscription d'une structure |
| `/auth/accept-invitation` | Acceptation d'invitation |
| `/onboarding/projet` | Onboarding projet |
| `/choisir-structure` | Choix de structure |
| `/upgrade` | Passage à l'offre Premium |
| `/paiement/succes` | Confirmation de paiement |
| `/paiement/annule` | Paiement annulé |
| `/assistance` | Assistance |

### Espace Entrepreneur

Les routes ci-dessous, sauf la salle de réunion, sont sous le layout
`/entrepreneur`.

| Route | Écran |
| --- | --- |
| `/entrepreneur/mon-parcours` | Parcours de l'entrepreneur (route par défaut) |
| `/entrepreneur/dashboard` | Tableau de bord |
| `/entrepreneur/missions` | Liste des missions |
| `/entrepreneur/missions/:id` | Détail d'une mission |
| `/entrepreneur/documents` | Documents / livrables |
| `/entrepreneur/reunions` | Liste des réunions |
| `/entrepreneur/projets` | Liste des projets |
| `/entrepreneur/projets/:id/modifier` | Modification d'un projet |

La route `/entrepreneur/reunions/:id` ouvre la salle de réunion sans passer par
ce layout.

### Espace Incubateur

Les routes ci-dessous, sauf la salle de réunion, sont sous le layout
`/incubateur`.

| Route | Écran |
| --- | --- |
| `/incubateur/dashboard` | Tableau de bord |
| `/incubateur/cohortes` | Liste des cohortes |
| `/incubateur/cohortes/:id` | Détail d'une cohorte |
| `/incubateur/parcours` | Liste des parcours |
| `/incubateur/programmes` | Liste des programmes |
| `/incubateur/programmes/:id` | Détail d'un programme |
| `/incubateur/programmes/etapes/:id` | Détail d'une étape |
| `/incubateur/programmes/:programmeId/parcours/:parcoursId` | Détail du parcours d'un programme |
| `/incubateur/entrepreneurs` | Liste des entrepreneurs |
| `/incubateur/entrepreneurs/:id` | Détail d'un entrepreneur |
| `/incubateur/missions` | Liste des missions |
| `/incubateur/missions/:id` | Détail d'une mission |
| `/incubateur/missions-cohorte/:id` | Détail des missions d'une cohorte |
| `/incubateur/projets` | Liste des projets |
| `/incubateur/projets/:id` | Détail d'un projet |
| `/incubateur/assistant-ia` | Assistant IA |
| `/incubateur/parametres` | Paramètres |
| `/incubateur/reunions` | Liste des réunions |
| `/incubateur/reunions/nouvelle` | Planification d'une réunion |
| `/incubateur/ressources` | Liste des ressources |

La route `/incubateur/reunions/:id` ouvre la salle de réunion sans passer par
ce layout.

### Espace Super-admin

Les routes sont sous `/super-admin`.

| Route | Écran |
| --- | --- |
| `/super-admin/dashboard` | Vue d'ensemble |
| `/super-admin/structures` | Liste des structures |
| `/super-admin/structures/:id` | Détail d'une structure |
| `/super-admin/transactions` | Liste des transactions |
| `/super-admin/abonnements` | Liste des abonnements |

## Écarts connus à garder en tête

- Les tokens sémantiques récents sont définis, mais plusieurs écrans
  Entrepreneur utilisent encore l'ancienne palette `brand` / `neutral`.
- Le Super-admin conserve certaines classes `neutral-*`.
- Certains composants, notamment les badges, utilisent des couleurs directes
  plutôt que les tokens sémantiques.
- Des composants de chargement/erreur n'ont pas encore le même traitement
  thématique que les composants plus récents.
- Le header partagé existe, mais les layouts applicatifs s'appuient sur la
  sidebar comme shell.

Lors d'une refonte, migrer ces écarts vers les tokens sémantiques seulement
dans le périmètre convenu. Ne pas modifier globalement les tokens ou composants
partagés au milieu de la refonte d'une page sans vérifier l'impact sur les
autres pages.

## Déroulé conseillé pour une refonte page par page

1. Choisir une route et inventorier son contenu, ses actions, ses états et ses
   composants actuels.
2. Repérer son layout et ses dépendances visuelles partagées.
3. Réorganiser la hiérarchie et appliquer les tokens, espacements et composants
   ci-dessus ; préserver la logique Angular et les traductions.
4. Vérifier desktop et mobile, états clair/sombre, focus clavier, chargement,
   erreur et absence de données.
5. Lancer le build frontend, puis vérifier les parcours touchés.
6. Une fois les motifs répétés confirmés sur plusieurs pages, promouvoir les
   améliorations communes dans les composants partagés.

### Brief à réutiliser pour une page

> Refonte visuelle de `[route / nom de page]` dans `jappo-frontend`.
> Lis `DESIGN_SYSTEM.md`, puis inspecte le template et la logique existants.
> Réutilise les composants partagés et les tokens sémantiques documentés.
> Harmonise la mise en page sans changer les routes, comportements, données ou
> traductions. Préserve le layout de l'espace et les états de la page. Vérifie
> la responsivité et lance le build frontend.
