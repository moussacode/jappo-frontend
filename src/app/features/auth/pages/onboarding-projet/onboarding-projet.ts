import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet } from '../../../../core/models/projet.model';

@Component({
  selector: 'app-onboarding-projet',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
      <div class="w-full max-w-lg rounded-[var(--radius-card-lg)] border border-line bg-surface p-8 shadow-[var(--shadow-card)]">
        
        <!-- Indicateur de progression (Étape 2 / 2) -->
        <div class="mb-6 flex items-center justify-between border-b border-line pb-4">
          <span class="text-xs font-semibold uppercase tracking-wider text-accent font-mono">Étape 2 sur 2</span>
          <span class="text-xs text-ink-muted">Configuration initiale</span>
        </div>

        <!-- En-tête -->
        <div class="flex flex-col gap-2">
          <div class="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-2xl text-accent-strong">
            🚀
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-ink mt-2">
            Quel est le nom de votre projet ?
          </h1>
          <p class="text-sm text-ink-muted leading-relaxed">
            Pour personnaliser votre espace d'accompagnement et démarrer vos premières missions, donnez un nom à votre startup ou entreprise.
          </p>
        </div>

        <!-- Formulaire -->
        <div class="mt-6 flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label for="nomProjet" class="text-xs font-semibold text-ink-muted uppercase">
              Nom de la startup / entreprise *
            </label>
            <input
              id="nomProjet"
              type="text"
              [(ngModel)]="nomProjet"
              placeholder="Ex: TerangaSkills, SolarSénégal..."
              class="rounded-[var(--radius-input)] border border-line bg-surface px-4 py-3 text-sm text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none transition-colors"
              (keyup.enter)="valider()"
            />
          </div>

          <div class="rounded-xl border border-line/60 bg-surface-muted/40 p-3.5 text-xs text-ink-muted flex items-start gap-2.5">
            <span class="text-base">💡</span>
            <p class="leading-relaxed">
              Pas encore fixé sur le nom final ? Pas d'inquiétude, vous pourrez le modifier à tout moment dans les paramètres de votre espace.
            </p>
          </div>
        </div>

        @if (errorMessage()) {
          <div class="mt-4 rounded-lg border border-danger-100 bg-danger-50 p-3 text-xs text-danger-600">
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

          <button
            type="button"
            (click)="valider()"
            [disabled]="!nomProjet().trim() || submitting()"
            class="rounded-[var(--radius-button)] bg-action-fill px-6 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer"
          >
            {{ submitting() ? 'Enregistrement…' : 'Accéder à mon espace' }}
          </button>
        </div>

      </div>
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

    // Récupération du projet "Mon Projet" généré lors de la validation d'invitation
    this.projetService
      .getPrincipalByEntrepreneur(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.projetId.set(p.id);
          // Si le nom a déjà été modifié par rapport au nom par défaut, on redirige directement
          if (p.nom !== 'Mon Projet') {
            this.router.navigate(['/entrepreneur/dashboard']);
          }
        },
        error: () => {
          // En cas d'erreur de chargement, laisser passer vers le dashboard
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
    // Conservation de "Mon Projet" et accès direct au dashboard
    this.router.navigate(['/entrepreneur/dashboard']);
  }
}