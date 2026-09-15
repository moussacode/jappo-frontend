import { Component, inject, output, signal, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';
import { MissionService } from '../../../../core/services/mission.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { PrioriteMission, CreateMissionRequest } from '../../../../core/models/mission.model';
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { InputComponent } from '../../../../shared/components/input/input.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-mission-create-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Icon,
    ButtonComponent,
    FormFieldComponent,
    InputComponent,
    ModalComponent
],
  template: `
    <app-modal
  title="Créer une nouvelle mission"
  subtitle="Définissez un jalon et assignez-le à une cohorte ou un projet."
  maxWidth="2xl"
  (close)="close.emit()"
>
  <form
    [formGroup]="missionForm"
    (ngSubmit)="onSubmit()"
    class="flex flex-col gap-5 overflow-y-auto max-h-[75vh]"
  >
          <app-form-field
            label="Titre de la mission"
            [required]="true"
            [error]="getFieldError('titre')"
          >
            <app-input
              formControlName="titre"
              placeholder="Ex: Soumission du Business Model Canvas (BMC)"
              [invalid]="isFieldInvalid('titre')"
            />
          </app-form-field>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">
              Consignes & Description détaillée <span class="text-accent">*</span>
            </label>
            <textarea
              formControlName="description"
              rows="4"
              placeholder="Précisez les attentes, les livrables..."
              class="w-full rounded-xl border border-line bg-surface p-4 text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none transition-colors resize-y leading-relaxed shadow-2xs"
            ></textarea>
            @if (isFieldInvalid('description')) {
              <span class="text-[11px] text-rose-600">Les consignes sont obligatoires.</span>
            }
          </div>

          <!-- Échéance & Priorité -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <app-form-field
              label="Date limite (Échéance)"
              [required]="true"
              [error]="getFieldError('dateEcheance')"
            >
              <app-input
                type="date"
                formControlName="dateEcheance"
                [invalid]="isFieldInvalid('dateEcheance')"
              />
            </app-form-field>

            <app-form-field label="Niveau de priorité">
              <select
                formControlName="priorite"
                class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="BASSE">Basse</option>
                <option value="MOYENNE">Moyenne</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </app-form-field>
          </div>

          <!-- Périmètre d'attribution (Cible) -->
          <div class="flex flex-col gap-3 pt-3 border-t border-line">
            <label class="text-xs font-semibold text-ink">Périmètre d'attribution *</label>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                class="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                [class]="missionForm.get('cibleType')?.value === 'cohorte' ? 'border-accent bg-accent-soft/10 text-ink shadow-2xs' : 'border-line bg-surface text-ink-muted'"
              >
                <input type="radio" formControlName="cibleType" value="cohorte" class="accent-accent" />
                <span class="text-xs font-semibold text-ink">Toute une cohorte</span>
              </label>

              <label
                class="flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all"
                [class]="missionForm.get('cibleType')?.value === 'projet' ? 'border-accent bg-accent-soft/10 text-ink shadow-2xs' : 'border-line bg-surface text-ink-muted'"
              >
                <input type="radio" formControlName="cibleType" value="projet" class="accent-accent" />
                <span class="text-xs font-semibold text-ink">Un projet spécifique</span>
              </label>
            </div>
          </div>

          <!-- Sélection Cohorte ou Projet -->
          @if (missionForm.get('cibleType')?.value === 'cohorte') {
            <app-form-field label="Sélectionner la cohorte" [required]="true" [error]="getFieldError('cohorteId')">
              <select
                formControlName="cohorteId"
                class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">-- Choisir une promotion --</option>
                @for (c of cohortes(); track c.id) {
                  <option [value]="c.id">{{ c.nom }}</option>
                }
              </select>
            </app-form-field>
          } @else {
            <app-form-field label="Sélectionner le projet" [required]="true" [error]="getFieldError('projetId')">
              <select
                formControlName="projetId"
                class="w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">-- Choisir une startup / un projet --</option>
                @for (p of projets(); track p.id) {
                  <option [value]="p.id">{{ p.nom }}</option>
                }
              </select>
            </app-form-field>
          }

          @if (errorMessage()) {
            <div class="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-semibold text-rose-600">
              {{ errorMessage() }}
            </div>
          }
    <div class="flex items-center justify-end gap-3 pt-4 border-t border-line mt-2">
      <app-button type="button" variant="ghost" size="sm" (click)="close.emit()">
        Annuler
      </app-button>

      <app-button type="submit" size="sm" [disabled]="isSubmitting()">
        @if (isSubmitting()) {
          <span>Création...</span>
        } @else {
          <app-icon name="plus" class="size-3.5" />
          <span>Publier la mission</span>
        }
      </app-button>
    </div>
  </form>
</app-modal>
       
  `,
})
export class MissionCreateModalComponent implements OnInit {
  readonly close = output<void>();
  readonly created = output<void>();
private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly missionService = inject(MissionService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly cohortes = signal<any[]>([]);
  protected readonly projets = signal<any[]>([]);

  protected readonly missionForm = this.fb.nonNullable.group({
    titre: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required]],
    dateEcheance: ['', [Validators.required]],
    priorite: ['MOYENNE' as PrioriteMission, [Validators.required]],
    cibleType: ['cohorte' as 'cohorte' | 'projet', [Validators.required]],
    cohorteId: [''],
    projetId: [''],
  });

  ngOnInit(): void {
    this.chargerDonneesContextuelles();

   

  const cohorteIdPreselectionnee = this.route.snapshot.queryParamMap.get('cohorteId');
  if (cohorteIdPreselectionnee) {
    this.missionForm.patchValue({
      cibleType: 'cohorte',
      cohorteId: cohorteIdPreselectionnee,
    });
  }

    // Gestion dynamique des validateurs selon le type de cible
    this.missionForm.get('cibleType')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => {
        const cohorteCtrl = this.missionForm.get('cohorteId');
        const projetCtrl = this.missionForm.get('projetId');

        if (type === 'cohorte') {
          cohorteCtrl?.setValidators([Validators.required]);
          projetCtrl?.clearValidators();
          projetCtrl?.setValue('');
        } else {
          projetCtrl?.setValidators([Validators.required]);
          cohorteCtrl?.clearValidators();
          cohorteCtrl?.setValue('');
        }
        cohorteCtrl?.updateValueAndValidity();
        projetCtrl?.updateValueAndValidity();
      });
  }

  private chargerDonneesContextuelles(): void {
    forkJoin({
      cohortes: this.cohorteService.getActiveCohortes().pipe(catchError(() => of([]))),
      projets: this.projetService.getProjets().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cohortes, projets }) => {
          this.cohortes.set(cohortes);
          this.projets.set(projets);
        },
      });
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const ctrl = this.missionForm.get(fieldName);
    return !!(ctrl && ctrl.touched && ctrl.invalid);
  }

  protected getFieldError(fieldName: string): string | undefined {
    const control = this.missionForm.get(fieldName);
    if (!control || !control.touched || !control.errors) return undefined;

    if (control.errors['required']) return 'Ce champ est obligatoire.';
    if (control.errors['maxlength']) {
      return `Maximum ${control.errors['maxlength'].requiredLength} caractères autorisés.`;
    }
    return 'Champ invalide.';
  }

  protected onSubmit(): void {
    if (this.missionForm.invalid) {
      this.missionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const val = this.missionForm.getRawValue();
    const request: CreateMissionRequest = {
      titre: val.titre,
      description: val.description || undefined,
      dateEcheance: val.dateEcheance || undefined,
      priorite: val.priorite as PrioriteMission,
      cohorteId: val.cibleType === 'cohorte' ? val.cohorteId || undefined : undefined,
      projetId: val.cibleType === 'projet' ? val.projetId || undefined : undefined,
    };

    this.missionService
      .createMission(request)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSubmitting.set(false);
          this.created.emit();
          this.close.emit();
        },
        error: (err) => {
          console.error('Erreur création mission:', err);
          this.isSubmitting.set(false);
          const backendMessage = typeof err.error === 'string' ? err.error : err.error?.message;
          this.errorMessage.set(
            backendMessage || 'Une erreur est survenue lors de la création de la mission.'
          );
        },
      });
  }
}