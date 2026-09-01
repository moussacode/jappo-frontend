
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { AbonnementService } from '../../../../core/services/abonnement.service';
import { Abonnement } from '../../../../core/models';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-profil',
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent  ],
 
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
    nom: [this.user()?.nom ?? ''],
  });

  constructor() {
    this.abonnementService.getById(this.user()?.abonnementId ?? null).subscribe((a) => this.abonnement.set(a));
  }

  protected enregistrer(): void {
    const id = this.user()?.id;
    if (!id || this.form.invalid) return;

    this.enregistrement.set(true);
    this.enregistre.set(false);
    this.entrepreneurService.updateProfil(id, { nom: this.form.getRawValue().nom }).subscribe(() => {
      this.enregistrement.set(false);
      this.enregistre.set(true);
    });
  }
}
