
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-connexion',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
   templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, motDePasse } = this.form.getRawValue();
    this.authService.login({ email, motDePasse }).subscribe({
      next: () => this.router.navigate(['/entrepreneur/dashboard']),
      error: () => {
        this.errorMessage.set('Email ou mot de passe incorrect.');
        this.submitting.set(false);
      },
    });
  }
}
