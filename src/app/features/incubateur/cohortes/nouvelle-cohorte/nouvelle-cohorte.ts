import { Component, inject, output, signal } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { CreateCohorteRequest } from '../../../../core/models/cohorte.model';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-nouvelle-cohorte',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Icon,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    ModalComponent,
  ],
  template: `
    <app-modal
      title="Nouvelle cohorte"
      subtitle="Créez un groupe pour suivre et structurer le parcours de plusieurs entrepreneurs."
      maxWidth="lg"
      (close)="fermer()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="creer()"
        class="flex flex-col gap-5"
      >

        <!-- Nom -->
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

        <!-- Secteur -->
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

        <!-- Date -->
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

        <!-- Actions -->
        <div
          class="flex items-center justify-end gap-3 border-t border-line pt-5"
        >
          <app-button
            type="button"
            variant="ghost"
            size="sm"
            (click)="fermer()"
          >
            Annuler
          </app-button>

          <app-button
            type="submit"
            size="sm"
            [disabled]="form.invalid || creation()"
          >
            @if (creation()) {
              <span>Création...</span>
            } @else {
              <app-icon
                name="plus"
                class="size-4"
              />
              <span>Créer la cohorte</span>
            }
          </app-button>
        </div>

      </form>
    </app-modal>
  `,
})
export class NouvelleCohorte {
  private readonly fb = inject(FormBuilder);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureContext = inject(StructureContextService);

  readonly closed = output<void>();
  readonly created = output<void>();

  protected readonly creation = signal(false);

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

    if (!control || !control.touched || !control.errors) {
      return undefined;
    }

    if (control.errors['required']) {
      return 'Ce champ est obligatoire.';
    }

    if (control.errors['minlength']) {
      return `Minimum ${control.errors['minlength'].requiredLength} caractères requis.`;
    }

    return 'Champ invalide.';
  }

  protected fermer(): void {
    if (this.creation()) {
      return;
    }

    this.closed.emit();
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

    const {
      nom,
      secteur,
      dateDemarrage,
    } = this.form.getRawValue();

    const requestPayload: CreateCohorteRequest = {
      nom,
      description: secteur,
      dateDebut: dateDemarrage,
    };

    this.cohorteService.createCohorte(requestPayload).subscribe({
      next: () => {
        this.creation.set(false);
        this.created.emit();
        this.closed.emit();
      },

      error: (error) => {
        console.error('Erreur création cohorte :', error);
        this.creation.set(false);
      },
    });
  }
}