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
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

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
    TranslatePipe
  ],
  templateUrl:"inscription-structure.html",
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