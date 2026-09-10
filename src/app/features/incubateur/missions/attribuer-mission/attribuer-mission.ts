import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';

import { Cohorte, Projet } from '../../../../core/models';
import { CreateMissionRequest } from '../../../../core/models/mission.model';

type Cible = 'projet' | 'cohorte';

interface CohorteAvecCompte extends Cohorte {
  nbProjets: number;
}

@Component({
  selector: 'app-attribuer-mission',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a routerLink="/incubateur/missions" class="text-sm font-medium text-ink-muted hover:text-ink transition-colors">
        ← Missions
      </a>

      <div>
        <h1 class="text-[24px] font-normal leading-[1.33] text-ink">Attribuer une mission</h1>
        <p class="mt-1 text-sm text-ink-muted">Définissez une nouvelle consigne pour un projet ou une cohorte</p>
      </div>

      <form
        [formGroup]="form"
        (ngSubmit)="attribuer()"
        class="flex max-w-[520px] flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)]"
      >
        <!-- Titre -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-ink-muted">TITRE DE LA MISSION *</label>
          <input
            formControlName="titre"
            placeholder="Ex. Finaliser le pitch deck"
            class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-ink-muted">DESCRIPTION & CONSIGNES</label>
          <textarea
            formControlName="description"
            rows="3"
            placeholder="Détaillez les attentes..."
            class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Catégorie & Date d'échéance -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">CATÉGORIE</label>
            <input
              formControlName="categorie"
              placeholder="Ex. Pitch Deck"
              class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">ÉCHÉANCE</label>
            <input
              type="date"
              formControlName="dateEcheance"
              class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors bg-surface"
            />
          </div>
        </div>

        <!-- Destinataire -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-ink-muted">DESTINATAIRE *</label>
          <div class="flex gap-2">
            <button
              type="button"
              (click)="definirCible('projet')"
              class="flex-1 rounded-[var(--radius-input)] border px-3 py-2 text-sm font-medium transition-colors"
              [class]="cible() === 'projet' ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-ink-muted hover:text-ink'"
            >
              Un projet
            </button>
            <button
              type="button"
              (click)="definirCible('cohorte')"
              class="flex-1 rounded-[var(--radius-input)] border px-3 py-2 text-sm font-medium transition-colors"
              [class]="cible() === 'cohorte' ? 'border-accent bg-accent-soft text-accent-strong' : 'border-line text-ink-muted hover:text-ink'"
            >
              Une cohorte entière
            </button>
          </div>
        </div>

        <!-- Choix Projet ou Cohorte -->
        @if (cible() === 'projet') {
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">PROJET CIBLÉ *</label>
            <select
              formControlName="projetId"
              class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">Sélectionner un projet…</option>
              @for (p of projets(); track p.id) {
                <option [value]="p.id">
                  {{ p.nom }} {{ p.nomEntrepreneur ? '(' + p.nomEntrepreneur + ')' : '' }}
                </option>
              }
            </select>
          </div>
        } @else {
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">COHORTE CIBLÉE *</label>
            <select
              formControlName="cohorteId"
              class="rounded-[var(--radius-input)] border border-line px-3 py-2 text-sm text-ink bg-surface focus:outline-none focus:border-accent transition-colors"
            >
              <option value="">Sélectionner une cohorte…</option>
              @for (c of cohortes(); track c.id) {
                <option [value]="c.id" [disabled]="c.nbProjets === 0">
                  {{ c.nom }} — {{ c.nbProjets }} projet(s) {{ c.nbProjets === 0 ? '(Impossible)' : '' }}
                </option>
              }
            </select>
          </div>
        }

        @if (errorMessage()) {
          <div class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-xs text-danger-600">
            {{ errorMessage() }}
          </div>
        }

        <button
          type="submit"
          [disabled]="form.invalid || envoi()"
          class="mt-2 self-start rounded-[var(--radius-button)] bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {{ envoi() ? 'Attribution en cours…' : 'Attribuer la mission' }}
        </button>
      </form>
    </div>
  `,
})
export class AttribuerMission implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cohorteService = inject(CohorteService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cible = signal<Cible>('projet');
  protected readonly cohortes = signal<CohorteAvecCompte[]>([]);
  protected readonly projets = signal<Projet[]>([]);
  protected readonly envoi = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    titre: ['', Validators.required],
    description: [''],
    categorie: [''],
    dateEcheance: [''],
    projetId: ['', Validators.required],
    cohorteId: [''],
  });

  ngOnInit(): void {
    const membership = this.authService.memberships()[0];
    if (!membership) return;

    const structureId = membership.structure.id;

    // Charger projets et cohortes
    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projets) => {
          this.projets.set(projets);

          this.cohorteService
            .getByStructure(structureId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (cohortes) => {
                // Compter les projets par cohorte
                const cohortesEnrichies = cohortes.map((c) => ({
                  ...c,
                  nbProjets: projets.filter((p) => p.cohorteId === c.id).length,
                }));
                this.cohortes.set(cohortesEnrichies);
              },
            });
        },
      });
  }

  protected definirCible(typeCible: Cible): void {
    this.cible.set(typeCible);

    if (typeCible === 'projet') {
      this.form.controls.projetId.setValidators(Validators.required);
      this.form.controls.cohorteId.clearValidators();
      this.form.controls.cohorteId.setValue('');
    } else {
      this.form.controls.cohorteId.setValidators(Validators.required);
      this.form.controls.projetId.clearValidators();
      this.form.controls.projetId.setValue('');
    }

    this.form.controls.projetId.updateValueAndValidity();
    this.form.controls.cohorteId.updateValueAndValidity();
  }

  protected attribuer(): void {
    if (this.form.invalid) return;

    this.envoi.set(true);
    this.errorMessage.set(null);

    const values = this.form.getRawValue();

    const payload: CreateMissionRequest = {
      titre: values.titre,
      description: values.description || undefined,
      dateEcheance: values.dateEcheance || undefined,
      projetId: this.cible() === 'projet' ? values.projetId : undefined,
      cohorteId: this.cible() === 'cohorte' ? values.cohorteId : undefined,
    };

    this.missionService
      .createMission(payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.envoi.set(false);
          this.router.navigate(['/incubateur/missions']);
        },
        error: (err) => {
          this.envoi.set(false);
          this.errorMessage.set(
            err?.error?.message ?? 'Impossible de créer la mission.'
          );
        },
      });
  }
}