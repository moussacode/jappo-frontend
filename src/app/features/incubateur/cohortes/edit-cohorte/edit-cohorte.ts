import { Component, inject, input, output, signal, OnInit } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { Cohorte, Phase, UpdateCohorteRequest, CoachSummary } from '../../../../core/models/cohorte.model';
import { ParcoursService } from '../../../../core/services/parcours.service';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-edit-cohorte',
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
      title="Modifier le programme"
      subtitle="Mettez à jour les informations, la période et la phase de la cohorte."
      maxWidth="lg"
      (close)="fermer()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="enregistrer()"
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

        <!-- Description / Secteur -->
        <app-form-field
          label="Description / Secteur"
          [error]="getFieldError('description')"
        >
          <app-input
            formControlName="description"
            placeholder="Ex. FinTech, Agrotech, Santé numérique..."
            [invalid]="isFieldInvalid('description')"
          />
        </app-form-field>

        <!-- Dates -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <app-form-field
            label="Date de début"
            [error]="getFieldError('dateDebut')"
          >
            <app-input
              type="date"
              formControlName="dateDebut"
              [invalid]="isFieldInvalid('dateDebut')"
            />
          </app-form-field>

          <app-form-field
            label="Date de fin"
            [error]="getFieldError('dateFin')"
          >
            <app-input
              type="date"
              formControlName="dateFin"
              [invalid]="isFieldInvalid('dateFin')"
            />
          </app-form-field>
        </div>

        <!-- Phase d'accompagnement -->
        <app-form-field
          label="Phase d'accompagnement"
          [required]="true"
        >
          <select
            formControlName="phaseId"
            class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none shadow-xs transition-all cursor-pointer"
          >
            @if (phases().length === 0) {
              <option value="">Aucune phase disponible</option>
            }
            @for (phase of phases(); track phase.id) {
              <option [value]="phase.id">{{ phase.nom }}</option>
            }
          </select>
        </app-form-field>

        <!-- Équipe d'accompagnement -->
        <div class="flex flex-col gap-2">
          <label class="text-xs font-semibold text-ink">
            Équipe d'accompagnement
          </label>
          <p class="text-xs text-ink-muted">
            Sélectionnez les coachs affectés au suivi de cette cohorte.
          </p>

          @if (chargementCoachs()) {
            <p class="text-xs text-ink-muted animate-pulse py-2">Chargement des coachs…</p>
          } @else if (coachsDisponibles().length === 0) {
            <div class="rounded-xl border border-line bg-surface-muted/30 p-3 text-xs text-ink-muted">
              Aucun coach n'est encore enregistré dans la structure.
            </div>
          } @else {
            <div class="flex flex-col gap-2 max-h-48 overflow-y-auto rounded-xl border border-line p-3 bg-surface">
              @for (coach of coachsDisponibles(); track coach.id) {
                <label class="flex items-center gap-2.5 text-xs text-ink cursor-pointer hover:bg-surface-muted/50 p-1.5 rounded-lg transition-colors">
                  <input
                    type="checkbox"
                    [checked]="isCoachSelected(coach.id)"
                    (change)="toggleCoach(coach.id)"
                    class="rounded border-line text-accent focus:ring-accent size-4 cursor-pointer"
                  />
                  <div class="flex flex-col">
                    <span class="font-medium text-ink">
                      {{ coach.prenom || '' }} {{ coach.nom || '' }}
                    </span>
                    <span class="text-[11px] text-ink-muted">{{ coach.email }}</span>
                  </div>
                </label>
              }
            </div>
          }
        </div>

        <!-- Message d'erreur API si existant -->
        @if (errorMessage()) {
          <div class="rounded-xl bg-rose-500/10 p-3 text-xs text-rose-600 border border-rose-500/20">
            {{ errorMessage() }}
          </div>
        }

        <!-- Actions -->
        <div class="flex items-center justify-end gap-3 border-t border-line pt-5">
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
            [disabled]="form.invalid || enregistrementEnCours()"
          >
            @if (enregistrementEnCours()) {
              <span>Enregistrement…</span>
            } @else {
              <span>Enregistrer les modifications</span>
            }
          </app-button>
        </div>

      </form>
    </app-modal>
  `,
})
export class EditCohorteComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cohorteService = inject(CohorteService);
  private readonly parcoursService = inject(ParcoursService);

  // Inputs & Outputs
  cohorte = input.required<Cohorte>();
  readonly closed = output<void>();
  readonly updated = output<Cohorte>();

  protected readonly enregistrementEnCours = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly phases = signal<Phase[]>([]);
  protected readonly coachsDisponibles = signal<CoachSummary[]>([]);
  protected readonly selectedCoachIds = signal<Set<string>>(new Set());
  protected readonly chargementCoachs = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    dateDebut: [''],
    dateFin: [''],
    phaseId: ['', [Validators.required]],
  });

  ngOnInit(): void {
    const c = this.cohorte();
    if (c) {
      this.form.patchValue({
        nom: c.nom ?? '',
        description: c.description ?? '',
        dateDebut: c.dateDebut ?? '',
        dateFin: c.dateFin ?? '',
        phaseId: c.phaseId ?? c.phase?.id ?? '',
      });
      if (c.parcoursId) {
        this.parcoursService.getParcoursById(c.parcoursId).subscribe({
          next: (parcours) => this.phases.set(parcours.phases ?? []),
          error: () => this.phases.set(c.phase ? [c.phase] : []),
        });
      } else if (c.phase) {
        this.phases.set([c.phase]);
      }

      if (c.coachs && c.coachs.length > 0) {
        this.selectedCoachIds.set(new Set(c.coachs.map((k) => k.id)));
      } else {
        this.cohorteService.getCoachsDeCohorte(c.id).subscribe({
          next: (assigned) => {
            this.selectedCoachIds.set(new Set(assigned.map((k) => k.id)));
          },
        });
      }
    }

    this.cohorteService.getCoachsDisponibles().subscribe({
      next: (list) => {
        this.coachsDisponibles.set(list);
        this.chargementCoachs.set(false);
      },
      error: () => this.chargementCoachs.set(false),
    });
  }

  protected isCoachSelected(coachId: string): boolean {
    return this.selectedCoachIds().has(coachId);
  }

  protected toggleCoach(coachId: string): void {
    this.selectedCoachIds.update((set) => {
      const next = new Set(set);
      if (next.has(coachId)) {
        next.delete(coachId);
      } else {
        next.add(coachId);
      }
      return next;
    });
  }

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
    if (this.enregistrementEnCours()) return;
    this.closed.emit();
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enregistrementEnCours.set(true);
    this.errorMessage.set(null);

    const val = this.form.getRawValue();
    const payload: UpdateCohorteRequest = {
      nom: val.nom.trim(),
      description: val.description.trim() || undefined,
      dateDebut: val.dateDebut || undefined,
      dateFin: val.dateFin || undefined,
      phaseId: val.phaseId,
      coachIds: Array.from(this.selectedCoachIds()),
    };

    this.cohorteService
      .updateCohorte(this.cohorte().id, payload)
      .subscribe({
        next: (updatedCohorte) => {
          this.enregistrementEnCours.set(false);
          this.updated.emit(updatedCohorte);
          this.closed.emit();
        },
        error: (err) => {
          console.error('Erreur mise à jour cohorte :', err);
          this.enregistrementEnCours.set(false);
          this.errorMessage.set(err?.error?.message ?? 'Erreur lors de la mise à jour.');
        },
      });
  }
}