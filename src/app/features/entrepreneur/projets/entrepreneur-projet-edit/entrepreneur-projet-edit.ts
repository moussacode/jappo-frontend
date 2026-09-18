import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet } from '../../../../core/models';

// Design System Partagé
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

@Component({
  selector: 'app-entrepreneur-projet-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent
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
        <app-card padding="lg" class="animate-pulse">
          <div class="space-y-4">
            <div class="h-5 w-1/3 rounded bg-line"></div>
            <div class="h-10 w-full rounded bg-line"></div>
            <div class="h-5 w-1/4 rounded bg-line"></div>
            <div class="h-32 w-full rounded bg-line"></div>
            <div class="h-5 w-1/4 rounded bg-line"></div>
            <div class="h-10 w-full rounded bg-line"></div>
          </div>
        </app-card>
      } @else if (error()) {
        <!-- ÉTAT ERREUR -->
        <div class="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
          <p class="text-rose-800 font-medium">{{ error() }}</p>
          <button (click)="navigateBack()" class="mt-3 text-sm text-rose-600 hover:text-rose-800 font-medium">
            Retour
          </button>
        </div>
      } @else {
        <!-- FORMULAIRE -->
        <app-card padding="lg">
          <form (ngSubmit)="saveProjet()" class="space-y-6">

            <!-- Nom du projet -->
            <div>
              <label for="nom" class="block text-sm font-medium text-ink mb-2">
                Nom du projet <span class="text-rose-500">*</span>
              </label>
              <input
                id="nom"
                type="text"
                [(ngModel)]="formData().nom"
                name="nom"
                required
                class="w-full rounded-xl border border-line bg-surface py-2.5 px-4 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Mon projet startup"
              />
            </div>

            <!-- Description -->
            <div>
              <label for="description" class="block text-sm font-medium text-ink mb-2">
                Description
              </label>
              <textarea
                id="description"
                [(ngModel)]="formData().description"
                name="description"
                rows="4"
                class="w-full rounded-xl border border-line bg-surface py-2.5 px-4 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 resize-none"
                placeholder="Décrivez votre projet en quelques lignes..."
              ></textarea>
            </div>

            <!-- Secteur -->
            <div>
              <label for="secteur" class="block text-sm font-medium text-ink mb-2">
                Secteur d'activité
              </label>
              <input
                id="secteur"
                type="text"
                [(ngModel)]="formData().secteur"
                name="secteur"
                class="w-full rounded-xl border border-line bg-surface py-2.5 px-4 text-sm text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                placeholder="Tech, AgriTech, FinTech, E-commerce..."
              />
            </div>

            <!-- Boutons d'action -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-line">
              <button
                type="button"
                (click)="navigateBack()"
                class="px-6 py-2.5 rounded-xl font-medium text-ink border-2 border-line hover:bg-surface-muted transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                [disabled]="saving()"
                class="px-6 py-2.5 rounded-xl font-medium text-white bg-accent hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (saving()) {
                  <span class="inline-flex items-center gap-2">
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Enregistrement...
                  </span>
                } @else {
                  Enregistrer
                }
              </button>
            </div>
          </form>
        </app-card>

        <!-- Message de succès -->
        @if (success()) {
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p class="text-emerald-800 font-medium">✓ Projet modifié avec succès</p>
          </div>
        }
      }
    </div>
  `,
})
export class EntrepreneurProjetEditComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projetService = inject(ProjetService);

  projet = signal<Projet | null>(null);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal(false);

  formData = signal<{ nom: string; description: string; secteur: string }>({
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

  loadProjet(id: string): void {
    this.loading.set(true);
    this.error.set(null);

    this.projetService.getById(id).subscribe({
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

  saveProjet(): void {
    const projetId = this.route.snapshot.paramMap.get('id');
    if (!projetId) return;

    this.saving.set(true);
    this.error.set(null);
    this.success.set(false);

    this.projetService.updateProjet(projetId, this.formData()).subscribe({
      next: (updatedProjet) => {
        this.projet.set(updatedProjet);
        this.saving.set(false);
        this.success.set(true);
        
        // Masquer le message de succès après 3 secondes
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

  navigateBack(): void {
    this.router.navigate(['/entrepreneur/projets']);
  }
}
