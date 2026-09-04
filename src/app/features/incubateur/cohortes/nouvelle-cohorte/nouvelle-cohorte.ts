import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { Icon } from "../../../../shared/components/icon/icon";

@Component({
  selector: 'app-nouvelle-cohorte',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a routerLink="/incubateur/cohortes" class=" flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-ink">  <app-icon
    name="arrow-left"
    class="size-4 flex items-center justify-center text-neutral-700"
  /> Cohortes </a>

      <div>
        <h1 class="text-[24px] font-normal leading-[1.33] text-ink">Nouvelle cohorte</h1>
        <p class="mt-1 text-sm text-ink-muted">Crée un groupe pour suivre plusieurs entrepreneurs ensemble</p>
      </div>

      <form
        [formGroup]="form"
        (ngSubmit)="creer()"
        class="flex max-w-[480px] flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-6"
      >
        <div class="flex flex-col gap-1.5">
          <label for="nom" class="text-xs font-medium text-ink-muted">NOM DE LA COHORTE</label>
          <input
            id="nom"
            type="text"
            formControlName="nom"
            placeholder="Ex. Cohorte 5 - Santé numérique"
            class="rounded-[var(--radius-input)] border border-input-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="secteur" class="text-xs font-medium text-ink-muted">SECTEUR</label>
          <input
            id="secteur"
            type="text"
            formControlName="secteur"
            placeholder="Ex. Santé numérique"
            class="rounded-[var(--radius-input)] border border-input-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label for="dateDemarrage" class="text-xs font-medium text-ink-muted">DATE DE DÉMARRAGE</label>
          <input
            id="dateDemarrage"
            type="date"
            formControlName="dateDemarrage"
            class="rounded-[var(--radius-input)] border border-input-border px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <button
          type="submit"
          [disabled]="form.invalid || creation()"
          class="mt-2 self-start rounded-[var(--radius-button)] bg-action-fill px-4 py-2.5 text-sm font-medium text-white shadow-[var(--shadow-subtle)] hover:opacity-90 disabled:opacity-40"
        >
          {{ creation() ? 'Création…' : 'Créer la cohorte' }}
        </button>
      </form>
    </div>
  `,
})
export class NouvelleCohorte {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly cohorteService = inject(CohorteService);
  private readonly router = inject(Router);

  protected readonly creation = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nom: ['', Validators.required],
    secteur: ['', Validators.required],
    dateDemarrage: ['', Validators.required],
  });

  protected creer(): void {
    const user = this.authService.currentUser();
    if (this.form.invalid || !this.authService.isMembreEquipe(user)) return;

    this.creation.set(true);
    const { nom, secteur, dateDemarrage } = this.form.getRawValue();
    this.cohorteService.create(user.structureId, nom, secteur, dateDemarrage).subscribe(() => {
      this.router.navigate(['/incubateur/cohortes']);
    });
  }
}