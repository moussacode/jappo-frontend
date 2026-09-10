import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Icon, ButtonComponent],
  template: `
    <div class="min-h-screen bg-surface text-ink selection:bg-accent/20 font-sans antialiased">
      
      <!-- ================= NAVBAR ================= -->
      <header class="sticky top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-md">
        <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:px-8">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="JAPPO" class="h-7 w-auto object-contain" />
           
          </div>

          <nav class="hidden md:flex items-center gap-8 text-xs font-medium text-ink-muted">
            <a href="#features" class="hover:text-ink transition-colors">Fonctionnalités</a>
            <a href="#cohortes" class="hover:text-ink transition-colors">Cohortes</a>
            <a href="#ecosysteme" class="hover:text-ink transition-colors">Écosystème</a>
          </nav>

          <div class="flex items-center gap-3">
            <a routerLink="/connexion" class="text-xs font-medium text-ink-muted hover:text-ink transition-colors px-3 py-2">
              Se connecter
            </a>
            <app-button routerLink="/inscription/incubateur" variant="primary" size="xs">
              Créer un espace
            </app-button>
          </div>
        </div>
      </header>

      <!-- ================= HERO SECTION ================= -->
      <section class="relative overflow-hidden pt-4 pb-16 sm:pt-28 sm:pb-24 border-b border-line">
  <!-- Arrière-plan épuré et sobre -->
  <div class="absolute top-1/2 left-1/2 -z-10 h-[350px] w-[550px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/5 blur-[120px]"></div>

  <div class="mx-auto max-w-5xl px-6 text-center">
    
    <!-- Badge neutre -->
    <!-- <div class="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-line bg-surface-muted/60 text-xs font-medium text-ink-muted mb-6">
    
      <span>Conçu pour tous les incubateurs et accélérateurs</span>
    </div> -->

    <!-- Titre propre (Retour au design normal) -->
    <h1 class="text-4xl font-bold tracking-tight text-ink sm:text-6xl lg:text-7xl leading-[1.1]">
      L'infrastructure de pilotage <br class="hidden sm:inline" />
      <span class="text-ink/90">pour vos porteurs de projets.</span>
    </h1>

    <p class="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-ink-muted leading-relaxed">
      Centralisez le suivi des incubés, évaluez les scores de maturité en temps réel et orchestrez vos cohortes avec une précision chirurgicale.
    </p>

    <!-- Boutons d'action -->
    <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
      <app-button routerLink="/inscription/incubateur" variant="primary" size="lg">
        Lancer mon incubateur
      </app-button>
      <a href="#features" class="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-button)] border border-line bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-muted">
        <span>Découvrir la plateforme</span>
      </a>
    </div>

    <!-- Conteneur Dashboard Preview + Cartes Flottantes Lottie -->
    <div class="mt-16 sm:mt-20 relative max-w-4xl mx-auto">
      
      <!--  CARTE FLOTTANTE GAUCHE : Lottie SVG "Livrable Validé" -->
      <div class="hidden md:flex animate-float absolute -top-6 -right-6  z-20 items-center gap-3 rounded-2xl border border-line bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-ink/5">
        
        <!-- SVG Lottie d'une coche animée avec onde de choc -->
        <div class="relative flex h-9 w-9 items-center justify-center shrink-0">
          <span class="absolute inset-0 rounded-full  "></span>
          <div class="h-8 w-8 rounded-full  border border-vivid-green/30 flex items-center justify-center text-vivid-green">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path class="animate-check" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
        </div>

        <div class="text-left">
          <p class="text-xs font-semibold text-ink">Livrable validé</p>
          <p class="text-[11px] text-ink-muted">Business Model Canvas</p>
        </div>
      </div>

      <!-- 📊 CARTE FLOTTANTE DROITE : Lottie SVG "Graphe d'Avancement" -->
      <div class="hidden md:flex animate-float-delayed absolute -bottom-5 -left-8  z-20 items-center gap-3 rounded-2xl border border-line bg-surface/95 backdrop-blur-md px-4 py-3 shadow-lg shadow-ink/5">
        
        <!-- SVG Lottie des barres statistiques animées -->
        <div class="h-9 w-9 rounded-xl border border-accent/20 flex items-end justify-center p-2 gap-1 text-accent shrink-0">
          <span class="w-1 bg-accent rounded-full h-full animate-bar-1"></span>
          <span class="w-1 bg-accent rounded-full h-full animate-bar-2"></span>
          <span class="w-1 bg-accent rounded-full h-full animate-bar-3"></span>
        </div>

        <div class="text-left">
          <p class="text-xs font-semibold text-ink">Maturité du projet</p>
          <p class="text-[11px]  text-vivid-green font-semibold">82% atteint</p>
        </div>
      </div>

      <!-- Image Dashboard Normale -->
      <div class="relative rounded-[var(--radius-card-lg)] border border-line bg-surface p-2 shadow-2xl shadow-ink/5 overflow-hidden">
        <div class="rounded-[calc(var(--radius-card-lg)-4px)] overflow-hidden border border-line bg-surface-muted/30">
          <img src="/dashboard-preview.png" alt="Jappo Dashboard" class="w-full h-auto object-cover" />
        </div>
      </div>

    </div>

  </div>
</section>
      <!-- ================= FEATURES GRID ================= -->
      <section id="features" class="py-24 border-b border-line">
        <div class="mx-auto max-w-7xl px-6 sm:px-8">
          
          <div class="max-w-2xl mb-16">
            <h2 class="text-xs font-semibold uppercase tracking-wider text-accent mb-3">Architecture & Puissance</h2>
            <h3 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
              Tout ce dont un incubateur moderne a besoin.
            </h3>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-8 flex flex-col justify-between transition-all hover:border-line-strong">
              <div>
                <div class="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center text-ink mb-6 border border-line">
                  <app-icon name="cohortes" class="size-5"  />
                </div>
                <h4 class="text-base font-semibold text-ink">Gestion de Cohortes</h4>
                <p class="mt-2 text-xs text-ink-muted leading-relaxed">
                  Structurez vos promotions, assignez des mentors spécialisés et suivez l'avancement global par milestone de façon transparente.
                </p>
              </div>
              <div class="mt-8 pt-4 border-t border-line flex items-center text-xs font-medium text-ink">
                <span>Promotions & Suivi</span>
                <app-icon name="arrow-right" class="size-3.5 ml-auto text-ink-muted" />
              </div>
            </div>

            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-8 flex flex-col justify-between transition-all hover:border-line-strong">
              <div>
                <div class="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center text-ink mb-6 border border-line">
                  <app-icon name="bar-chart" class="size-5"  />
                </div>
                <h4 class="text-base font-semibold text-ink">Scoring de Maturité</h4>
                <p class="mt-2 text-xs text-ink-muted leading-relaxed">
                  Indicateurs d'évaluation intégrés pour identifier instantanément les startups à fort potentiel et ajuster l'accompagnement.
                </p>
              </div>
              <div class="mt-8 pt-4 border-t border-line flex items-center text-xs font-medium text-ink">
                <span>Métriques d'impact</span>
                <app-icon name="arrow-right" class="size-3.5 ml-auto text-ink-muted" />
              </div>
            </div>

            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-8 flex flex-col justify-between transition-all hover:border-line-strong">
              <div>
                <div class="h-10 w-10 rounded-xl bg-surface-muted flex items-center justify-center text-ink mb-6 border border-line">
                  <app-icon name="lock" class="size-5" />
                </div>
                <h4 class="text-base font-semibold text-ink">Sécurité & Gouvernance</h4>
                <p class="mt-2 text-xs text-ink-muted leading-relaxed">
                  Rôles granulaires (Administrateur, Gestionnaire, Mentor, Porteur) et protection totale des données stratégiques.
                </p>
              </div>
              <div class="mt-8 pt-4 border-t border-line flex items-center text-xs font-medium text-ink">
                <span>Conformité & Rôles</span>
                <app-icon name="arrow-right" class="size-3.5 ml-auto text-ink-muted" />
              </div>
            </div>

          </div>

        </div>
      </section>

      <!-- ================= COHORTES SECTION ================= -->
      <section id="cohortes" class="py-24 border-b border-line bg-surface-muted/20">
        <div class="mx-auto max-w-7xl px-6 sm:px-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 class="text-xs font-semibold uppercase tracking-wider text-accent mb-3">Cycles de vie</h2>
              <h3 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                Pilotez chaque cohorte de l'idée à la levée de fonds.
              </h3>
              <p class="mt-4 text-xs sm:text-sm text-ink-muted leading-relaxed">
                Jappo structure l'accompagnement dispensé par votre structure en organisant les livrables, les revues de comités d'engagement et les bilans d'étape dans une interface unifiée.
              </p>
              <div class="mt-8 space-y-4">
                <div class="flex items-start gap-3">
                  <div class="h-5 w-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <p class="text-xs font-semibold text-ink">Candidatures & Sélection</p>
                    <p class="text-[11px] text-ink-muted">Classement et filtrage des dossiers entrants selon vos critères d'éligibilité.</p>
                  </div>
                </div>
                <div class="flex items-start gap-3">
                  <div class="h-5 w-5 rounded-full bg-accent/10 text-accent flex items-center justify-center text-xs font-bold mt-0.5">✓</div>
                  <div>
                    <p class="text-xs font-semibold text-ink">Jalons & Mentorat</p>
                    <p class="text-[11px] text-ink-muted">Planification des sessions de coaching et validation des livrables entrepreneuriaux.</p>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-sm">
              <p class="text-xs font-semibold text-ink mb-4">Aperçu d'une promotion active</p>
              <div class="space-y-3">
                <div class="p-3 rounded-lg border border-line bg-surface-muted/40 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-medium text-ink">Cohorte Alpha - Tech & Impact</p>
                    <p class="text-[10px] text-ink-muted">15 Startups - Phase d'accélération</p>
                  </div>
                  <span class="text-xs font-semibold text-accent">82% complété</span>
                </div>
                <div class="p-3 rounded-lg border border-line bg-surface-muted/40 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-medium text-ink">Incubation Lab #3</p>
                    <p class="text-[10px] text-ink-muted">12 Startups - MVP & Prototypage</p>
                  </div>
                  <span class="text-xs font-semibold text-ink-muted">54% complété</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= ECOSYSTEME & TEMOIGNAGES ================= -->
      <section id="ecosysteme" class="py-24 border-b border-line">
        <div class="mx-auto max-w-7xl px-6 sm:px-8 text-center">
          <h2 class="text-xs font-semibold uppercase tracking-wider text-accent mb-3">Écosystème & Partenaires</h2>
          <h3 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl mb-16">
            Conçu pour amplifier l'impact de votre structure.
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-8">
              <p class="text-xs font-semibold text-ink mb-2">« Un gain de temps considérable au quotidien. »</p>
              <p class="text-xs text-ink-muted leading-relaxed mb-6">
                Le suivi des jalons de nos porteurs de projets et la visibilité sur l'état d'avancement des cohortes nous permettent de cibler nos efforts d'accompagnement là où c'est le plus nécessaire.
              </p>
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink">M</div>
                <div>
                  <p class="text-xs font-semibold text-ink">Équipe de gestion</p>
                  <p class="text-[10px] text-ink-muted">Structure d'accompagnement</p>
                </div>
              </div>
            </div>

            <div class="rounded-[var(--radius-card-lg)] border border-line bg-surface p-8">
              <p class="text-xs font-semibold text-ink mb-2">« Une structure claire pour structurer notre croissance. »</p>
              <p class="text-xs text-ink-muted leading-relaxed mb-6">
                Avoir un espace centralisé pour interagir avec les mentors, déposer nos livrables et suivre notre feuille de route change radicalement notre quotidien d'entrepreneurs incubés.
              </p>
              <div class="flex items-center gap-3">
                <div class="h-8 w-8 rounded-full bg-surface-muted border border-line flex items-center justify-center text-xs font-bold text-ink">P</div>
                <div>
                  <p class="text-xs font-semibold text-ink">Porteur de projet incubé</p>
                  <p class="text-[10px] text-ink-muted">Cohorte active Jappo</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ================= CTA FINAL ================= -->
      <section class="py-24 text-center bg-surface-muted/30">
        <div class="mx-auto max-w-3xl px-6">
          <h2 class="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Prêt à transformer la gestion de votre incubateur ?
          </h2>
          <p class="mt-4 text-sm text-ink-muted">
            Rejoignez les structures innovantes et pilotez vos porteurs de projets avec un outil taillé sur mesure.
          </p>
          <div class="mt-8 flex justify-center gap-3">
            <app-button routerLink="/inscription/incubateur" variant="primary" size="lg">
              Créer mon espace Incubateur
            </app-button>
          </div>
        </div>
      </section>

      <!-- ================= FOOTER ================= -->
      <footer class="border-t border-line py-12">
        <div class="mx-auto max-w-7xl px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-ink-muted">
          <div class="flex items-center gap-3">
            <img src="/logo.png" alt="JAPPO" class="h-5 w-auto object-contain grayscale opacity-70" />
            <span>© 2026 Jappo Inc. Tous droits réservés.</span>
          </div> 
          <div class="flex items-center gap-6">
            <a routerLink="/connexion" class="hover:text-ink transition-colors">Connexion</a>
            <a routerLink="/inscription/incubateur" class="hover:text-ink transition-colors">Inscription</a>
            <a href="#" class="hover:text-ink transition-colors">Confidentialité</a>
          </div>
        </div>
      </footer>

    </div>
  `,
})
export class LandingPage {}