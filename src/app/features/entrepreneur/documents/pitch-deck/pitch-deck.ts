import {
  Component,
  HostListener,
  inject,
  computed,
  signal,
} from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { DocumentService } from '../../../../core/services/document.service';

import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/components/icon/icon';
import { DocumentGenere } from '../../../../core/models';

interface SlidePitch {
  titre: string;
  titrePrincipal: string;
  texte: string;
}

interface PitchDeckContenu {
  slides: SlidePitch[];
}

@Component({
  selector: 'app-pitch-deck',
  imports: [RouterLink, Icon],
  templateUrl: './pitch-deck.html',
  styleUrl: './pitch-deck.css',
})
export class PitchDeck {

  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly documentService = inject(DocumentService);

  protected readonly document =
    signal<DocumentGenere | undefined>(undefined);

  protected readonly slides = computed(
    () =>
      (
        this.document()?.contenu as
          | PitchDeckContenu
          | undefined
      )?.slides ?? []
  );

  protected readonly slideActive = signal(0);

  protected readonly isFullscreen = signal(false);

  constructor() {

    const userId = this.authService.currentUser()?.id;

    if (!userId) return;

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .subscribe((projet) => {

        if (!projet) return;

        this.documentService
          .getByType(projet.id, 'pitch_deck')
          .subscribe((doc) => {
            this.document.set(doc);
          });

      });
  }

  protected nextSlide(): void {

    const slides = this.slides();

    if (this.slideActive() < slides.length - 1) {
      this.slideActive.update(
        (index) => index + 1
      );
    }
  }

  protected previousSlide(): void {

    if (this.slideActive() > 0) {
      this.slideActive.update(
        (index) => index - 1
      );
    }
  }

  protected toggleFullscreen(): void {

    this.isFullscreen.update(
      (value) => !value
    );
  }

  @HostListener('document:keydown', ['$event'])
  protected handleKeyboard(event: KeyboardEvent): void {

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousSlide();
    }

    if (
      event.key === 'Escape' &&
      this.isFullscreen()
    ) {
      this.isFullscreen.set(false);
    }
  }
}