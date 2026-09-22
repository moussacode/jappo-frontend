import { Component, input, output, HostListener } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">

      <!-- Backdrop Click -->
      <div class="absolute inset-0" (click)="close.emit()"></div>

      <!-- Dialogue Content -->
      <div [class]="modalClasses()">

        <!-- Header pre-formate si titre fourni -->
        @if (title()) {
          <div class="flex items-center justify-between border-b border-line px-4 py-3 sm:px-6 sm:py-4">
            <div class="min-w-0 flex-1 pr-2">
              <h3 class="text-sm font-bold text-ink truncate">{{ title() }}</h3>
              @if (subtitle()) {
                <p class="text-xs text-ink-muted mt-0.5 line-clamp-2">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="flex size-8 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer shrink-0"
            >
              <app-icon name="x" class="size-4" />
            </button>
          </div>
        } @else {
          <!-- Bouton fermeture flottant si header personnalisé -->
          <button
            type="button"
            (click)="close.emit()"
            class="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
          >
            <app-icon name="x" class="size-4" />
          </button>
        }

        <!-- Slot Contenu -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <ng-content />
        </div>

      </div>
    </div>
  `
})
export class ModalComponent {
  title = input<string>();
  subtitle = input<string>();
  maxWidth = input<'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl'>('lg');

  close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close.emit();
  }

  protected modalClasses(): string {
    const base = 'relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]';
    const widths = {
      sm: 'max-w-[calc(100vw-2rem)] sm:max-w-sm',
      md: 'max-w-[calc(100vw-2rem)] sm:max-w-md',
      lg: 'max-w-[calc(100vw-2rem)] sm:max-w-lg',
      xl: 'max-w-[calc(100vw-2rem)] sm:max-w-xl',
      '2xl': 'max-w-[calc(100vw-2rem)] sm:max-w-2xl',
      '4xl': 'max-w-[calc(100vw-2rem)] sm:max-w-4xl'
    };
    return `${base} ${widths[this.maxWidth()]}`;
  }
}