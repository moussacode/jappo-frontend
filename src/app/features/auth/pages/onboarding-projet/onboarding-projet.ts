import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';

// Design System Partagé
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

@Component({
  selector: 'app-onboarding-projet',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
  ],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted/30 p-4">
      <app-card padding="lg" class="w-full max-w-lg shadow-sm">
        
        <!-- Indicateur de progression (Étape 2 / 2) -->
        <div class="mb-6 flex items-center justify-between border-b border-line pb-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-accent font-mono">Étape 2 sur 2</span>
          <span class="text-xs text-ink-muted">Configuration initiale</span>
        </div>

        <!-- En-tête -->
        <div class="flex flex-col gap-2">
          
          <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl mt-2">
            Quel est le nom de votre projet ?
          </h1>
          <p class="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Pour personnaliser votre espace d'accompagnement et démarrer vos premières missions, donnez un nom à votre startup ou entreprise.
          </p>
        </div>

        <!-- Formulaire -->
        <div class="mt-6 flex flex-col gap-5">
          <app-form-field label="Nom de la startup / entreprise" [required]="true">
            <app-input
              [(ngModel)]="nomProjet"
              placeholder="Ex: TerangaSkills, SolarSénégal..."
              (keyup.enter)="valider()"
            />
          </app-form-field>

          <div class="rounded-xl border border-line bg-surface-muted/40 p-3.5 text-xs text-ink-muted flex items-start gap-2.5">
            
            <p class="leading-relaxed">
              Pas encore fixé sur le nom final ? Pas d'inquiétude, vous pourrez le modifier à tout moment dans les paramètres de votre espace.
            </p>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
            {{ errorMessage() }}
          </div>
        }

        <!-- Actions -->
        <div class="mt-8 flex items-center justify-between border-t border-line pt-5">
          <button
            type="button"
            (click)="skip()"
            [disabled]="submitting()"
            class="text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            Passer pour le moment →
          </button>

          <app-button
            type="button"
            size="sm"
            [disabled]="!nomProjet().trim() || submitting()"
            (click)="valider()"
          >
            {{ submitting() ? 'Enregistrement…' : 'Accéder à mon espace' }}
          </app-button>
        </div>

      </app-card>
    </div>
  `,
})
export class OnboardingProjetComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly nomProjet = signal('');
  protected readonly projetId = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.projetService
      .getPrincipalByEntrepreneur(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.projetId.set(p.id);
          if (p.nom !== 'Mon Projet') {
            this.router.navigate(['/entrepreneur/dashboard']);
          }
        },
        error: () => {
          this.router.navigate(['/entrepreneur/dashboard']);
        },
      });
  }

  protected valider(): void {
    const id = this.projetId();
    const nouveauNom = this.nomProjet().trim();

    if (!id || !nouveauNom) {
      this.skip();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.projetService
      .updateNomProjet(id, nouveauNom)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/entrepreneur/dashboard']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err?.error?.message ?? "Erreur lors de l'enregistrement du nom."
          );
        },
      });
  }

  protected skip(): void {
    this.router.navigate(['/entrepreneur/dashboard']);
  }
}