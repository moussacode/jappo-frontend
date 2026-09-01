import {
  Component,
  HostListener,
  inject,
  computed,
  signal,
} from '@angular/core';

import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { DocumentService } from '../../../../core/services/document.service';
import { Icon } from "../../../../shared/components/icon/icon";

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
  private readonly documentService = inject(DocumentService);

  private readonly userId =
    this.authService.currentUser()?.id ?? '';

  private readonly document = toSignal(
    this.documentService.getByType(
      this.userId,
      'pitch_deck'
    ),
    {
      initialValue: undefined,
    }
  );

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

  protected nextSlide(): void {
    const slides = this.slides();

    if (this.slideActive() < slides.length - 1) {
      this.slideActive.update((index) => index + 1);
    }
  }

  protected previousSlide(): void {
    if (this.slideActive() > 0) {
      this.slideActive.update((index) => index - 1);
    }
  }

  protected toggleFullscreen(): void {
    this.isFullscreen.update((value) => !value);
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

    if (event.key === 'Escape' && this.isFullscreen()) {
      this.isFullscreen.set(false);
    }
  }
}