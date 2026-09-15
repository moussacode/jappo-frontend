import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../../../core/services/auth.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';

import { Cohorte, Projet } from '../../../../core/models';
import { CreateMissionRequest } from '../../../../core/models/mission.model';

import { ButtonComponent } from '../../../../shared/components/button/button.component';

type Cible = 'projet' | 'cohorte';

interface CohorteAvecCompte extends Cohorte {
  nbProjets: number;
}

@Component({
  selector: 'app-attribuer-mission',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonComponent],
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
            class="rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <!-- Description -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-medium text-ink-muted">DESCRIPTION & CONSIGNES</label>
          <textarea
            formControlName="description"
            rows="3"
            placeholder="Détaillez les attentes..."
            class="rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors resize-none"
          ></textarea>
        </div>

        <!-- Catégorie & Date d'échéance -->
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">CATÉGORIE</label>
            <input
              formControlName="categorie"
              placeholder="Ex. Pitch Deck"
              class="rounded-[var(--radius-input)] border border-line bg-surface px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
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
            @if (queryProjetId()) {
              <div class="flex items-center justify-between rounded-[var(--radius-input)] border border-line bg-surface-muted/40 px-3 py-2.5 text-sm text-ink">
                <div class="flex flex-col">
                  <span class="font-bold text-ink">{{ lockedProjet()?.nom || 'Projet sélectionné' }}</span>
                  @if (lockedProjet()?.nomEntrepreneur) {
                    <span class="text-xs text-ink-muted">Entrepreneur : {{ lockedProjet()?.nomEntrepreneur }}</span>
                  }
                </div>
                <span class="text-[11px] font-semibold text-accent uppercase tracking-wider">Contexte actif</span>
              </div>
            } @else {
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
            }
          </div>
        } @else {
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-medium text-ink-muted">COHORTE CIBLÉE *</label>
            @if (queryCohorteId()) {
              <div class="flex items-center justify-between rounded-[var(--radius-input)] border border-line bg-surface-muted/40 px-3 py-2.5 text-sm text-ink">
                <div class="flex flex-col">
                  <span class="font-bold text-ink">{{ lockedCohorte()?.nom || 'Cohorte sélectionnée' }}</span>
                  <span class="text-xs text-ink-muted">{{ lockedCohorte()?.nbProjets ?? 0 }} projet(s) dans cette cohorte</span>
                </div>
                <span class="text-[11px] font-semibold text-accent uppercase tracking-wider">Contexte actif</span>
              </div>
            } @else {
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
            }
          </div>
        }

        <!-- Option discrète : Enregistrer comme modèle réutilisable -->
        <label class="flex items-center gap-2 text-xs text-ink cursor-pointer select-none pt-1">
          <input
            type="checkbox"
            formControlName="enregistrerCommeModele"
            class="rounded border-line text-accent focus:ring-accent"
          />
          <span>Enregistrer comme modèle réutilisable dans le catalogue</span>
        </label>

        @if (errorMessage()) {
          <div class="rounded-lg border border-danger-100 bg-danger-50 p-3 text-xs text-danger-600">
            {{ errorMessage() }}
          </div>
        }

        <app-button
          type="submit"
          size="md"
          [disabled]="form.invalid || envoi()"
          class="mt-2 self-start"
        >
          {{ envoi() ? 'Attribution en cours…' : 'Attribuer la mission' }}
        </app-button>
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
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cible = signal<Cible>('projet');
  protected readonly cohortes = signal<CohorteAvecCompte[]>([]);
  protected readonly projets = signal<Projet[]>([]);
  protected readonly envoi = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly queryCohorteId = signal<string | null>(null);
  protected readonly queryProjetId = signal<string | null>(null);

  protected readonly lockedCohorte = computed(() => {
    const id = this.queryCohorteId();
    return id ? this.cohortes().find((c) => c.id === id) : undefined;
  });

  protected readonly lockedProjet = computed(() => {
    const id = this.queryProjetId();
    return id ? this.projets().find((p) => p.id === id) : undefined;
  });

  protected readonly form = this.fb.nonNullable.group({
    titre: ['', Validators.required],
    description: [''],
    categorie: [''],
    dateEcheance: [''],
    projetId: ['', Validators.required],
    cohorteId: [''],
    enregistrerCommeModele: [false],
  });

  ngOnInit(): void {
    // Lire les query params dès l'initialisation
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const cohorteId = params.get('cohorteId');
        const projetId = params.get('projetId');

        if (cohorteId) {
          this.queryCohorteId.set(cohorteId);
          this.definirCible('cohorte');
          this.form.controls.cohorteId.setValue(cohorteId);
        } else if (projetId) {
          this.queryProjetId.set(projetId);
          this.definirCible('projet');
          this.form.controls.projetId.setValue(projetId);
        }
      });

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
      if (!this.queryCohorteId()) {
        this.form.controls.cohorteId.setValue('');
      }
      if (this.queryProjetId()) {
        this.form.controls.projetId.setValue(this.queryProjetId()!);
      }
    } else {
      this.form.controls.cohorteId.setValidators(Validators.required);
      this.form.controls.projetId.clearValidators();
      if (!this.queryProjetId()) {
        this.form.controls.projetId.setValue('');
      }
      if (this.queryCohorteId()) {
        this.form.controls.cohorteId.setValue(this.queryCohorteId()!);
      }
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
      enregistrerCommeModele: values.enregistrerCommeModele || undefined,
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