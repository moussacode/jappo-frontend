import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../core/services/auth.service';
import { FormFieldComponent } from '../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../shared/components/input/input.component';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';

// ⚠️ N'oublie pas d'importer tes composants partagés ici
// import { CardComponent } from '../../../shared/components/card/card.component';
// import { FormFieldComponent } from '../../../shared/components/form-field/form-field.component';
// import { InputComponent } from '../../../shared/components/input/input.component';
// import { ButtonComponent } from '../../../shared/components/button/button.component';

interface InvitationInfo {
  nomUser: string;
  email: string;
  nomStructure: string;
  logoStructure?: string;
  compteExiste?: boolean; 
}

@Component({
  selector: 'app-accept-invitation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    FormFieldComponent,
    InputComponent,
    ButtonComponent,
    CardComponent
],
  template: `
    <div class="flex min-h-screen items-center justify-center bg-surface-subtle p-4">
      
      <!-- Remplacement par app-card -->
      <app-card padding="md" class="w-full max-w-[420px]">
        
        @if (loading()) {
          <div class="py-8 text-center">
            <p class="text-sm font-medium text-ink-muted">Vérification de votre lien d'invitation…</p>
          </div>
        } @else if (info(); as details) {
          <!-- En-tête -->
          <div class="text-center">
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent font-bold text-2xl border border-accent/20">
              {{ details.nomStructure.charAt(0) }}
            </div>
            <h1 class="mt-4 text-xl font-bold tracking-tight text-ink">
              Rejoindre {{ details.nomStructure }}
            </h1>
            <p class="mt-1.5 text-xs text-ink-muted">
              Bonjour <strong class="text-ink">{{ details.nomUser }}</strong> ({{ details.email }}), vous avez été invité(e) à rejoindre l'incubateur.
            </p>
          </div>

          <!-- Formulaire -->
          <form [formGroup]="form" (ngSubmit)="confirmer()" class="mt-6 flex flex-col gap-4">
            
            <!-- Case à cocher d'engagement/consentement -->
            <label class="flex items-start gap-3 rounded-xl border border-line p-3.5 cursor-pointer hover:bg-surface-muted/40 transition-colors">
              <input 
                type="checkbox" 
                formControlName="accepte" 
                class="mt-0.5 rounded border-line text-accent focus:ring-accent" 
              />
              <span class="text-xs text-ink leading-relaxed">
                J'accepte de rejoindre la structure <strong class="text-ink">{{ details.nomStructure }}</strong> sur JAPPO et d'accéder à mon espace.
              </span>
            </label>

            <!-- Saisie du mot de passe : UNIQUEMENT SI LE COMPTE N'EXISTE PAS ENCORE -->
            @if (!details.compteExiste) {
              <app-form-field
                label="Créez votre mot de passe *"
                inputId="nouveauMotDePasse"
                [error]="form.controls.nouveauMotDePasse.touched && form.controls.nouveauMotDePasse.invalid ? 'Le mot de passe doit contenir au moins 8 caractères.' : undefined"
              >
                <app-input
                  type="password"
                  id="nouveauMotDePasse"
                  formControlName="nouveauMotDePasse"
                  placeholder="8 caractères minimum"
                  [invalid]="form.controls.nouveauMotDePasse.touched && form.controls.nouveauMotDePasse.invalid"
                />
              </app-form-field>
            } @else {
              <!-- Note informative si le compte est déjà actif -->
              <div class="rounded-xl border border-accent/20 bg-accent-soft/30 p-3 text-xs text-ink-muted leading-relaxed">
                Vous possédez déjà un compte JAPPO. Votre mot de passe actuel restera inchangé.
              </div>
            }

            @if (errorMessage()) {
              <div class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-xs text-danger-600">
                {{ errorMessage() }}
              </div>
            }

            <!-- Remplacement par app-button -->
            <app-button
              type="submit"
              [fullWidth]="true"
              [disabled]="form.invalid || submitting()"
              class="mt-2"
            >
              {{ submitting() ? 'Validation de votre accès…' : 'Confirmer & accéder à mon espace' }}
            </app-button>
          </form>
        } @else {
          <!-- Token invalide ou expiré -->
          <div class="py-6 text-center">
            <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger-50 text-danger-500 font-bold mb-3">
              ✕
            </div>
            <h2 class="text-base font-semibold text-ink">Invitation introuvable</h2>
            <p class="mt-1 text-xs text-ink-muted">
              {{ errorMessage() || "Ce lien d'invitation est invalide, a été révoqué ou a déjà été utilisé." }}
            </p>
            <a 
              routerLink="/login" 
              class="mt-6 inline-block text-xs font-medium text-accent hover:underline"
            >
              Aller à la page de connexion
            </a>
          </div>
        }

      </app-card>
    </div>
  `,
})
export class AcceptInvitationComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  protected readonly info = signal<InvitationInfo | null>(null);
  protected readonly loading = signal(true);
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    accepte: [false, Validators.requiredTrue],
    nouveauMotDePasse: [''], 
  });

  ngOnInit(): void {
    if (!this.token) {
      this.errorMessage.set("Aucun token d'invitation fourni dans l'URL.");
      this.loading.set(false);
      return;
    }

    this.authService
      .getInvitationInfo(this.token)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.info.set(data);
          this.loading.set(false);

          if (!data.compteExiste) {
            this.form.controls.nouveauMotDePasse.setValidators([
              Validators.required,
              Validators.minLength(8),
            ]);
          } else {
            this.form.controls.nouveauMotDePasse.clearValidators();
          }
          this.form.controls.nouveauMotDePasse.updateValueAndValidity();
        },
        error: (err) => {
          this.errorMessage.set(
            err?.error?.message ?? "Lien d'invitation invalide ou expiré."
          );
          this.loading.set(false);
        },
      });
  }

  protected confirmer(): void {
    if (this.form.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const values = this.form.getRawValue();
    const passwordToSend = this.info()?.compteExiste ? undefined : values.nouveauMotDePasse;

    this.authService
      .accepterInvitation(this.token, passwordToSend)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.router.navigate(['/onboarding/projet']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMessage.set(
            err?.error?.message ?? "Une erreur est survenue lors de la validation."
          );
        },
      });
  }
}