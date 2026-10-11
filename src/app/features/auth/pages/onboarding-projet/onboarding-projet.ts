import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

@Component({
  selector: 'app-onboarding-projet',
  standalone: true,
  imports: [
    FormsModule,
    CardComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    TranslatePipe,
  ],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-muted/30 p-4">
      <app-card padding="lg" class="w-full max-w-lg shadow-sm">
        @if (loading()) {
          <p class="py-8 text-center text-sm text-ink-muted">
            {{ 'onboarding.projet.chargement' | translate }}
          </p>
        } @else if (loadError()) {
          <div class="flex flex-col gap-5 text-center">
            <div>
              <h1 class="text-xl font-bold tracking-tight text-ink">
                {{ 'onboarding.projet.erreurChargementTitre' | translate }}
              </h1>
              <p class="mt-2 text-sm text-ink-muted">
                {{ loadError() || ('onboarding.projet.erreurChargement' | translate) }}
              </p>
            </div>
            <div class="flex flex-wrap justify-center gap-3">
              <app-button type="button" variant="ghost" size="sm" (click)="chargerProjet()">
                {{ 'onboarding.projet.reessayer' | translate }}
              </app-button>
              <app-button type="button" size="sm" (click)="skip()">
                {{ 'onboarding.projet.garderParDefaut' | translate }}
              </app-button>
            </div>
          </div>
        } @else {
          <div class="mb-6 flex items-center justify-between border-b border-line pb-4">
            <span class="text-xs font-semibold uppercase tracking-wider text-accent font-mono">
              {{ 'onboarding.projet.etape' | translate }}
            </span>
            <span class="text-xs text-ink-muted">
              {{ 'onboarding.projet.configuration' | translate }}
            </span>
          </div>

          <div class="flex flex-col gap-2">
            <h1 class="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl">
              {{ 'onboarding.projet.titre' | translate }}
            </h1>
            <p class="text-xs leading-relaxed text-ink-muted sm:text-sm">
              {{ 'onboarding.projet.description' | translate }}
            </p>
          </div>

          <div class="mt-6 flex flex-col gap-5">
            <app-form-field [label]="'onboarding.projet.nomLabel' | translate">
              <app-input
                [(ngModel)]="nomProjet"
                [placeholder]="'onboarding.projet.nomPlaceholder' | translate"
                (keyup.enter)="valider()"
              />
            </app-form-field>

            <p class="rounded-xl border border-line bg-surface-muted/40 p-3.5 text-xs leading-relaxed text-ink-muted">
              {{ 'onboarding.projet.projetParDefautInfo' | translate }}
            </p>
          </div>

          @if (errorMessage()) {
            <div class="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 dark:text-rose-400">
              {{ errorMessage() }}
            </div>
          }

          <div class="mt-8 flex justify-end border-t border-line pt-5">
            <app-button
              type="button"
              size="sm"
              [disabled]="!projetId() || submitting()"
              (click)="valider()"
            >
              @if (submitting()) {
                {{ 'onboarding.projet.enregistrement' | translate }}
              } @else if (nomProjet().trim()) {
                {{ 'onboarding.projet.personnaliser' | translate }}
              } @else {
                {{ 'onboarding.projet.garderParDefaut' | translate }}
              }
            </app-button>
          </div>
        }
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
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.chargerProjet();
  }

  protected chargerProjet(): void {
    const user = this.authService.currentUser();
    if (!user) {
      this.router.navigate(['/connexion']);
      return;
    }

    this.loading.set(true);
    this.loadError.set(null);
    this.projetService
      .getPrincipalByEntrepreneur(user.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projet) => {
          this.projetId.set(projet.id);
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(err?.error?.message ?? '');
          this.loading.set(false);
        },
      });
  }

  protected valider(): void {
    const id = this.projetId();
    const nouveauNom = this.nomProjet().trim();

    if (!nouveauNom) {
      this.skip();
      return;
    }
    if (!id || this.submitting()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.projetService
      .updateNomProjet(id, nouveauNom)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.router.navigate(['/entrepreneur/dashboard']),
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
