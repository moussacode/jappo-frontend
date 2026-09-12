import { Component, input, output, HostListener } from '@angular/core';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [Icon],
  template: `
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      
      <!-- Backdrop Click -->
      <div class="absolute inset-0" (click)="close.emit()"></div>

      <!-- Dialogue Content -->
      <div [class]="modalClasses()">
        
        <!-- Header pre-formate si titre fourni -->
        @if (title()) {
          <div class="flex items-center justify-between border-b border-line px-6 py-4">
            <div>
              <h3 class="text-sm font-bold text-ink">{{ title() }}</h3>
              @if (subtitle()) {
                <p class="text-xs text-ink-muted mt-0.5">{{ subtitle() }}</p>
              }
            </div>
            <button
              type="button"
              (click)="close.emit()"
              class="flex size-8 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
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
        <div class="p-6">
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
    const base = 'relative w-full overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in zoom-in-95 duration-200';
    const widths = {
      sm: 'max-w-sm',
      md: 'max-w-md',
      lg: 'max-w-lg',
      xl: 'max-w-xl',
      '2xl': 'max-w-2xl',
      '4xl': 'max-w-4xl'
    };
    return `${base} ${widths[this.maxWidth()]}`;
  }
}