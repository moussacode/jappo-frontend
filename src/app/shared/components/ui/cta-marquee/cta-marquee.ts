import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RevealOnViewDirective } from '../../../directives/reveal-on-view.directive';

/**
 * Nombre de caractères visés par moitié de marquee. La boucle fait glisser deux
 * moitiés identiques de -50 % : elle ne paraît infinie que si une moitié est plus
 * large que l'écran, sinon un trou traverse la section. Une phrase courte est donc
 * répétée jusqu'à atteindre cette longueur.
 */
const MIN_CHARS_PER_HALF = 48;

/**
 * Port Angular de « Cta69 » (21st.dev) : appel à l'action centré sur une phrase
 * géante qui défile en fond. Les boutons sont projetés via le slot par défaut.
 */
@Component({
  selector: 'app-cta-marquee',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [RevealOnViewDirective],
  templateUrl: './cta-marquee.html',
  styleUrl: './cta-marquee.css',
})
export class CtaMarquee {
  readonly badge = input<string>();
  readonly heading = input<string>();
  /** Phrase répétée qui défile en arrière-plan. */
  readonly marqueePhrase = input<string>();
  /** Ligne d'accompagnement sous le titre. */
  readonly note = input<string>();
  /** Petite mention sous le bouton. */
  readonly footnote = input<string>();

  // Le séparateur est dans la phrase (et non en padding) pour un espacement identique entre chaque répétition.
  protected readonly marqueeLine = computed(() => {
    const phrase = this.marqueePhrase();
    if (!phrase) return '';
    const unit = `${phrase} · `;
    return unit.repeat(Math.max(2, Math.ceil(MIN_CHARS_PER_HALF / unit.length)));
  });
}
