import { Component, ChangeDetectionStrategy, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../shared/components/button/button.component';

// Déclaration pour que TypeScript reconnaisse GSAP chargé via CDN ou npm
declare const gsap: any;
declare const ScrollTrigger: any;

@Component({
  selector: 'app-landing-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RouterLink, Icon, ButtonComponent],
  templateUrl: './landing-page.html',
})
export class LandingPage implements AfterViewInit, OnDestroy {
  private readonly elRef = inject(ElementRef);
  private scrollTriggerInstance: any = null;

  protected readonly features = [
    {
      icon: 'cohortes' as const,
      title: 'Gestion de Cohortes',
      description: 'Structurez vos promotions, assignez des mentors et suivez l\'avancement global par milestone de façon transparente.',
      cta: 'Promotions & Suivi',
    },
    {
      icon: 'bar-chart' as const,
      title: 'Scoring de Maturité',
      description: 'Indicateurs d\'évaluation intégrés pour identifier instantanément les startups à fort potentiel et ajuster l\'accompagnement.',
      cta: 'Métriques d\'impact',
    },
    {
      icon: 'lock' as const,
      title: 'Sécurité & Gouvernance',
      description: 'Rôles granulaires (Administrateur, Gestionnaire, Mentor, Porteur) et protection totale des données stratégiques.',
      cta: 'Conformité & Rôles',
    },
    {
      icon: 'book-open' as const,
      title: 'Ressources Pédagogiques',
      description: 'Une bibliothèque de ressources (PDF, vidéos, liens) attachée à vos cohortes, parcours et missions.',
      cta: 'Bibliothèque',
    },
    {
      icon: 'video' as const,
      title: 'Réunions Intégrées',
      description: 'Planifiez et animez vos sessions de coaching directement dans la plateforme via LiveKit.',
      cta: 'Sessions de coaching',
    },
    {
      icon: 'sparkles' as const,
      title: 'Jappo Intelligence',
      description: 'Un assistant IA qui connaît le contexte réel de vos cohortes pour des recommandations actionnables.',
      cta: 'Découvrir l\'IA',
    },
  ];

  protected readonly iaPoints = [
    'Analyse le statut de chaque entrepreneur en temps réel',
    'Génère des recommandations ciblées par cohorte',
    'Rédige des synthèses de progression automatiques',
    'Répond aux questions métier avec le contexte réel de vos données',
  ];

  protected readonly workflowSteps = [
    { numero: '01', titre: 'Création de cohorte', description: 'Définissez la promotion, invitez les entrepreneurs et configurez le parcours.', actif: false },
    { numero: '02', titre: 'Attribution des missions', description: 'Assignez des jalons clairs à chaque startup avec dates et livrables attendus.', actif: true },
    { numero: '03', titre: 'Soumission & Revue', description: 'Les entrepreneurs déposent leurs livrables, vous évaluez et donnez du feedback.', actif: false },
    { numero: '04', titre: 'Validation & Graduation', description: 'Validez les jalons atteints et préparez la graduation ou la phase suivante.', actif: false },
  ];

  protected readonly cohorteBenefits = [
    { title: 'Candidatures & Sélection', desc: 'Classement et filtrage des dossiers entrants selon vos critères d\'éligibilité.' },
    { title: 'Jalons & Mentorat', desc: 'Planification des sessions de coaching et validation des livrables entrepreneuriaux.' },
    { title: 'Ressources & Bibliothèque', desc: 'Partagez des guides, templates et vidéos directement dans le parcours de vos incubés.' },
  ];

  protected readonly demoCohortes = [
    { nom: 'Cohorte Alpha — Tech & Impact', detail: '15 Startups · Phase d\'accélération', progression: 82 },
    { nom: 'Incubation Lab #3', detail: '12 Startups · MVP & Prototypage', progression: 54 },
    { nom: 'Batch Fintech 2026', detail: '8 Startups · Pré-incubation', progression: 27 },
  ];

  protected readonly temoignages = [
    {
      titre: '« Un gain de temps considérable au quotidien. »',
      contenu: 'Le suivi des jalons de nos porteurs de projets et la visibilité sur l\'état d\'avancement des cohortes nous permettent de cibler nos efforts d\'accompagnement là où c\'est le plus nécessaire.',
      initiale: 'M',
      auteur: 'Équipe de gestion',
      role: 'Structure d\'accompagnement',
    },
    {
      titre: '« Une structure claire pour organiser notre croissance. »',
      contenu: 'Avoir un espace centralisé pour interagir avec les mentors, déposer nos livrables et suivre notre feuille de route change radicalement notre quotidien d\'entrepreneurs incubés.',
      initiale: 'P',
      auteur: 'Porteur de projet incubé',
      role: 'Cohorte active Jappo',
    },
  ];

  ngAfterViewInit(): void {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);

      const orbitItems = this.elRef.nativeElement.querySelectorAll('.orbit-tool');

      if (orbitItems.length > 0) {
        // Animation GSAP ScrollTrigger ultra-fluide identique aux standards SaaS modernes
        this.scrollTriggerInstance = gsap.fromTo(orbitItems, 
          {
            x: (i: number, target: HTMLElement) => parseFloat(target.dataset['x'] || '0'),
            y: (i: number, target: HTMLElement) => parseFloat(target.dataset['y'] || '0'),
            scale: 1,
            opacity: 1
          },
          {
            x: 0,
            y: 0,
            scale: 0.2,
            opacity: 0,
            ease: "power1.out",
            scrollTrigger: {
              trigger: "#orbit-section",
              start: "top center",
              end: "bottom center",
              scrub: true, // Lie directement l'animation au défilement de la page
              markers: false
            }
          }
        );
      }
    }
  }

  ngOnDestroy(): void {
    // Nettoyage propre du ScrollTrigger pour éviter les fuites de mémoire lors du changement de page
    if (this.scrollTriggerInstance && this.scrollTriggerInstance.scrollTrigger) {
      this.scrollTriggerInstance.scrollTrigger.kill();
    }
  }
}