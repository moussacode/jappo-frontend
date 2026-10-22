import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';

/**
 * Port Angular du « ContainerScroll » (Aceternity / 21st.dev), sans framer-motion.
 *
 * - Titre projeté via [containerTitle], contenu de la carte via le slot par défaut.
 * - La progression du scroll (0 → 1) est calculée sur l'hôte comme `useScroll({ target })`
 *   (0 quand le haut de l'hôte touche le bas du viewport, 1 quand son bas l'atteint).
 * - Les transformations sont écrites en CSS custom properties (--cs-rotate, --cs-scale,
 *   --cs-translate) directement sur l'hôte : aucune détection de changement par frame.
 */
@Component({
  selector: 'app-container-scroll',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  templateUrl: './container-scroll.html',
  styleUrl: './container-scroll.css',
})
export class ContainerScroll {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly isMobile = signal(false);
  private readonly reducedMotion = signal(false);

  constructor() {
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      const mobileQuery = window.matchMedia('(max-width: 768px)');
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0;

      const update = () => {
        frame = 0;
        this.apply(this.progress());
      };
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      const onMediaChange = () => {
        this.isMobile.set(mobileQuery.matches);
        this.reducedMotion.set(motionQuery.matches);
        schedule();
      };

      onMediaChange();
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', schedule, { passive: true });
      mobileQuery.addEventListener('change', onMediaChange);
      motionQuery.addEventListener('change', onMediaChange);

      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', schedule);
        mobileQuery.removeEventListener('change', onMediaChange);
        motionQuery.removeEventListener('change', onMediaChange);
        if (frame) cancelAnimationFrame(frame);
      });
    });
  }

  private progress(): number {
    const rect = this.host.getBoundingClientRect();
    if (rect.height <= 0) return 1;
    const value = (window.innerHeight - rect.top) / rect.height;
    return Math.min(1, Math.max(0, value));
  }

  private apply(p: number): void {
    const style = this.host.style;

    if (this.reducedMotion()) {
      style.setProperty('--cs-rotate', '0deg');
      style.setProperty('--cs-scale', '1');
      style.setProperty('--cs-translate', '0px');
      return;
    }

    const [scaleFrom, scaleTo] = this.isMobile() ? [0.7, 0.9] : [1.05, 1];
    style.setProperty('--cs-rotate', `${20 * (1 - p)}deg`);
    style.setProperty('--cs-scale', `${scaleFrom + (scaleTo - scaleFrom) * p}`);
    style.setProperty('--cs-translate', `${-100 * p}px`);
  }
}
