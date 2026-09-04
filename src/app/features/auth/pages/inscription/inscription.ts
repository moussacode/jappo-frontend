
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from "../../../../shared/components/icon/icon";

@Component({
  selector: 'app-inscription',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, Icon],
   templateUrl: './inscription.html',
  styleUrl: './inscription.css',
 
})
export class Inscription {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    const { nom, email, motDePasse } = this.form.getRawValue();
    this.authService.register(nom, email, motDePasse).subscribe({
      next: () => this.router.navigate(['/diagnostic']),
      error: () => {
        this.errorMessage.set('Une erreur est survenue, réessaie.');
        this.submitting.set(false);
      },
    });
  }

    showPassword = signal(false);

togglePasswordVisibility(): void {
  this.showPassword.update((v) => !v);
}
}
