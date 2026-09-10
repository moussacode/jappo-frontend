import { Component, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, Icon],
  templateUrl: './connexion.html',
  styleUrl: './connexion.css',
})
export class Connexion {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly structureContext = inject(StructureContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    motDePasse: ['', [Validators.required]],
  });

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    const { email, motDePasse } = this.form.getRawValue();

    // Mapping exact vers 'password' pour Spring Boot (LoginRequest)
    this.authService
      .login({ email, password: motDePasse })
      .pipe(
        switchMap(() => this.authService.getMyStructures()),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (memberships) => {
          this.submitting.set(false);

          // 1. Aucune structure
          if (!memberships || memberships.length === 0) {
            this.router.navigate(['/choisir-structure']);
            return;
          }

          // 2. Une seule structure
          if (memberships.length === 1) {
            const membership = memberships[0];
            this.structureContext.setActiveStructure(membership);

            switch (membership.role) {
              case 'ADMIN_STRUCTURE':
                this.router.navigate(['/incubateur/dashboard']);
                break;
              case 'COACH':
                this.router.navigate(['/coach']);
                break;
              case 'ENTREPRENEUR':
                this.router.navigate(['/entrepreneur/dashboard']);
                break;
              default:
                this.errorMessage.set('Rôle utilisateur non reconnu.');
            }
            return;
          }

          // 3. Plusieurs structures
          this.router.navigate(['/choisir-structure']);
        },
        error: (error) => {
          console.error('Erreur de connexion:', error);
          this.submitting.set(false);
          this.errorMessage.set(
            error?.error?.message ?? 'Email ou mot de passe incorrect.'
          );
        },
      });
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((v) => !v);
  }
}