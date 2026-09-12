import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { CreateCohorteRequest } from '../../../../core/models/cohorte.model';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';

@Component({
  selector: 'app-nouvelle-cohorte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
  ],
  template: `
    <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête de la Page avec Bouton Retour Aligné -->
      <div class="flex flex-col gap-3">
        <div>
          <a
            routerLink="/incubateur/cohortes"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-ink cursor-pointer"
          >
            <app-icon name="arrow-left" class="size-3.5" />
            <span>Retour aux cohortes</span>
          </a>
        </div>

        <app-page-header
          title="Nouvelle cohorte"
          subtitle="Créez un groupe pour suivre et structurer le parcours de plusieurs entrepreneurs."
        />
      </div>

      <!-- Formulaire de Création dans une Carte Design System -->
      <app-card padding="lg" class="max-w-xl">
        <form [formGroup]="form" (ngSubmit)="creer()" class="flex flex-col gap-5">
          
          <!-- Nom de la Cohorte -->
          <app-form-field
            label="Nom de la cohorte"
            [required]="true"
            [error]="getFieldError('nom')"
          >
            <app-input
              formControlName="nom"
              placeholder="Ex. Cohorte 5 - Santé numérique"
              [invalid]="isFieldInvalid('nom')"
            />
          </app-form-field>

          <!-- Secteur / Description -->
          <app-form-field
            label="Secteur / Description"
            [required]="true"
            [error]="getFieldError('secteur')"
          >
            <app-input
              formControlName="secteur"
              placeholder="Ex. FinTech, Agrotech, Santé numérique..."
              [invalid]="isFieldInvalid('secteur')"
            />
          </app-form-field>

          <!-- Date de Démarrage -->
          <app-form-field
            label="Date de démarrage"
            [required]="true"
            [error]="getFieldError('dateDemarrage')"
          >
            <app-input
              type="date"
              formControlName="dateDemarrage"
              [invalid]="isFieldInvalid('dateDemarrage')"
            />
          </app-form-field>

          <!-- Actions du Formulaire -->
          <div class="flex items-center justify-end gap-3 pt-4 border-t border-line">
            <!-- Bouton Annuler Neutre (Ghost / Outlined) -->
            <a routerLink="/incubateur/cohortes">
              <app-button type="button" variant="ghost" size="sm">
                Annuler
              </app-button>
            </a>

            <!-- Bouton Valider (Accent / Action) -->
            <app-button
              type="submit"
              size="sm"
              [disabled]="form.invalid || creation()"
            >
              @if (creation()) {
                <span>Création...</span>
              } @else {
                <app-icon name="plus" class="size-4" />
                <span>Créer la cohorte</span>
              }
            </app-button>
          </div>

        </form>
      </app-card>

    </div>
  `,
})
export class NouvelleCohorte {
  private readonly fb = inject(FormBuilder);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureContext = inject(StructureContextService);
  private readonly router = inject(Router);

  protected readonly creation = signal<boolean>(false);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(3)]],
    secteur: ['', [Validators.required]],
    dateDemarrage: ['', [Validators.required]],
  });

  protected isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.form.get(fieldName);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  protected getFieldError(fieldName: string): string | undefined {
    const control = this.form.get(fieldName);
    if (!control || !control.touched || !control.errors) return undefined;

    if (control.errors['required']) return 'Ce champ est obligatoire.';
    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} caractères requis.`;
    }

    return 'Champ invalide.';
  }

  protected creer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.structureContext.activeRole() !== 'ADMIN_STRUCTURE') {
      alert('Seul un administrateur de structure peut créer une cohorte.');
      return;
    }

    this.creation.set(true);

    const { nom, secteur, dateDemarrage } = this.form.getRawValue();

    const requestPayload: CreateCohorteRequest = {
      nom,
      description: secteur,
      dateDebut: dateDemarrage,
    };

    this.cohorteService.createCohorte(requestPayload).subscribe({
      next: () => {
        this.creation.set(false);
        this.router.navigate(['/incubateur/cohortes']);
      },
      error: (error) => {
        console.error('Erreur création cohorte :', error);
        this.creation.set(false);
      },
    });
  }
}