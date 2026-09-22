import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

// Services & Modèles
import { ProjetService } from '../../../../core/services/projet.service';
import { Projet } from '../../../../core/models';

// Design System Partagé
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent, BreadcrumbItem } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ViewSwitcherComponent } from '../../../../shared/components/view-switcher/view-switcher.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { NouveauProjetModal } from '../nouveau-projet-modal/nouveau-projet-modal';

export type VueMode = 'grid' | 'table';
export type FiltreArchive = 'TOUS' | 'ACTIFS' | 'ARCHIVES';

@Component({
  selector: 'app-projets-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    FormsModule,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    ViewSwitcherComponent,
    TabFilterComponent,
    EntityCardComponent,
    ModalComponent,
    NouveauProjetModal
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page Unifié -->
      <app-page-header
        title="Projets"
        [subtitle]="
          loading()
            ? 'Chargement des projets en cours...'
            : projetsFiltrees().length + ' projet(s) affiché(s) sur ' + allProjets().length
        "
        [breadcrumb]="breadcrumbItems()"
      >
        <!-- Switcher Grille / Tableau -->
        <app-view-switcher
          [mode]="vueMode()"
          tableIcon="missions"
          (modeChange)="vueMode.set($event)"
        />

        <!-- Bouton de création (CREATE) -->
        <app-button size="sm" (click)="showCreateModal.set(true)">
          <app-icon name="plus" class="size-4 mr-1.5" />
          <span class="hidden sm:inline">Nouveau projet</span>
        </app-button>
      </app-page-header>

      @if (erreurAction()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ erreurAction() }}</span>
        </div>
      }

      <!-- Barre de contrôles : Filtre Archive + Recherche réactive -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <app-tab-filter
          [options]="optionsFiltreArchive()"
          [value]="filtreArchive()"
          (valueChange)="filtreArchive.set($event)"
        />

        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par nom, secteur, cohorte..."
            class="w-full rounded-xl border border-line/60 bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (loading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <app-card padding="md" class="animate-pulse flex flex-col justify-between gap-4 h-40 border border-line/60">
              <div class="flex items-center justify-between">
                <div class="h-5 w-1/2 rounded bg-line/60"></div>
                <div class="h-5 w-16 rounded-full bg-line/60"></div>
              </div>
              <div class="h-4 w-3/4 rounded bg-line/60"></div>
              <div class="flex items-center justify-between border-t border-line/60 pt-3">
                <div class="h-4 w-20 rounded bg-line/60"></div>
                <div class="h-4 w-12 rounded bg-line/60"></div>
              </div>
            </app-card>
          }
        </div>
      } @else {

        <!-- VUE 1 : GRILLE DE CARTES -->
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (p of projetsFiltrees(); track p.id) {
              <app-entity-card
                [title]="p.nom"
                [subtitle]="p.secteur"
                [routerLink]="['/incubateur/projets', p.id]"
                [badgeLabel]="statutBadge(p.statut).label"
                [badgeStatus]="statutBadge(p.statut).status"
                [class.opacity-60]="p.archive"
              >
                <!-- Corps spécifique au projet -->
                <div card-body class="flex flex-col gap-2">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-ink-muted">Porteur :</span>
                    <span class="font-semibold text-ink truncate">{{ p.nomEntrepreneur || '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-ink-muted">Cohorte :</span>
                    <span class="font-medium text-ink truncate">{{ p.nomCohorte || 'Hors cohorte' }}</span>
                  </div>
                </div>

                <!-- Pied de carte : Actions rapides -->
                <div card-footer class="w-full flex items-center justify-end gap-1 pt-3 border-t border-line/60">
                  <app-button variant="secondary" size="xs" (click)="ouvrirEditModal(p); $event.stopPropagation();" title="Modifier">
                    <app-icon name="edit" class="size-3.5" />
                  </app-button>
                  @if (!p.archive) {
                    <app-button variant="secondary" size="xs" (click)="archiverProjet(p.id); $event.stopPropagation();" title="Archiver">
                      <app-icon name="archive" class="size-3.5 text-rose-600" />
                    </app-button>
                  }
                </div>
              </app-entity-card>
            } @empty {
              <div class="col-span-full">
                <app-card padding="none" class=" border border-line/60">
                  <div class="p-8 sm:p-12">
                    <app-empty-state
                      title="Aucun projet trouvé"
                      description="Ajustez vos filtres de recherche ou créez un nouveau projet d'entreprise."
                      iconName="dashboard"
                    >
                      <div class="mt-6">
                        <app-button size="sm" (click)="showCreateModal.set(true)">
                          <app-icon name="plus" class="size-4 mr-1.5" />
                          <span>Nouveau projet</span>
                        </app-button>
                      </div>
                    </app-empty-state>
                  </div>
                </app-card>
              </div>
            }
          </div>
        }

        <!-- VUE 2 : TABLEAU / LISTE -->
        @if (vueMode() === 'table') {
          <app-card padding="none" class="w-full min-w-0  ">
            <div class="w-full overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[700px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-line/60 bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                    <th class="w-4/12 px-5 py-3.5">Projet</th>
                    <th class="w-3/12 px-5 py-3.5">Porteur</th>
                    <th class="w-2/12 px-5 py-3.5">Cohorte</th>
                    <th class="w-1.5/12 px-5 py-3.5">Statut</th>
                    <th class="w-1.5/12 px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line/60">
                  @for (p of projetsFiltrees(); track p.id) {
                    <tr class="group transition-colors hover:bg-surface-muted/40" [class.opacity-60]="p.archive">
                      <!-- Nom & Secteur -->
                      <td class="px-5 py-3.5">
                        <div class="flex flex-col min-w-0">
                          <a [routerLink]="['/incubateur/projets', p.id]" class="truncate text-xs font-bold text-ink transition-colors group-hover:text-accent">
                            {{ p.nom }}
                          </a>
                          <span class="truncate text-[11px] text-ink-muted mt-0.5">
                            {{ p.secteur || 'Secteur non spécifié' }}
                          </span>
                        </div>
                      </td>

                      <!-- Porteur -->
                      <td class="px-5 py-3.5 font-medium text-ink truncate">
                        {{ p.nomEntrepreneur || '—' }}
                      </td>

                      <!-- Cohorte -->
                      <td class="px-5 py-3.5 text-ink-muted font-medium truncate">
                        {{ p.nomCohorte || 'Hors cohorte' }}
                      </td>

                      <!-- Statut Badge -->
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        @if (p.archive) {
                          <app-badge status="neutral" size="sm" class="font-bold">Archivé</app-badge>
                        } @else {
                          <app-badge [status]="statutBadge(p.statut).status" size="sm" class="font-bold">
                            {{ statutBadge(p.statut).label }}
                          </app-badge>
                        }
                      </td>

                      <!-- Actions CRUD -->
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-1.5">
                          <app-button variant="secondary" size="xs" (click)="ouvrirEditModal(p)" title="Modifier">
                            <app-icon name="edit" class="size-3.5" />
                          </app-button>
                          <app-button variant="secondary" size="xs" [routerLink]="['/incubateur/projets', p.id]" title="Détails complets">
                            <app-icon name="eye" class="size-3.5" />
                          </app-button>
                          @if (!p.archive) {
                            <app-button variant="secondary" size="xs" (click)="archiverProjet(p.id)" title="Archiver">
                              <app-icon name="archive" class="size-3.5 text-rose-600" />
                            </app-button>
                          }
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5" class="p-8">
                        <app-empty-state
                          title="Aucun projet trouvé"
                          description="Ajustez vos filtres de recherche ou créez un nouveau projet d'entreprise."
                          iconName="dashboard"
                        />
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </app-card>
        }

      }

    </div>

    <!-- MODALE DE CRÉATION DE PROJET (CREATE) -->
    @if (showCreateModal()) {
      <app-nouveau-projet-modal
        [submitting]="creationEnCours()"
        [errorMessage]="erreurCreation()"
        (close)="showCreateModal.set(false)"
        (created)="creerProjet($event)"
      />
    }

    <!-- MODALE DE MODIFICATION DE PROJET (UPDATE) -->
    @if (showEditModal() && projetEnCoursEdition()) {
      <app-modal
        title="Modifier le projet"
        subtitle="Mettez à jour les informations générales du projet."
        maxWidth="md"
        (close)="fermerEditModal()"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label for="edit-nom" class="text-xs font-bold text-ink">Nom du projet <span class="text-rose-500">*</span></label>
            <input
              id="edit-nom"
              type="text"
              [(ngModel)]="editNom"
              placeholder="Ex. Nom de la startup"
              class="w-full rounded-xl border border-line/60 bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label for="edit-secteur" class="text-xs font-bold text-ink">Secteur d'activité</label>
            <input
              id="edit-secteur"
              type="text"
              [(ngModel)]="editSecteur"
              placeholder="Ex. FinTech, AgriTech..."
              class="w-full rounded-xl border border-line/60 bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
            />
          </div>

          @if (erreurEditionModal()) {
            <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
              <app-icon name="warning" class="size-4 shrink-0" />
              <span>{{ erreurEditionModal() }}</span>
            </div>
          }

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-line/60 mt-4">
            <app-button variant="secondary" size="sm" (click)="fermerEditModal()">Annuler</app-button>
            <app-button size="sm" [disabled]="editionEnCours()" (click)="sauvegarderModification()">
              {{ editionEnCours() ? 'Enregistrement...' : 'Enregistrer' }}
            </app-button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class ProjetsList implements OnInit {
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vueMode = signal<VueMode>('table');
  protected readonly loading = signal<boolean>(true);
  protected readonly allProjets = signal<Projet[]>([]);
  protected readonly filtreArchive = signal<FiltreArchive>('ACTIFS');
  protected readonly erreurAction = signal<string | null>(null);

  // Gestion de la modale de création (CREATE)
  protected readonly showCreateModal = signal(false);
  protected readonly creationEnCours = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);

  // Gestion de la modale de modification (UPDATE avec Modal)
  protected readonly showEditModal = signal(false);
  protected readonly projetEnCoursEdition = signal<Projet | null>(null);
  protected readonly editionEnCours = signal(false);
  protected readonly erreurEditionModal = signal<string | null>(null);
  
  protected editNom = '';
  protected editSecteur = '';

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerms = signal('');

  protected readonly optionsFiltreArchive = computed<TabOption<FiltreArchive>[]>(() => [
    { value: 'ACTIFS', label: 'Actifs', count: this.allProjets().filter(p => !p.archive).length },
    { value: 'ARCHIVES', label: 'Archivés', count: this.allProjets().filter(p => p.archive).length },
    { value: 'TOUS', label: 'Tous', count: this.allProjets().length }
  ]);

  protected readonly breadcrumbItems = computed<BreadcrumbItem[]>(() => [
    { label: 'Incubateur', path: '/incubateur/dashboard' },
    { label: 'Projets' }
  ]);

  protected readonly projetsFiltrees = computed(() => {
    let result = this.allProjets();
    const query = this.searchTerms().toLowerCase().trim();
    const archive = this.filtreArchive();

    if (archive === 'ACTIFS') {
      result = result.filter((p) => !p.archive);
    } else if (archive === 'ARCHIVES') {
      result = result.filter((p) => p.archive);
    }

    if (query) {
      result = result.filter(
        (p) =>
          p.nom?.toLowerCase().includes(query) ||
          p.secteur?.toLowerCase().includes(query) ||
          p.nomEntrepreneur?.toLowerCase().includes(query) ||
          p.nomCohorte?.toLowerCase().includes(query)
      );
    }

    return result;
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerms.set(val));

    this.chargerProjets();
  }

  private chargerProjets(): void {
    this.loading.set(true);
    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allProjets.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement projets :', err);
          this.loading.set(false);
        },
      });
  }

  protected creerProjet(payload: { nom: string; description?: string; secteur?: string; cohorteId?: string; entrepreneurId?: string }): void {
    this.creationEnCours.set(true);
    this.erreurCreation.set(null);

    this.projetService
      .create(payload as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.creationEnCours.set(false);
          this.showCreateModal.set(false);
          this.chargerProjets();
        },
        error: (err) => {
          this.creationEnCours.set(false);
          this.erreurCreation.set(err?.error?.message ?? 'Erreur lors de la création du projet.');
        },
      });
  }

  // --- UPDATE (Modale d'édition) ---
  protected ouvrirEditModal(projet: Projet): void {
    this.projetEnCoursEdition.set(projet);
    this.editNom = projet.nom || '';
    this.editSecteur = projet.secteur || '';
    this.erreurEditionModal.set(null);
    this.showEditModal.set(true);
  }

  protected fermerEditModal(): void {
    this.showEditModal.set(false);
    this.projetEnCoursEdition.set(null);
  }

  protected sauvegarderModification(): void {
    const projet = this.projetEnCoursEdition();
    if (!projet || !this.editNom.trim()) {
      this.erreurEditionModal.set('Le nom du projet est obligatoire.');
      return;
    }

    this.editionEnCours.set(true);
    this.erreurEditionModal.set(null);

    const payload = {
      nom: this.editNom.trim(),
      secteur: this.editSecteur.trim() || undefined
    };

    this.projetService.updateProjet(projet.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.allProjets.update(list => list.map(p => p.id === projet.id ? updated : p));
          this.editionEnCours.set(false);
          this.fermerEditModal();
        },
        error: (err) => {
          this.editionEnCours.set(false);
          this.erreurEditionModal.set(err?.error?.message ?? 'Erreur lors de la mise à jour du projet.');
        }
      });
  }

  // --- DELETE / ARCHIVE ---
  protected archiverProjet(id: string): void {
    if (!confirm('Voulez-vous vraiment archiver ce projet ?')) return;
    this.erreurAction.set(null);

    this.projetService.archiverProjet(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.allProjets.update(list => list.map(p => p.id === id ? { ...p, archive: true } : p));
        },
        error: (err) => {
          this.erreurAction.set(err?.error?.message ?? "Erreur lors de l'archivage du projet.");
        }
      });
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
    switch (statut?.toUpperCase()) {
      case 'ACTIF':
        return { status: 'success', label: 'Actif' };
      case 'DIPLOME':
        return { status: 'info', label: 'Diplômé' };
      case 'ABANDONNE':
        return { status: 'danger', label: 'Abandonné' };
      default:
        return { status: 'neutral', label: statut || 'Indéfini' };
    }
  }
}