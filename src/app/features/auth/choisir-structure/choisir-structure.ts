import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

// Services
import { AuthService, StructureMembership } from '../../../core/services/auth.service';
import { StructureContextService } from '../../../core/services/structure-context.service';
import { InscriptionIncubateurService } from '../../../core/services/inscription-incubateur.service';

// Design System Partagé
import { Icon } from '../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { CardComponent } from '../../../shared/components/card/card.component';
import { FormFieldComponent } from '../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../shared/components/input/input.component';

@Component({
  selector: 'app-choisir-structure',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Icon,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    FormFieldComponent,
    InputComponent,
  ],
  templateUrl: './choisir-structure.html',
  styleUrl: './choisir-structure.css',
})
export class ChoisirStructure implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly structureContext = inject(StructureContextService);
  private readonly inscriptionService = inject(InscriptionIncubateurService);
  private readonly fb = inject(FormBuilder);

  protected readonly memberships = this.authService.memberships;
  protected readonly chargement = signal(false);
  protected readonly erreur = signal<string | null>(null);
  protected readonly affichageFormulaire = signal(false);

  protected readonly structureForm = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    type: ['incubateur'],
    pays: ['Sénégal', Validators.required],
    ville: ['Dakar', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    // Si la liste des memberships est vide, recharger les structures du compte
    if (this.memberships().length === 0) {
      this.authService.getMyStructures().subscribe({
        next: (list) => {
          if (list.length === 0) {
            this.affichageFormulaire.set(true);
          }
        },
        error: () => this.affichageFormulaire.set(true),
      });
    }
  }

  // Getters d'erreurs pour un template HTML propre
  protected get nomError(): string | undefined {
    const ctrl = this.structureForm.controls.nom;
    return ctrl.touched && ctrl.invalid ? 'Le nom est obligatoire' : undefined;
  }

  protected get paysError(): string | undefined {
    const ctrl = this.structureForm.controls.pays;
    return ctrl.touched && ctrl.invalid ? 'Le pays est obligatoire' : undefined;
  }

  protected get villeError(): string | undefined {
    const ctrl = this.structureForm.controls.ville;
    return ctrl.touched && ctrl.invalid ? 'La ville est obligatoire' : undefined;
  }

  protected choisirStructure(membership: StructureMembership): void {
    this.structureContext.setActiveStructure(membership);

    switch (membership.role) {
      case 'ADMIN_STRUCTURE':
        this.router.navigate(['/incubateur']);
        break;

      case 'COACH':
        this.router.navigate(['/coach']);
        break;

      case 'ENTREPRENEUR':
        this.router.navigate(['/entrepreneur/dashboard']);
        break;

      default:
        console.error('Rôle non reconnu:', membership.role);
    }
  }

  protected creerStructure(): void {
    if (this.structureForm.invalid) {
      this.structureForm.markAllAsTouched();
      return;
    }

    this.erreur.set(null);
    this.chargement.set(true);

    this.inscriptionService
      .completeRegistration(this.structureForm.getRawValue())
      .subscribe({
        next: () => {
          this.authService.getMyStructures().subscribe({
            next: (list) => {
              this.chargement.set(false);
              if (list.length > 0) {
                this.choisirStructure(list[list.length - 1]);
              }
            },
            error: () => {
              this.chargement.set(false);
              this.router.navigate(['/incubateur/dashboard']);
            },
          });
        },
        error: (err) => {
          this.chargement.set(false);
          this.erreur.set(
            err.error?.message || 'Erreur lors de la création de la structure.'
          );
        },
      });
  }

  protected basculerModeFormulaire(valeur: boolean): void {
    this.affichageFormulaire.set(valeur);
  }

  protected retourConnexion(): void {
    this.authService.logout();
    this.router.navigate(['/connexion']);
  }
}