import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet } from '../../../../core/models';

// Design System Partagé
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-entrepreneur-projet-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    Icon
  ],
  template: `
    <div class="mx-auto flex w-full max-w-4xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page -->
      <app-page-header
        title="Modifier mon projet"
        [subtitle]="loading() ? 'Chargement...' : (projet()?.nom || '')"
        breadcrumb="Entrepreneur > Mes Projets > Modifier"
      />

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <app-card padding="lg" class="animate-pulse border border-line/60 bg-surface">
          <div class="space-y-4">
            <div class="h-5 w-1/3 rounded bg-line/60"></div>
            <div class="h-10 w-full rounded bg-line/60"></div>
            <div class="h-5 w-1/4 rounded bg-line/60"></div>
            <div class="h-32 w-full rounded bg-line/60"></div>
            <div class="h-5 w-1/4 rounded bg-line/60"></div>
            <div class="h-10 w-full rounded bg-line/60"></div>
          </div>
        </app-card>
      } @else if (error()) {
        <!-- ÉTAT ERREUR -->
        <div class="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 p-8 text-center">
          <app-icon name="warning" class="size-8 text-rose-600 mb-2" />
          <p class="text-sm font-semibold text-rose-600">{{ error() }}</p>
          <app-button variant="secondary" size="sm" class="mt-4" (click)="navigateBack()">
            Retour
          </app-button>
        </div>
      } @else {
        <!-- FORMULAIRE -->
        <app-card padding="lg" class="border border-line/60 shadow-xs">
          <form (ngSubmit)="saveProjet()" class="space-y-6">

            <!-- Nom du projet -->
            <div class="flex flex-col gap-1.5">
              <label for="nom" class="text-xs font-bold text-ink">
                Nom du projet <span class="text-rose-500">*</span>
              </label>
              <input
                id="nom"
                type="text"
                [(ngModel)]="formData().nom"
                name="nom"
                required
                class="w-full rounded-xl border border-line/60 bg-surface py-2.5 px-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
                placeholder="Mon projet startup"
              />
            </div>

            <!-- Description -->
            <div class="flex flex-col gap-1.5">
              <label for="description" class="text-xs font-bold text-ink">
                Description
              </label>
              <textarea
                id="description"
                [(ngModel)]="formData().description"
                name="description"
                rows="4"
                class="w-full rounded-xl border border-line/60 bg-surface py-2.5 px-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none resize-none"
                placeholder="Décrivez votre projet en quelques lignes..."
              ></textarea>
            </div>

            <!-- Secteur -->
            <div class="flex flex-col gap-1.5">
              <label for="secteur" class="text-xs font-bold text-ink">
                Secteur d'activité
              </label>
              <input
                id="secteur"
                type="text"
                [(ngModel)]="formData().secteur"
                name="secteur"
                class="w-full rounded-xl border border-line/60 bg-surface py-2.5 px-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
                placeholder="Tech, AgriTech, FinTech, E-commerce..."
              />
            </div>

            <!-- Boutons d'action -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-line/60">
              <app-button
                type="button"
                variant="secondary"
                size="sm"
                (click)="navigateBack()"
              >
                Annuler
              </app-button>
              
              <app-button
                type="submit"
                size="sm"
                [disabled]="saving()"
              >
                @if (saving()) {
                  <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin size-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </span>
                } @else {
                  Enregistrer
                }
              </app-button>
            </div>
          </form>
        </app-card>

        <!-- Message de succès -->
        @if (success()) {
          <div class="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs text-emerald-600 text-center justify-center font-semibold">
            <app-icon name="check" class="size-4 shrink-0" />
            <span>Projet modifié avec succès</span>
          </div>
        }
      }
    </div>
  `,
})
export class EntrepreneurProjetEditComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly success = signal(false);

  protected readonly formData = signal<{ nom: string; description: string; secteur: string }>({
    nom: '',
    description: '',
    secteur: ''
  });

  ngOnInit(): void {
    const projetId = this.route.snapshot.paramMap.get('id');
    if (projetId) {
      this.loadProjet(projetId);
    } else {
      this.error.set('ID de projet manquant');
      this.loading.set(false);
    }
  }

  protected loadProjet(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.projetService.getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (projet) => {
          this.projet.set(projet);
          this.formData.set({
            nom: projet.nom,
            description: projet.description || '',
            secteur: projet.secteur || ''
          });
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur lors du chargement du projet:', err);
          if (err.status === 403) {
            this.error.set("Vous n'avez pas la permission de modifier ce projet.");
          } else if (err.status === 404) {
            this.error.set('Projet non trouvé.');
          } else {
            this.error.set('Impossible de charger le projet. Veuillez réessayer.');
          }
          this.loading.set(false);
        }
      });
  }

  protected saveProjet(): void {
    const projetId = this.route.snapshot.paramMap.get('id');
    if (!projetId) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.projetService.updateProjet(projetId, this.formData())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedProjet) => {
          this.projet.set(updatedProjet);
          this.saving.set(false);
          this.success.set(true);
          
          setTimeout(() => this.success.set(false), 3000);
        },
        error: (err) => {
          console.error('Erreur lors de la modification du projet:', err);
          if (err.status === 403) {
            this.error.set("Vous n'avez pas la permission de modifier ce projet.");
          } else if (err.status === 404) {
            this.error.set('Projet non trouvé.');
          } else {
            this.error.set('Impossible de modifier le projet. Veuillez réessayer.');
          }
          this.saving.set(false);
        }
      });
  }

  protected navigateBack(): void {
    this.router.navigate(['/entrepreneur/projets']);
  }
}