import { Component, inject, signal, ChangeDetectionStrategy, ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { InscriptionIncubateurService } from '../../../../core/services/inscription-incubateur.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { TypeStructure } from '../../../../core/models';

type Etape = 1 | 2 | 3;

function motsDePasseIdentiquesValidator(control: AbstractControl): ValidationErrors | null {
  const mdp = control.get('motDePasse')?.value;
  const confirmation = control.get('confirmation')?.value;
  return mdp && confirmation && mdp !== confirmation ? { motsDePasseDifferents: true } : null;
}

@Component({
  selector: 'app-inscription-structure',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, Icon, ButtonComponent],
  template: `
    <div class="flex h-screen w-full overflow-hidden bg-surface-muted">
      
      <!-- BANNIÈRE GAUCHE : Image d'illustration + Témoignage / Branding -->
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

      <!-- CÔTÉ DROIT : Conteneur scrollable avec m-auto pour éviter tout overflow en hauteur -->
      <div class="flex h-full w-full flex-col overflow-y-auto p-4 sm:p-6 lg:w-1/2">
        <div class="m-auto w-full max-w-[400px] shrink-0 rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)] sm:p-7">
          <img src="/logo.png" alt="JAPPO" class="h-7 w-auto object-contain" />

          <!-- Indicateur de progression -->
          <div class="mt-4 mb-4 flex items-center gap-2">
            @for (e of [1, 2, 3]; track e) {
              <div
                class="h-1 flex-1 rounded-[var(--radius-pill)] transition-colors duration-300"
                [class]="e <= etape() ? 'bg-accent' : 'bg-line'"
              ></div>
            }
          </div>
          <p class="mb-4 text-[11px] font-semibold tracking-wider text-ink-muted">
            {{ etape() === 1 ? '01 COMPTE' : etape() === 2 ? '02 VÉRIFICATION' : '03 STRUCTURE' }}
          </p>

          @switch (etape()) {
            @case (1) {
              <div class="mb-4">
                <h1 class="text-lg font-semibold text-ink sm:text-xl">Créer un espace Incubateur</h1>
                <p class="mt-0.5 text-xs text-ink-muted">Centralisez la gestion de vos cohortes et porteurs de projets.</p>
              </div>

              <form [formGroup]="formCompte" (ngSubmit)="soumettreCompte()" class="flex flex-col gap-3">
                <!-- Prénom / Nom -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Prénom</label>
                    <input 
                      formControlName="prenom" 
                      placeholder="Moussa" 
                      class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Nom</label>
                    <input 
                      formControlName="nom" 
                      placeholder="Mchangama" 
                      class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                    />
                  </div>
                </div>

                <!-- Email -->
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-ink-muted">Adresse email</label>
                  <input 
                    type="email" 
                    formControlName="email" 
                    placeholder="contact@incubateur.com" 
                    class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                  />
                  @if (formCompte.get('email')?.touched && formCompte.get('email')?.errors?.['email']) {
                    <p class="text-[11px] text-danger-500">Email invalide</p>
                  }
                </div>

                <!-- Téléphone -->
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-ink-muted">Téléphone</label>
                  <input 
                    formControlName="telephone" 
                    placeholder="+221 77 000 00 00" 
                    class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                  />
                </div>

                <!-- Mot de passe & Confirmation (Grille pour gagner de la place) -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Mot de passe</label>
                    <input 
                      [type]="showPassword() ? 'text' : 'password'" 
                      formControlName="motDePasse" 
                      placeholder="••••••••" 
                      class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                    />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Confirmation</label>
                    <input 
                      type="password" 
                      formControlName="confirmation" 
                      placeholder="••••••••" 
                      class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none transition-colors" 
                    />
                  </div>
                </div>

                @if (formCompte.get('motDePasse')?.touched && formCompte.get('motDePasse')?.errors?.['minlength']) {
                  <p class="text-[11px] text-danger-500">8 caractères minimum</p>
                }
                @if (formCompte.errors?.['motsDePasseDifferents'] && formCompte.get('confirmation')?.touched) {
                  <p class="text-[11px] text-danger-500">Les mots de passe ne correspondent pas</p>
                }

                @if (erreur()) {
                  <div class="rounded-[var(--radius-input)] border border-danger-100 bg-danger-50 p-2.5 text-xs text-danger-600">{{ erreur() }}</div>
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

                <div class="relative my-1 flex items-center justify-center">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-line"></div>
                  </div>
                  <span class="relative bg-surface px-3 text-[11px] text-ink-muted">
                    Ou continuer avec
                  </span>
                </div>

                <!-- Social Login (Google) -->
                <button
                  type="button"
                  class="flex h-9 w-full items-center justify-center gap-2.5 rounded-[var(--radius-input)] border border-line bg-surface text-xs font-medium text-ink transition-colors hover:bg-surface-muted"
                >
                  <svg class="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  Continuer avec Google
                </button>
              </form>
            }

            @case (2) {
              <div class="mb-5">
  <h1 class="text-lg font-semibold text-ink sm:text-xl">Vérifiez votre adresse email</h1>
  <p class="mt-1 text-xs text-ink-muted leading-relaxed">
    Un code de vérification a été envoyé à <br>
    <span class="font-medium text-ink">{{ formCompte.get('email')?.value }}</span>
  </p>
</div>

              <div class="flex gap-2">
                @for (i of [0, 1, 2, 3, 4, 5]; track i) {
                  <input
                    #otpBox
                    type="text"
                    inputmode="numeric"
                    maxlength="1"
                    class="h-12 w-full rounded-[var(--radius-input)] border border-line text-center text-lg font-medium text-ink focus:border-accent focus:outline-none transition-colors"
                    (input)="onOtpInput($event, i)"
                    (keydown)="onOtpKeydown($event, i)"
                    (paste)="onOtpPaste($event)"
                  />
                }
              </div>

              @if (erreur()) {
                <p class="mt-3 text-xs text-danger-500">{{ erreur() }}</p>
              }

              <div class="mt-4">
  <app-button [fullWidth]="true" [disabled]="chargement()" (click)="verifierOtp()">
    {{ chargement() ? 'Vérification…' : 'Vérifier' }}
  </app-button>
</div>

              <button type="button" (click)="renvoyerOtp()" [disabled]="renvoiBloqueSecondes() > 0" class="mt-3 w-full text-center text-xs font-medium text-ink-muted hover:text-ink disabled:opacity-50 transition-colors">
                {{ renvoiBloqueSecondes() > 0 ? 'Renvoyer le code (' + renvoiBloqueSecondes() + 's)' : 'Renvoyer le code' }}
              </button>
            }

            @case (3) {
              <div class="mb-4">
                <h1 class="text-lg font-semibold text-ink sm:text-xl">Parle-nous de ta structure</h1>
                <p class="mt-0.5 text-xs text-ink-muted">Ces informations apparaîtront sur ton espace incubateur</p>
              </div>

              <form [formGroup]="formStructure" (ngSubmit)="soumettreStructure()" class="flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-ink-muted">Nom de la structure</label>
                  <input formControlName="nom" class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors" />
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-ink-muted">Type de structure</label>
                  <select formControlName="type" class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors bg-surface">
                    <option value="incubateur">Incubateur</option>
                    <option value="accelerateur">Accélérateur</option>
                    <option value="coworking">Coworking</option>
                    <option value="association">Association</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Pays</label>
                    <input formControlName="pays" class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors" />
                  </div>
                  <div class="flex flex-col gap-1">
                    <label class="text-xs font-medium text-ink-muted">Ville</label>
                    <input formControlName="ville" class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors" />
                  </div>
                </div>

                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-ink-muted">Description</label>
                  <textarea formControlName="description" rows="2" class="rounded-[var(--radius-input)] border border-line px-3.5 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors resize-none"></textarea>
                </div>

                @if (erreur()) {
                  <div class="rounded-[var(--radius-input)] border border-danger-100 bg-danger-50 p-2.5 text-xs text-danger-600">{{ erreur() }}</div>
                }

                <div class="mt-1">
                  <app-button type="submit" [fullWidth]="true" [disabled]="formStructure.invalid || chargement()">
                    {{ chargement() ? 'Création en cours…' : "Créer mon espace Incubateur" }}
                  </app-button>
                </div>
              </form>
            }
          }

          <p class="mt-4 text-center text-xs text-ink-muted">
            Déjà un compte ?
            <a routerLink="/connexion" class="font-semibold text-ink hover:underline">Se connecter</a>
          </p>
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
  protected readonly showPassword = signal(false);
  protected readonly renvoiBloqueSecondes = signal(0);
  private codeOtp = '';

  protected readonly formCompte = this.fb.nonNullable.group(
    {
      prenom: ['', Validators.required],
      nom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', Validators.required],
      motDePasse: ['', [Validators.required, Validators.minLength(8)]],
      confirmation: ['', Validators.required],
    },
    { validators: motsDePasseIdentiquesValidator },
  );

  protected readonly formStructure = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    type: ['incubateur' as TypeStructure, Validators.required],
    pays: ['Sénégal', Validators.required],
    ville: ['', Validators.required],
    description: [''],
  });

  ngAfterViewInit(): void {}

  protected soumettreCompte(): void {
    if (this.formCompte.invalid) return;
    this.erreur.set(null);
    this.chargement.set(true);

    const { prenom, nom, email, telephone, motDePasse } = this.formCompte.getRawValue();
    this.inscriptionService.registerAccount({ prenom, nom, email, telephone, motDePasse }).subscribe({
      next: () => {
        this.chargement.set(false);
        this.etape.set(2);
        this.demarrerCompteurRenvoi();
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Email déjà utilisé');
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
    const texte = event.clipboardData?.getData('text').replace(/[^0-9]/g, '').slice(0, 6) ?? '';
    const boxes = this.otpBoxes.toArray();
    texte.split('').forEach((chiffre, i) => {
      if (boxes[i]) boxes[i].nativeElement.value = chiffre;
    });
    boxes[Math.min(texte.length, 5)]?.nativeElement.focus();
  }

  protected verifierOtp(): void {
    const code = this.otpBoxes.map((b) => b.nativeElement.value).join('');
    if (code.length !== 6) {
      this.erreur.set('Merci de saisir les 6 chiffres');
      return;
    }

    this.erreur.set(null);
    this.chargement.set(true);
    this.inscriptionService.verifyOtp(code).subscribe({
      next: () => {
        this.chargement.set(false);
        this.etape.set(3);
      },
      error: (err) => {
        this.chargement.set(false);
        const messages: Record<string, string> = {
          code_incorrect: 'Code incorrect',
          code_expire: 'Code expiré, demande-en un nouveau',
          trop_de_tentatives: 'Trop de tentatives — demande un nouveau code',
        };
        this.erreur.set(messages[err.message] ?? 'Une erreur est survenue');
      },
    });
  }

  protected renvoyerOtp(): void {
    const email = this.formCompte.get('email')?.value;
    if (!email || this.renvoiBloqueSecondes() > 0) return;
    this.inscriptionService.sendOtp(email).subscribe(() => this.demarrerCompteurRenvoi());
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

  protected soumettreStructure(): void {
    if (this.formStructure.invalid) return;
    this.erreur.set(null);
    this.chargement.set(true);

    this.inscriptionService.completeRegistration(this.formStructure.getRawValue()).subscribe({
      next: () => {
        this.chargement.set(false);
        this.router.navigate(['/incubateur/dashboard']);
      },
      error: () => {
        this.chargement.set(false);
        this.erreur.set('Une erreur est survenue, réessaie.');
      },
    });
  }
}