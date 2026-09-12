import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Icon } from "../../../../shared/components/icon/icon";
import { CardComponent } from "../../../../shared/components/card/card.component";
import { FormFieldComponent } from "../../../../shared/components/input/form-field.component";
import { ButtonComponent } from "../../../../shared/components/button/button.component";
import { InputComponent } from "../../../../shared/components/input/input.component"; // <-- AJOUTER CET IMPORT
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icon,
    CardComponent,
    FormFieldComponent,
    ButtonComponent,
    InputComponent
],
  template: `
    <div class="min-h-screen flex items-center justify-center p-4 bg-surface-muted/30">
      <div class="w-full max-w-md flex flex-col gap-6">
        
        <!-- En-tête / Logo optionnel -->
        <div class="flex flex-col items-center text-center gap-2">
          <div class="flex size-12 items-center justify-center rounded-2xl bg-accent text-white shadow-md">
            <!-- <app-icon name="key" class="size-6" /> -->
          </div>
          <h1 class="text-xl font-extrabold tracking-tight text-ink">Mot de passe oublié</h1>
          <p class="text-xs text-ink-muted">
            @if (step() === 1) {
              Entrez votre adresse email pour recevoir un code de réinitialisation.
            } @else {
              Entrez le code reçu par email et définissez votre nouveau mot de passe.
            }
          </p>
        </div>

        <app-card class="p-6 sm:p-8 shadow-sm">
          
          @if (step() === 1) {
            <!-- ÉTAPE 1 : DEMANDE D'EMAIL -->
            <form [formGroup]="emailForm" (ngSubmit)="onSendCode()" class="flex flex-col gap-5">
              
              <app-form-field
                label="Adresse email"
                [required]="true"
                [error]="getEmailError()"
              >
                <app-input
                  type="email"
                  formControlName="email"
                  placeholder="nom@exemple.com"
                  [invalid]="isEmailInvalid()"
                />
              </app-form-field>

              @if (errorMessage()) {
                <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600">
                  {{ errorMessage() }}
                </div>
              }

              @if (successMessage()) {
                <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600">
                  {{ successMessage() }}
                </div>
              }

              <app-button type="submit" size="md" class="w-full" [disabled]="isSubmitting()">
                @if (isSubmitting()) {
                  <span>Envoi en cours...</span>
                } @else {
                  <span>Envoyer le code de réinitialisation</span>
                }
              </app-button>
            </form>

          } @else {

            <!-- ÉTAPE 2 : SAISIE DU CODE & NOUVEAU MOT DE PASSE -->
            <form [formGroup]="resetForm" (ngSubmit)="onResetPassword()" class="flex flex-col gap-5">
              
              <app-form-field
                label="Code de vérification"
                [required]="true"
                [error]="getResetFieldError('code')"
              >
                <app-input
                  formControlName="code"
                  placeholder="Ex: 123456"
                  [invalid]="isResetFieldInvalid('code')"
                />
              </app-form-field>

              <app-form-field
                label="Nouveau mot de passe"
                [required]="true"
                [error]="getResetFieldError('nouveauMotDePasse')"
              >
                <app-input
                  type="password"
                  formControlName="nouveauMotDePasse"
                  placeholder="••••••••"
                  [invalid]="isResetFieldInvalid('nouveauMotDePasse')"
                />
              </app-form-field>

              @if (errorMessage()) {
                <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600">
                  {{ errorMessage() }}
                </div>
              }

              @if (successMessage()) {
                <div class="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600">
                  {{ successMessage() }}
                </div>
              }

              <app-button type="submit" size="md" class="w-full" [disabled]="isSubmitting()">
                @if (isSubmitting()) {
                  <span>Réinitialisation...</span>
                } @else {
                  <span>Modifier mon mot de passe</span>
                }
              </app-button>
            </form>
          }

        </app-card>

        <!-- Lien de retour vers la connexion -->
        <div class="text-center">
          <a routerLink="/login" class="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline">
            <app-icon name="arrow-left" class="size-3.5" />
            <span>Retour à la connexion</span>
          </a>
        </div>

      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // État du composant (1 = Saisie email, 2 = Saisie code + nouveau mdp)
  protected readonly step = signal<1 | 2>(1);
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  // Formulaire Étape 1
  protected readonly emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  // Formulaire Étape 2
  protected readonly resetForm = this.fb.nonNullable.group({
    code: ['', [Validators.required]],
    nouveauMotDePasse: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected isEmailInvalid(): boolean {
    const ctrl = this.emailForm.get('email');
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  protected getEmailError(): string | undefined {
    const ctrl = this.emailForm.get('email');
    if (!ctrl || !ctrl.touched || !ctrl.errors) return undefined;
    if (ctrl.errors['required']) return "L'email est obligatoire.";
    if (ctrl.errors['email']) return "Format d'email invalide.";
    return undefined;
  }

  protected isResetFieldInvalid(fieldName: string): boolean {
    const ctrl = this.resetForm.get(fieldName);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  protected getResetFieldError(fieldName: string): string | undefined {
    const ctrl = this.resetForm.get(fieldName);
    if (!ctrl || !ctrl.touched || !ctrl.errors) return undefined;
    if (ctrl.errors['required']) return 'Ce champ est obligatoire.';
    if (ctrl.errors['minlength']) return `Minimum ${ctrl.errors['minlength'].requiredLength} caractères.`;
    return undefined;
  }

  // ÉTAPE 1 : Envoi de la demande de réinitialisation
  protected onSendCode(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.emailForm.getRawValue().email;

    this.http.post(`${environment.apiUrl}/auth/forgot-password`, { email }, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set("Un code a été envoyé à votre adresse email.");
          // Passage automatique à l'étape 2 après un court instant ou directement
          setTimeout(() => {
            this.step.set(2);
            this.successMessage.set(null);
          }, 1500);
        },
        error: (err) => {
          console.error('Erreur forgot-password:', err);
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || "Une erreur est survenue.");
        }
      });
  }

  // ÉTAPE 2 : Validation du code et changement de mot de passe
  protected onResetPassword(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.emailForm.getRawValue().email;
    const { code, nouveauMotDePasse } = this.resetForm.getRawValue();

    const requestBody = { email, code, nouveauMotDePasse };

    this.http.post(`${environment.apiUrl}/auth/reset-password`, requestBody, { responseType: 'text' })
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.successMessage.set("Mot de passe réinitialisé avec succès ! Redirection...");
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        },
        error: (err) => {
          console.error('Erreur reset-password:', err);
          this.isSubmitting.set(false);
          this.errorMessage.set(err.error?.message || "Code invalide ou expiré.");
        }
      });
  }
}