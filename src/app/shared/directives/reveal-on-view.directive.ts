import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';

/**
 * Fondu + légère montée à la première apparition dans le viewport
 * (équivalent de `whileInView` + `viewport={{ once: true }}` de motion).
 *
 * Le contenu reste visible si JS ne s'exécute pas ou si l'utilisateur
 * préfère réduire les animations.
 */
@Directive({
  selector: '[appRevealOnView]',
  standalone: true,
})
export class RevealOnViewDirective {
  /** Délai avant le fondu, en millisecondes. */
  readonly revealDelay = input(100);

  constructor() {
    const el = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      if (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        typeof IntersectionObserver === 'undefined'
      ) {
        return;
      }

      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          el.style.transition = `opacity 800ms cubic-bezier(0.16, 1, 0.3, 1) ${this.revealDelay()}ms, transform 800ms cubic-bezier(0.16, 1, 0.3, 1) ${this.revealDelay()}ms`;
          el.style.opacity = '1';
          el.style.transform = 'none';
          observer.disconnect();

          // Une fois révélé, on retire les styles inline pour rendre la main aux classes (ex. transitions de survol).
          const cleanup = (event: TransitionEvent) => {
            if (event.target !== el) return;
            el.removeEventListener('transitionend', cleanup);
            el.style.removeProperty('transition');
            el.style.removeProperty('transform');
            el.style.removeProperty('opacity');
          };
          el.addEventListener('transitionend', cleanup);
        },
        { threshold: 0.2 },
      );
      observer.observe(el);

      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}
