import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import type Konva from 'konva';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { DocumentService } from '../../../../core/services/document.service';

import {
  CoreShapeComponent,
  NgKonvaEventObject,
  StageComponent,
} from 'ng2-konva';

import { StageConfig } from 'konva/lib/Stage';
import { LayerConfig } from 'konva/lib/Layer';
import { TextConfig } from 'konva/lib/shapes/Text';
import { RectConfig } from 'konva/lib/shapes/Rect';
import { Icon } from "../../../../shared/components/icon/icon";

interface SlidePitch {
  titre: string;
  titrePrincipal: string;
  texte: string;
}

interface PitchDeckContenu {
  slides: SlidePitch[];
}

interface EditorElement {
  id: string;
  type: 'text';

  x: number;
  y: number;

  width: number;

  content: string;

  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  fill: string;

  draggable: boolean;
}

interface EditorSlide {
  id: string;
  source: SlidePitch;
  elements: EditorElement[];
}

@Component({
  selector: 'app-pitch-deck-editor',
  standalone: true,
  imports: [
    RouterLink,
    StageComponent,
    CoreShapeComponent,
    Icon
],
  templateUrl: './pitch-deck-editor.html',
  styleUrl: './pitch-deck-editor.css',
})
export class PitchDeckEditor {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);

  private readonly userId =
    this.authService.currentUser()?.id ?? '';

  private readonly document = toSignal(
    this.documentService.getByType(
      this.userId,
      'pitch_deck',
    ),
    {
      initialValue: undefined,
    },
  );

  protected readonly slides = computed<SlidePitch[]>(
    () =>
      (
        this.document()?.contenu as
          | PitchDeckContenu
          | undefined
      )?.slides ?? [],
  );

  protected readonly editorSlides = computed<EditorSlide[]>(
    () =>
      this.slides().map((slide, index) =>
        this.createEditorSlide(slide, index),
      ),
  );

  protected readonly slideActive = signal(0);

  protected readonly isFullscreen = signal(false);

  protected readonly selectedElementId =
    signal<string | null>(null);

  protected readonly stageConfig: StageConfig = {
    width: 960,
    height: 540,
  };

  protected readonly backgroundConfig: RectConfig = {
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    fill: '#ffffff',
    listening: false,
  };

  protected readonly currentEditorSlide = computed(
    () => this.editorSlides()[this.slideActive()],
  );

  protected readonly currentElements = computed(
    () =>
      this.currentEditorSlide()?.elements ?? [],
  );

  protected readonly selectedElement = computed(
    () => {
      const id = this.selectedElementId();

      if (!id) {
        return null;
      }

      return (
        this.currentElements().find(
          (element) => element.id === id,
        ) ?? null
      );
    },
  );

  private createEditorSlide(
    slide: SlidePitch,
    index: number,
  ): EditorSlide {
    return {
      id: `slide-${index + 1}`,
      source: slide,

      elements: [
        {
          id: `slide-${index + 1}-label`,
          type: 'text',
          x: 80,
          y: 80,
          width: 800,
          content: slide.titre.toUpperCase(),
          fontSize: 18,
          fontFamily: 'Arial',
          fontStyle: 'bold',
          fill: '#10b981',
          draggable: true,
        },

        {
          id: `slide-${index + 1}-title`,
          type: 'text',
          x: 80,
          y: 150,
          width: 800,
          content: slide.titrePrincipal,
          fontSize: 38,
          fontFamily: 'Arial',
          fontStyle: 'bold',
          fill: '#171717',
          draggable: true,
        },

        {
          id: `slide-${index + 1}-text`,
          type: 'text',
          x: 80,
          y: 300,
          width: 800,
          content: slide.texte,
          fontSize: 20,
          fontFamily: 'Arial',
          fill: '#525252',
          draggable: true,
        },
      ],
    };
  }

  protected selectElement(
    elementId: string,
  ): void {
    this.selectedElementId.set(elementId);
  }

  protected clearSelection(): void {
    this.selectedElementId.set(null);
  }

  protected handleElementClick(
    event: NgKonvaEventObject<MouseEvent>,
    elementId: string,
  ): void {
    event.event.cancelBubble = true;

    this.selectElement(elementId);
  }

 protected handleDragEnd(
  event: NgKonvaEventObject<MouseEvent>,
  element: EditorElement,
): void {
  const node = event.event.target as Konva.Node;

  element.x = node.x();
  element.y = node.y();

  console.log('Element déplacé:', {
    id: element.id,
    x: element.x,
    y: element.y,
  });
}

  protected nextSlide(): void {
    const slides = this.slides();

    if (
      this.slideActive() <
      slides.length - 1
    ) {
      this.slideActive.update(
        (index) => index + 1,
      );

      this.clearSelection();
    }
  }

  protected previousSlide(): void {
    if (this.slideActive() > 0) {
      this.slideActive.update(
        (index) => index - 1,
      );

      this.clearSelection();
    }
  }

  protected selectSlide(index: number): void {
    this.slideActive.set(index);
    this.clearSelection();
  }

  protected toggleFullscreen(): void {
    this.isFullscreen.update(
      (value) => !value,
    );

    this.clearSelection();
  }

  protected readonly trackSlide = (
    index: number,
  ): string =>
    `slide-${index}`;

  protected readonly trackElement = (
    index: number,
    element: EditorElement,
  ): string =>
    element.id;

  @HostListener(
    'document:keydown',
    ['$event'],
  )
  protected handleKeyboard(
    event: KeyboardEvent,
  ): void {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextSlide();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousSlide();
      return;
    }

    if (
      event.key === 'Escape' &&
      this.isFullscreen()
    ) {
      this.isFullscreen.set(false);
      this.clearSelection();
    }
  }
}