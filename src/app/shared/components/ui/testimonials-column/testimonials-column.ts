import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AvatarComponent } from '../../avatar/avatar.component';

export interface Testimonial {
  titre?: string;
  contenu: string;
  auteur: string;
  role: string;
  initiale: string;
  image?: string;
}

/** Nombre minimum de cartes par moitié de boucle, pour que la colonne ne se vide jamais. */
const MIN_CARDS_PER_LOOP = 4;

/**
 * Port Angular de « TestimonialsColumn » (21st.dev), sans motion/react.
 *
 * Défilement vertical infini en CSS pur : la liste est rendue deux fois et la piste
 * glisse de 0 à -50 %, ce qui rend la boucle invisible. Pause au survol.
 */
@Component({
  selector: 'app-testimonials-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './testimonials-column.html',
  styleUrl: './testimonials-column.css',
  host: {
    '[style.--tc-duration]': 'duration() + "s"',
  },
})
export class TestimonialsColumn {
  readonly testimonials = input.required<Testimonial[]>();
  /** Durée d'une boucle complète, en secondes. */
  readonly duration = input(10);

  /** Une moitié de boucle, répétée si la liste est trop courte pour remplir la colonne. */
  protected readonly loop = computed(() => {
    const items = this.testimonials();
    if (!items.length) return [];
    const repeat = Math.ceil(MIN_CARDS_PER_LOOP / items.length);
    return Array.from({ length: repeat }, () => items).flat();
  });
}
