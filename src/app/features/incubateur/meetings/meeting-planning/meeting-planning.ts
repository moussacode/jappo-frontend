import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MeetingService } from '../../../../core/services/meeting.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { Meeting, CreateMeetingRequest, MeetingType, MeetingMode } from '../../../../core/models/meeting.model';
import { Cohorte } from '../../../../core/models/cohorte.model';
import { Observable } from 'rxjs';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

@Component({
  selector: 'app-meeting-planning',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    PageHeaderComponent
  ],
  template: `
    <div class="flex flex-col gap-6 p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <app-page-header
        title="Nouvelle réunion"
        subtitle="Planifiez une nouvelle réunion vidéo"
      >
        <app-button variant="secondary" (click)="cancel()">
          Annuler
        </app-button>
      </app-page-header>

      <app-card>
        <form [formGroup]="meetingForm" (ngSubmit)="onSubmit()" class="flex flex-col gap-6 p-4 sm:p-6">
          <!-- Titre -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">Titre</label>
            <input
              type="text"
              formControlName="title"
              class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              placeholder="Titre de la réunion"
            />
            @if (meetingForm.get('title')?.touched && meetingForm.get('title')?.invalid) {
              <span class="text-xs text-rose-600">Le titre est obligatoire</span>
            }
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">Description (optionnel)</label>
            <textarea
              formControlName="description"
              rows="3"
              class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors resize-none"
              placeholder="Description de la réunion"
            ></textarea>
          </div>

          <!-- Type de réunion -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">Type de réunion</label>
            <select
              formControlName="type"
              class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              (change)="onTypeChange()"
            >
              <option value="INDIVIDUAL">Individuelle (Coach + Entrepreneur)</option>
              <option value="GROUP">Groupe (Coach + Cohorte)</option>
            </select>
          </div>

          <!-- Mode de réunion -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">Mode de réunion</label>
            <select
              formControlName="mode"
              class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              (change)="onModeChange()"
            >
              <option value="ONLINE">En ligne (vidéoconférence)</option>
              <option value="PRESENTIEL">Présentiel (rencontrer en personne)</option>
            </select>
          </div>

          <!-- Participant (INDIVIDUAL uniquement) -->
          @if (meetingForm.get('type')?.value === 'INDIVIDUAL') {
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Entrepreneur</label>
              <select
                formControlName="participantId"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Sélectionner un entrepreneur</option>
                @for (entrepreneur of entrepreneurs(); track entrepreneur.id) {
                  <option [value]="entrepreneur.id">{{ entrepreneur.prenom }} {{ entrepreneur.nom }}</option>
                }
              </select>
              @if (meetingForm.get('participantId')?.touched && meetingForm.get('participantId')?.invalid) {
                <span class="text-xs text-rose-600">Veuillez sélectionner un entrepreneur</span>
              }
            </div>
          }

          <!-- Cohorte (GROUP uniquement) -->
          @if (meetingForm.get('type')?.value === 'GROUP') {
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Cohorte</label>
              <select
                formControlName="cohortId"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Sélectionner une cohorte</option>
                @for (cohort of cohortes(); track cohort.id) {
                  <option [value]="cohort.id">{{ cohort.nom }}</option>
                }
              </select>
              @if (meetingForm.get('cohortId')?.touched && meetingForm.get('cohortId')?.invalid) {
                <span class="text-xs text-rose-600">Veuillez sélectionner une cohorte</span>
              }
            </div>
          }

          <!-- Date et heure -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Date</label>
              <input
                type="date"
                formControlName="scheduledDate"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              />
              @if (meetingForm.get('scheduledDate')?.touched && meetingForm.get('scheduledDate')?.invalid) {
                <span class="text-xs text-rose-600">La date est obligatoire</span>
              }
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Heure</label>
              <input
                type="time"
                formControlName="scheduledTime"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              />
            </div>
          </div>

          <!-- Lieu et adresse (PRESENTIEL uniquement) -->
          @if (meetingForm.get('mode')?.value === 'PRESENTIEL') {
            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Lieu</label>
              <input
                type="text"
                formControlName="location"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                placeholder="Ex: Salle de réunion A, Bureau central"
              />
            </div>

            <div class="flex flex-col gap-2">
              <label class="text-xs font-semibold text-ink">Adresse</label>
              <textarea
                formControlName="address"
                rows="2"
                class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors resize-none"
                placeholder="Adresse complète du lieu"
              ></textarea>
            </div>
          }

          <!-- Durée -->
          <div class="flex flex-col gap-2">
            <label class="text-xs font-semibold text-ink">Durée (minutes)</label>
            <input
              type="number"
              formControlName="durationMinutes"
              min="15"
              max="180"
              class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
              placeholder="60"
            />
            @if (meetingForm.get('durationMinutes')?.touched && meetingForm.get('durationMinutes')?.invalid) {
              <span class="text-xs text-rose-600">La durée doit être positive</span>
            }
          </div>

          <!-- Actions -->
          <div class="flex gap-3 justify-end pt-4 border-t border-line">
            <app-button
              variant="secondary"
              type="button"
              (click)="cancel()"
            >
              Annuler
            </app-button>
            <app-button
              variant="primary"
              type="submit"
              [disabled]="submitting()"
            >
              @if (submitting()) {
                Création...
              } @else {
                Créer la réunion
              }
            </app-button>
          </div>
        </form>
      </app-card>
    </div>
  `,
})
export class MeetingPlanningComponent {
  private formBuilder = inject(FormBuilder);
  private meetingService = inject(MeetingService);
  private cohorteService = inject(CohorteService);
  private entrepreneurService = inject(EntrepreneurService);
  private router = inject(Router);

