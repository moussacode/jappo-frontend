import { Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-error-state',
  imports: [ButtonComponent],
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-token-md)] border border-neutral-200 bg-danger-100 px-6 py-10 text-center">
      <span class="text-3xl">⚠️</span>
      <p class="text-base font-semibold text-danger-500">{{ title() }}</p>
      <p class="max-w-sm text-sm text-neutral-700">{{ description() }}</p>
      @if (actionLabel()) {
        <app-button (click)="retry.emit()">{{ actionLabel() }}</app-button>
      }
    </div>
  `,
})
export class ErrorState {
  title = input('Une erreur est survenue');
  description = input('Impossible de charger ces données pour le moment. Vérifie ta connexion et réessaie.');
  actionLabel = input('Réessayer');
  retry = output<void>();
}