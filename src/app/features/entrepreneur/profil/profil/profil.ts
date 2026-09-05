import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { AbonnementService } from '../../../../core/services/abonnement.service';
import { Abonnement } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-profil',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent, BadgeComponent, Icon],
  templateUrl: './profil.html',
  styleUrl: './profil.css',
})
export class Profil {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly abonnementService = inject(AbonnementService);

  protected readonly user = this.authService.currentUser;
  protected readonly abonnement = signal<Abonnement | undefined>(undefined);

  protected readonly enregistrement = signal(false);
  protected readonly enregistre = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nom: [this.user()?.nom ?? '', [Validators.required]],
  });

  constructor() {
    const userId = this.user()?.id ?? null;
    if (userId) {
      this.abonnementService.getById(userId).subscribe((a) => this.abonnement.set(a));
    }
  }

  protected userInitiales(): string {
    const u = this.user();
    if (!u) return 'U';
    if (u.nom) {
      const parts = u.nom.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return u.nom.substring(0, 2).toUpperCase();
    }
    return u.email ? u.email.substring(0, 2).toUpperCase() : 'U';
  }

  protected enregistrer(): void {
    const id = this.user()?.id;
    if (!id || this.form.invalid) return;

    this.enregistrement.set(true);
    this.enregistre.set(false);

    this.entrepreneurService.updateProfil(id, { nom: this.form.getRawValue().nom }).subscribe({
      next: () => {
        this.enregistrement.set(false);
        this.enregistre.set(true);
        this.form.markAsPristine();
        setTimeout(() => this.enregistre.set(false), 3500);
      },
      error: () => {
        this.enregistrement.set(false);
      },
    });
  }
}