  meetingForm: FormGroup = this.formBuilder.group({});
  submitting = signal(false);
  entrepreneurs = signal<any[]>([]);
  cohortes = signal<Cohorte[]>([]);

  ngOnInit(): void {
    this.initForm();
    this.loadEntrepreneurs();
    this.loadCohortes();
  }

  private initForm(): void {
    this.meetingForm = this.formBuilder.group({
      title: ['', Validators.required],
      description: [''],
      type: ['INDIVIDUAL' as MeetingType, Validators.required],
      mode: ['ONLINE' as MeetingMode, Validators.required],
      participantId: [''],
      cohortId: [''],
      location: [''],
      address: [''],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      durationMinutes: [60, [Validators.required, Validators.min(15)]]
    });
  }

  private loadEntrepreneurs(): void {
    this.entrepreneurService.getEntrepreneurs().subscribe({
      next: (entrepreneurs) => this.entrepreneurs.set(entrepreneurs),
      error: (err) => console.error('Failed to load entrepreneurs:', err)
    });
  }

  private loadCohortes(): void {
    this.cohorteService.getActiveCohortes().subscribe({
      next: (cohortes) => this.cohortes.set(cohortes),
      error: (err) => console.error('Failed to load cohortes:', err)
    });
  }

  onTypeChange(): void {
    const type = this.meetingForm.get('type')?.value;

    if (type === 'INDIVIDUAL') {
      this.meetingForm.get('cohortId')?.setValue('');
      this.meetingForm.get('cohortId')?.clearValidators();
      this.meetingForm.get('participantId')?.setValidators([Validators.required]);
    } else if (type === 'GROUP') {
      this.meetingForm.get('participantId')?.setValue('');
      this.meetingForm.get('participantId')?.clearValidators();
      this.meetingForm.get('cohortId')?.setValidators([Validators.required]);
    }

    this.meetingForm.get('participantId')?.updateValueAndValidity();
    this.meetingForm.get('cohortId')?.updateValueAndValidity();
  }

  onModeChange(): void {
    const mode = this.meetingForm.get('mode')?.value;

    if (mode === 'ONLINE') {
      this.meetingForm.get('location')?.setValue('');
      this.meetingForm.get('address')?.setValue('');
      this.meetingForm.get('location')?.clearValidators();
      this.meetingForm.get('address')?.clearValidators();
    } else if (mode === 'PRESENTIEL') {
      this.meetingForm.get('location')?.setValidators([Validators.required]);
      this.meetingForm.get('address')?.setValidators([Validators.required]);
    }

    this.meetingForm.get('location')?.updateValueAndValidity();
    this.meetingForm.get('address')?.updateValueAndValidity();
  }

  onSubmit(): void {
    if (this.meetingForm.invalid) {
      this.meetingForm.markAllAsTouched();
      return;
    }
    
 
    this.submitting.set(true);
    
 
    const request: CreateMeetingRequest = {
      title: this.meetingForm.value.title!,
      description: this.meetingForm.value.description,
      type: this.meetingForm.value.type!,
      mode: this.meetingForm.value.mode!,
      participantId: this.meetingForm.value.participantId || undefined,
      cohortId: this.meetingForm.value.cohortId || undefined,
      location: this.meetingForm.value.location || undefined,
      address: this.meetingForm.value.address || undefined,
      scheduledAt: this.combineDateTime(
        this.meetingForm.value.scheduledDate!,
        this.meetingForm.value.scheduledTime!
      ),
      durationMinutes: this.meetingForm.value.durationMinutes!
    };

    console.log('=== CREATE MEETING ===');
console.log('type:', this.meetingForm.value.type);
console.log('participantId:', this.meetingForm.value.participantId);
console.log('cohortId:', this.meetingForm.value.cohortId);
console.log('scheduledAt:', this.combineDateTime(
  this.meetingForm.value.scheduledDate,
  this.meetingForm.value.scheduledTime
));
console.log('request:', request);
    console.log('Create meeting request:', request);
    console.log('participantId typeof:', typeof request.participantId, 'value:', request.participantId);
console.log('cohortId typeof:', typeof request.cohortId, 'value:', request.cohortId);
  console.log('ENTREPRENEUR SELECTIONNE:', 
  this.meetingForm.value.participantId
);

console.log('ENTREPRENEURS:', this.entrepreneurs());

    this.meetingService.createMeeting(request).subscribe({
      next: (meeting) => {
        this.submitting.set(false);
        this.router.navigate(['/incubateur/reunions', meeting.id]);
      },
      error: (err) => {
        this.submitting.set(false);
        console.error('Failed to create meeting:', err);
        console.error('BODY ERREUR:', err.error);
      }
    });
}

 private combineDateTime(dateString: string, timeString: string): string {
  if (!dateString || !timeString) {
    throw new Error('La date et l\'heure sont obligatoires.');
  }

  const isoString = `${dateString}T${timeString}:00`;
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Date ou heure invalide.');
  }

  return isoString; // "2026-09-17T23:26:00" — compatible avec LocalDateTime.parse() côté backend
}

  cancel(): void {
    this.router.navigate(['/incubateur/reunions']);
  }
}
