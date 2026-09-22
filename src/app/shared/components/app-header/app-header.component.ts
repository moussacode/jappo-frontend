import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationBellComponent } from '../notification-bell/notification-bell.component';

/**
 * Header global de l'application JAPPO.
 *
 * Affiche :
 * - Logo/nom de l'application
 * - Notifications
 * - Utilisateur connecté
 * - Contexte de structure active
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, NotificationBellComponent],
  template: `
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <!-- Logo -->
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <div 
        class="mb-4 flex h-10 items-center px-2 transition-all shrink-0"
        
      >
    
          <img src="/logo.png" alt="JAPPO" class="h-8 w-auto object-contain" />
       
        
      </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center gap-4">
        <!-- Notifications -->
        <app-notification-bell></app-notification-bell>

        <!-- Séparateur -->
        <div class="h-6 w-px bg-gray-200"></div>

        <!-- Utilisateur -->
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-medium text-gray-900">{{ utilisateurNom() }}</p>
            @if (structureActive()) {
              <p class="text-xs text-gray-500">{{ structureActive() }}</p>
            }
          </div>
          <div class="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-medium">
            {{ utilisateurInitials() }}
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class AppHeaderComponent {
  private router = inject(Router);

  protected utilisateurNom = signal('Utilisateur');
  protected utilisateurInitials = signal('U');
  protected structureActive = signal<string | null>(null);

  constructor() {
    this.initializeUserInfo();
  }

  /**
   * Initialiser les informations utilisateur.
   */
  private initializeUserInfo(): void {
    // TODO: Intégrer avec AuthService et StructureContextService
    // Pour l'instant, valeurs par défaut
    this.utilisateurNom.set('Moussa');
    this.utilisateurInitials.set('M');
    this.structureActive.set('Fabrique 360');
  }
}
