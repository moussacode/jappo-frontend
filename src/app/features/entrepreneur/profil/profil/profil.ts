import { Component, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, BadgeComponent, Icon],
  template: `
<div class="mx-auto flex w-full max-w-xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

  <h1 class="text-xl font-bold text-gray-900 dark:text-white">Mon profil</h1>

  <div class="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-6 space-y-4">

    <!-- Avatar -->
    <div class="flex items-center gap-4">
      <div class="w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-lg font-bold text-indigo-700 dark:text-indigo-300">
        {{ initiales() }}
      </div>
      <div>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ user()?.prenom }} {{ user()?.nom }}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ user()?.email }}</p>
      </div>
    </div>

    <!-- Formulaire -->
    <form [formGroup]="form" (ngSubmit)="enregistrer()" class="space-y-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
          <input formControlName="prenom" type="text"
            class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom</label>
          <input formControlName="nom" type="text"
            class="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      @if (erreur()) {
        <p class="text-sm text-red-600 dark:text-red-400">{{ erreur() }}</p>
      }
      @if (enregistre()) {
        <p class="text-sm text-green-600 dark:text-green-400">Profil mis à jour avec succès.</p>
      }

      <div class="flex justify-end">
        <app-button type="submit" variant="primary" [disabled]="form.invalid || form.pristine">
          Enregistrer
        </app-button>
      </div>
    </form>

  </div>
</div>
  `,
})
export class Profil {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly user = this.authService.currentUser;
  protected readonly enregistrement = signal(false);
  protected readonly enregistre = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    prenom: [this.user()?.prenom ?? '', Validators.required],
    nom: [this.user()?.nom ?? '', Validators.required],
  });

  protected initiales(): string {
    const u = this.user();
    if (!u) return 'U';
    const p = (u.prenom ?? '').trim();
    const n = (u.nom ?? '').trim();
    if (p && n) return (p[0] + n[0]).toUpperCase();
    if (n.length >= 2) return n.substring(0, 2).toUpperCase();
    return (u.email ?? 'U').substring(0, 2).toUpperCase();
  }

  protected enregistrer(): void {
    if (this.form.invalid || this.form.pristine) return;
    this.enregistrement.set(true);
    this.enregistre.set(false);
    this.erreur.set(null);

    const { prenom, nom } = this.form.getRawValue();
    this.authService.updateProfile(prenom, nom)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.enregistrement.set(false);
          this.enregistre.set(true);
          this.form.markAsPristine();
          setTimeout(() => this.enregistre.set(false), 3500);
        },
        error: (err) => {
          this.enregistrement.set(false);
          this.erreur.set(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        },
      });
  }
}
