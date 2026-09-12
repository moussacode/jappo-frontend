import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
  ViewChildren,
  QueryList,
  ElementRef,
  AfterViewInit,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

// Services
import { InscriptionIncubateurService } from '../../../../core/services/inscription-incubateur.service';

// Composants du Design System Partagé
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { Icon } from '../../../../shared/components/icon/icon';

type Etape = 1 | 2;

function motsDePasseIdentiquesValidator(
  control: AbstractControl
): ValidationErrors | null {
  const mdp = control.get('motDePasse')?.value;
  const confirmation = control.get('confirmation')?.value;
  return mdp && confirmation && mdp !== confirmation
    ? { motsDePasseDifferents: true }
    : null;
}

@Component({
  selector: 'app-inscription-structure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Icon,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    InputComponent,
  ],
  template: `
    <div class="flex h-screen w-full overflow-hidden bg-surface-muted">
      
      <!-- BANNIÈRE GAUCHE : Illustration & Branding -->
      <div class="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-surface-dark p-8 text-white lg:flex">
        <img
          src="/connexion.jpg"
          alt="Background Illustration"
          class="absolute inset-0 h-full w-full object-cover opacity-95"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/40"></div>

        <div class="relative z-10 flex items-center gap-2">
          <img src="/logo.png" alt="JAPPO" class="h-7 w-auto" />
        </div>

        <div class="relative z-10 text-xs text-white/50">
          © 2026 JAPPO Inc. | Tous droits réservés
        </div>
      </div>

      <!-- CÔTÉ DROIT : Formulaire d'inscription -->
      <div class="flex h-full w-full flex-col overflow-y-auto p-4 sm:p-6 lg:w-1/2">
        <div class="m-auto w-full max-w-[420px] shrink-0">
          
          <app-card padding="md" class="w-full">
            <img src="/logo.png" alt="JAPPO" class="h-7 w-auto object-contain" />

            <!-- Indicateur de progression (2 étapes) -->
            <div class="mt-4 mb-3 flex items-center gap-2">
              @for (e of [1, 2]; track e) {
                <div
                  class="h-1 flex-1 rounded-full transition-colors duration-300"
                  [class]="e <= etape() ? 'bg-accent' : 'bg-line'"
                ></div>
              }
            </div>
            
            <p class="mb-4 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
              {{ etape() === 1 ? '01 COMPTE' : '02 VÉRIFICATION' }}
            </p>

            @switch (etape()) {
              @case (1) {
                <div class="mb-4">
                  <h1 class="text-lg font-semibold text-ink sm:text-xl">Créer un espace Incubateur</h1>
                  <p class="mt-0.5 text-xs text-ink-muted">Centralisez la gestion de vos cohortes et porteurs de projets.</p>
                </div>

                <form [formGroup]="formCompte" (ngSubmit)="soumettreCompte()" class="flex flex-col gap-3">
                  
                  <!-- Prénom & Nom -->
                  <div class="grid grid-cols-2 gap-3">
                    <app-form-field
                      label="Prénom"
                      inputId="prenom"
                      [error]="formCompte.controls.prenom.touched && formCompte.controls.prenom.invalid ? 'Obligatoire' : undefined"
                    >
                      <app-input
                        id="prenom"
                        formControlName="prenom"
                        placeholder="Moussa"
                        [invalid]="formCompte.controls.prenom.touched && formCompte.controls.prenom.invalid"
                      />
                    </app-form-field>

                    <app-form-field
                      label="Nom"
                      inputId="nom"
                      [error]="formCompte.controls.nom.touched && formCompte.controls.nom.invalid ? 'Obligatoire' : undefined"
                    >
                      <app-input
                        id="nom"
                        formControlName="nom"
                        placeholder="Mchangama"
                        [invalid]="formCompte.controls.nom.touched && formCompte.controls.nom.invalid"
                      />
                    </app-form-field>
                  </div>

                  <!-- Email -->
                <app-form-field
  label="Adresse email"
  inputId="email"
  [error]="emailError"
>
  <app-input
    id="email"
    type="email"
    formControlName="email"
    placeholder="contact@incubateur.com"
    [invalid]="formCompte.controls.email.touched && formCompte.controls.email.invalid"
  />
</app-form-field>

                  <!-- Téléphone -->
                  <app-form-field
                    label="Téléphone"
                    inputId="telephone"
                    [error]="formCompte.controls.telephone.touched && formCompte.controls.telephone.invalid ? 'Téléphone obligatoire' : undefined"
                  >
                    <app-input
                      id="telephone"
                      type="tel"
                      formControlName="telephone"
                      placeholder="+221 77 000 00 00"
                      [invalid]="formCompte.controls.telephone.touched && formCompte.controls.telephone.invalid"
                    />
                  </app-form-field>

                  <!-- Mot de passe & Confirmation -->
                  <div class="grid grid-cols-2 gap-3">
                    <app-form-field label="Mot de passe" inputId="motDePasse">
                      <app-input
                        id="motDePasse"
                        type="password"
                        formControlName="motDePasse"
                        placeholder="••••••••"
                        [invalid]="formCompte.controls.motDePasse.touched && formCompte.controls.motDePasse.invalid"
                      />
                    </app-form-field>

                    <app-form-field label="Confirmation" inputId="confirmation">
                      <app-input
                        id="confirmation"
                        type="password"
                        formControlName="confirmation"
                        placeholder="••••••••"
                        [invalid]="(formCompte.controls.confirmation.touched && formCompte.controls.confirmation.invalid) || (formCompte.errors?.['motsDePasseDifferents'] && formCompte.controls.confirmation.touched)"
                      />
                    </app-form-field>
                  </div>

                  <!-- Messages d'erreur de validation globale -->
                  @if (formCompte.controls.motDePasse.touched && formCompte.controls.motDePasse.errors?.['minlength']) {
                    <p class="text-[11px] font-medium text-rose-600">8 caractères minimum requis</p>
                  }
                  @if (formCompte.errors?.['motsDePasseDifferents'] && formCompte.controls.confirmation.touched) {
                    <p class="text-[11px] font-medium text-rose-600">Les mots de passe ne correspondent pas</p>
                  }

                  <!-- Banner Erreur API -->
                  @if (erreur()) {
                    <div class="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs text-rose-600">
                      {{ erreur() }}
                    </div>
                  }

                  <div class="mt-1">
                    <app-button
                      type="submit"
                      [fullWidth]="true"
                      [disabled]="formCompte.invalid || chargement()"
                    >
                      {{ chargement() ? 'Envoi du code…' : 'Continuer' }}
                    </app-button>
                  </div>
                </form>
              }

              @case (2) {
                <div class="mb-5">
                  <h1 class="text-lg font-semibold text-ink sm:text-xl">Vérifiez votre adresse email</h1>
                  <p class="mt-1 text-xs text-ink-muted leading-relaxed">
                    Un code de vérification a été envoyé à <br />
                    <span class="font-semibold text-ink">{{ formCompte.controls.email.value }}</span>
                  </p>
                </div>

                <!-- OTP 6 chiffres -->
                <div class="flex gap-2">
                  @for (i of [0, 1, 2, 3, 4, 5]; track i) {
                    <input
                      #otpBox
                      type="text"
                      inputmode="numeric"
                      maxlength="1"
                      class="h-11 w-full rounded-xl border border-line bg-surface text-center text-lg font-bold text-ink focus:border-accent focus:outline-none transition-colors"
                      (input)="onOtpInput($event, i)"
                      (keydown)="onOtpKeydown($event, i)"
                      (paste)="onOtpPaste($event)"
                    />
                  }
                </div>

                @if (erreur()) {
                  <p class="mt-3 text-xs font-medium text-rose-600">{{ erreur() }}</p>
                }

                <div class="mt-5">
                  <app-button
                    [fullWidth]="true"
                    [disabled]="chargement()"
                    (click)="verifierOtp()"
                  >
                    {{ chargement() ? 'Vérification…' : 'Vérifier et continuer' }}
                  </app-button>
                </div>

                <button
                  type="button"
                  (click)="renvoyerOtp()"
                  [disabled]="renvoiBloqueSecondes() > 0"
                  class="mt-3 w-full text-center text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {{ renvoiBloqueSecondes() > 0 ? 'Renvoyer le code (' + renvoiBloqueSecondes() + 's)' : 'Renvoyer le code' }}
                </button>
              }
            }

            <p class="mt-5 text-center text-xs text-ink-muted">
              Déjà un compte ?
              <a routerLink="/connexion" class="font-semibold text-ink hover:underline">Se connecter</a>
            </p>
          </app-card>

        </div>
      </div>
    </div>
  `,
})
export class InscriptionStructure implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly inscriptionService = inject(InscriptionIncubateurService);
  private readonly router = inject(Router);

  @ViewChildren('otpBox') otpBoxes!: QueryList<ElementRef<HTMLInputElement>>;

  protected readonly etape = signal<Etape>(1);
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly renvoiBloqueSecondes = signal(0);

  protected readonly formCompte = this.fb.nonNullable.group(
    {
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiquesValidator }
  );

  ngAfterViewInit(): void {}

  protected soumettreCompte(): void {
    if (this.formCompte.invalid) {
      this.formCompte.markAllAsTouched();
      return;
    }
    this.erreur.set(null);
    this.chargement.set(true);

    const { prenom, nom, email, telephone, motDePasse } =
      this.formCompte.getRawValue();

    this.inscriptionService
      .registerAccount({
        prenom,
        nom,
        email,
        telephone,
        password: motDePasse,
      })
      .subscribe({
        next: () => {
          this.chargement.set(false);
          this.etape.set(2);
          this.demarrerCompteurRenvoi();
        },
        error: (err) => {
          this.chargement.set(false);
          this.erreur.set(
            err.error?.message || 'Adresse email déjà utilisée'
          );
        },
      });
  }

  protected onOtpInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 1);
    if (input.value && index < 5) {
      this.otpBoxes.get(index + 1)?.nativeElement.focus();
    }
  }

  protected onOtpKeydown(event: KeyboardEvent, index: number): void {
    const input = event.target as HTMLInputElement;
    if (event.key === 'Backspace' && !input.value && index > 0) {
      this.otpBoxes.get(index - 1)?.nativeElement.focus();
    }
  }

  protected onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const texte =
      event.clipboardData
        ?.getData('text')
        .replace(/[^0-9]/g, '')
        .slice(0, 6) ?? '';
    const boxes = this.otpBoxes.toArray();
    texte.split('').forEach((chiffre, i) => {
      if (boxes[i]) boxes[i].nativeElement.value = chiffre;
    });
    boxes[Math.min(texte.length, 5)]?.nativeElement.focus();
  }

  protected verifierOtp(): void {
    const code = this.otpBoxes.map((b) => b.nativeElement.value).join('');
    if (code.length !== 6) {
      this.erreur.set('Merci de saisir les 6 chiffres du code');
      return;
    }

    this.erreur.set(null);
    this.chargement.set(true);

    this.inscriptionService.verifyOtp(code).subscribe({
      next: () => {
        this.chargement.set(false);
        this.router.navigate(['/choisir-structure']);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Code incorrect ou expiré');
      },
    });
  }

  protected renvoyerOtp(): void {
    const email = this.formCompte.controls.email.value;
    if (!email || this.renvoiBloqueSecondes() > 0) return;
    this.inscriptionService
      .sendOtp(email)
      .subscribe(() => this.demarrerCompteurRenvoi());
  }

  private demarrerCompteurRenvoi(): void {
    this.renvoiBloqueSecondes.set(30);
    const intervalle = setInterval(() => {
      this.renvoiBloqueSecondes.update((s) => {
        if (s <= 1) clearInterval(intervalle);
        return s - 1;
      });
    }, 1000);
  }


  protected get emailError(): string | undefined {
    const ctrl = this.formCompte.controls.email;
    if (!ctrl.touched || !ctrl.errors) return undefined;
    if (ctrl.errors['required']) return 'Email obligatoire';
    if (ctrl.errors['email']) return "Format d'email invalide";
    return undefined;
  }

  protected get passwordConfirmationError(): string | undefined {
    const confirmCtrl = this.formCompte.controls.confirmation;
    if (this.formCompte.errors?.['motsDePasseDifferents'] && confirmCtrl.touched) {
      return 'Les mots de passe ne correspondent pas';
    }
    return undefined;
  }
}