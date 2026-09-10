import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MissionService } from '../../../../core/services/mission.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { PrioriteMission, CreateMissionRequest } from '../../../../core/models/mission.model';
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-mission-create',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, ButtonComponent],
  templateUrl: './mission-create.html',
})
export class MissionCreate implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly missionService = inject(MissionService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly isSubmitting = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly cohortes = signal<any[]>([]);
  protected readonly projets = signal<any[]>([]);

  // Formulaire réactif avec validation
  protected readonly missionForm = this.fb.group({
    titre: ['', [Validators.required, Validators.maxLength(150)]],
    description: ['', [Validators.required, Validators.maxLength(1000)]],
    dateEcheance: ['', [Validators.required]],
    priorite: ['MOYENNE' as PrioriteMission, [Validators.required]],
    cibleType: ['cohorte' as 'cohorte' | 'projet', [Validators.required]],
    cohorteId: [''],
    projetId: [''],
  });

  ngOnInit(): void {
    this.chargerDonneesContextuelles();

    // Gérer dynamiquement les validateurs selon le type de cible choisi
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
    this.isLoading.set(true);

    forkJoin({
      cohortes: this.cohorteService.getCohortes().pipe(catchError(() => of([]))),
      projets: this.projetService.getProjets().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ cohortes, projets }) => {
          this.cohortes.set(cohortes);
          this.projets.set(projets);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement listes:', err);
          this.isLoading.set(false);
        },
      });
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
      titre: val.titre!,
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
          this.router.navigate(['/incubateur/missions']);
        },
        error: (err) => {
          console.error('Erreur création mission:', err);
          this.isSubmitting.set(false);
          this.errorMessage.set('Une erreur est survenue lors de la création de la mission.');
        },
      });
  }
}