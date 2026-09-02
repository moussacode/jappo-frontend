import {
  Component,
  inject,
  signal,
} from '@angular/core';

import { Router } from '@angular/router';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';

import { EtapeParcours } from '../../../../core/models';

import { ButtonComponent } from '../../../../shared/components/button/button.component';

interface ProfilDiagnostic {
  titre: string;
  description: string;
  etape: EtapeParcours;
}

@Component({
  selector: 'app-diagnostic',
  imports: [ButtonComponent],
  templateUrl: './diagnostic.html',
  styleUrl: './diagnostic.css',
})
export class Diagnostic {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);

  protected readonly profils: ProfilDiagnostic[] = [
    {
      titre: 'Je cherche encore une idée',
      description: "Je n'ai pas encore de projet précis en tête",
      etape: 'ideation',
    },
    {
      titre: "J'ai une idée, mais je ne sais pas comment commencer",
      description: "J'ai besoin d'un cadre pour structurer mes premiers pas",
      etape: 'ideation',
    },
    {
      titre: 'Je travaille déjà activement sur mon projet',
      description: "J'ai commencé à avancer et je veux structurer la suite",
      etape: 'etude_marche',
    },
    {
      titre: "J'ai un prototype ou un MVP",
      description: 'Mon produit existe déjà sous une forme testable',
      etape: 'prototype',
    },
  ];

  protected readonly selected =
    signal<ProfilDiagnostic | null>(this.profils[1]);

  protected select(profil: ProfilDiagnostic): void {
    this.selected.set(profil);
  }

  protected onContinue(): void {
    const profil = this.selected();
    const userId = this.authService.currentUser()?.id;

    if (!profil || !userId) return;

    this.submitting.set(true);

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .subscribe((projet) => {
        if (!projet) {
          this.submitting.set(false);
          return;
        }

        this.projetService
          .updateDiagnostic(projet.id, profil.etape)
          .subscribe({
            next: () => {
              this.router.navigate(['/bienvenue']);
            },
            error: () => {
              this.submitting.set(false);
            },
          });
      });
  }
}