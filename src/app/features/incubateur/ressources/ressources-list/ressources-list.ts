import { Component, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { RessourceService } from '../../../../core/services/ressource.service';
import {
  Ressource,
  TypeRessource,
  PorteeRessource,
  TYPE_RESSOURCE_LABELS,
  TYPE_RESSOURCE_ICONS,
  PORTEE_RESSOURCE_LABELS,
  CreateRessourceRequest,
} from '../../../../core/models/ressource.model';
import { StructureContextService } from '../../../../core/services/structure-context.service';

import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { TabFilterComponent } from '../../../../shared/components/tab-filter/tab-filter.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

type RessourceTab = 'ACTIVE' | 'ARCHIVEE';
type CreationMode = 'LIEN' | 'FICHIER';

@Component({
  selector: 'app-ressources-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    Icon,
    BadgeComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    ModalComponent,
    TabFilterComponent,
    CardComponent
  ],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page -->
      <app-page-header
        title="Gestion des Ressources"
        subtitle="Partagez et gérez les documents, liens et outils pour votre structure."
        breadcrumb="Incubateur > Ressources"
      >
        <app-button size="sm" (click)="ouvrirCreation()">
          <app-icon name="plus" class="size-4 mr-1.5" />
          <span>Ajouter une ressource</span>
        </app-button>
      </app-page-header>

      @if (saveError()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ saveError() }}</span>
        </div>
      }

      <!-- Barre de contrôles : Onglets (Actives / Archivées) + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-2">
          <app-button 
            [variant]="activeTab() === 'ACTIVE' ? 'primary' : 'secondary'" 
            size="xs" 
            (click)="switchTab('ACTIVE')"
          >
            Actives ({{ stats().total }})
          </app-button>
          <app-button 
            [variant]="activeTab() === 'ARCHIVEE' ? 'primary' : 'secondary'" 
            size="xs" 
            (click)="switchTab('ARCHIVEE')"
          >
            Archivées
          </app-button>
        </div>

        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par titre, description..."
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- LISTE / TABLEAU DES RESSOURCES -->
      @if (isLoading()) {
        <div class="flex flex-col gap-3">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-16 w-full animate-pulse rounded-xl bg-surface-muted border border-line"></div>
          }
        </div>
      } @else {
        <app-card padding="none" class="w-full min-w-0">
          <div class="w-full overflow-x-auto custom-scrollbar">
            <table class="w-full min-w-[700px] table-fixed border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-line bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                  <th class="w-4/12 px-5 py-3.5">Ressource</th>
                  <th class="w-2/12 px-5 py-3.5">Type</th>
                  <th class="w-2/12 px-5 py-3.5">Portée</th>
                  <th class="w-2/12 px-5 py-3.5">Date</th>
                  <th class="w-2/12 px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line">
                @for (r of filteredRessources(); track r.id) {
                  <tr class="group transition-colors hover:bg-surface-muted/40">
                    
                    <!-- Titre & Description -->
                    <td class="px-5 py-3.5">
                      <div class="flex flex-col min-w-0">
                        <button 
                          type="button" 
                          (click)="voirRessource(r)"
                          class="truncate text-xs font-bold text-ink transition-colors group-hover:text-accent text-left bg-transparent p-0 cursor-pointer"
                        >
                          {{ r.titre }}
                        </button>
                        <span class="truncate text-[11px] text-ink-muted mt-0.5">
                          {{ r.description || 'Aucune description' }}
                        </span>
                      </div>
                    </td>

                    <!-- Type -->
                    <td class="px-5 py-3.5 whitespace-nowrap">
                      <app-badge status="neutral" size="sm">
                        {{ TYPE_LABELS[r.type] || r.type }}
                      </app-badge>
                    </td>

                    <!-- Portée -->
                    <td class="px-5 py-3.5 text-ink-muted font-medium whitespace-nowrap">
                      {{ PORTEE_LABELS[r.portee] || r.portee }}
                    </td>

                    <!-- Date -->
                    <td class="px-5 py-3.5 text-ink-muted whitespace-nowrap">
                      {{ formatDate(r.createdAt) }}
                    </td>

                    <!-- Actions CRUD -->
                    <td class="px-5 py-3.5 text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1.5">
                        @if (r.url) {
                          <app-button variant="secondary" size="xs" (click)="ouvrirUrl(r.url)" title="Ouvrir le lien">
                            <app-icon name="external-link" class="size-3.5" />
                          </app-button>
                        }
                        <app-button variant="secondary" size="xs" (click)="ouvrirEditModal(r)" title="Modifier">
                          <app-icon name="edit" class="size-3.5" />
                        </app-button>
                        
                        @if (activeTab() === 'ACTIVE') {
                          <app-button variant="secondary" size="xs" (click)="archiverRessource(r, $event)" title="Archiver">
                            <app-icon name="archive" class="size-3.5 text-rose-600" />
                          </app-button>
                        } @else {
                          <app-button variant="secondary" size="xs" (click)="restaurerRessource(r, $event)" title="Restaurer">
                            <!-- <app-icon name="refresh" class="size-3.5 text-emerald-600" /> -->
                          </app-button>
                        }
                      </div>
                    </td>

                  </tr>
                } @empty {
                  <tr>
                    <td colspan="5" class="p-12 text-center">
                      <app-empty-state
                        title="Aucune ressource trouvée"
                        description="Ajoutez des ressources ou ajustez vos filtres de recherche."
                        iconName="dashboard"
                      >
                        <app-button size="xs" (click)="ouvrirCreation()">
                          <app-icon name="plus" class="size-3.5 mr-1" />
                          <span>Ajouter une ressource</span>
                        </app-button>
                      </app-empty-state>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-card>
      }

    </div>

    <!-- MODALE DE CRÉATION (CREATE) -->
    @if (showCreateModal()) {
      <app-modal
        title="Ajouter une ressource"
        subtitle="Partagez un lien externe ou téléchargez un fichier."
        maxWidth="md"
        (close)="fermerCreation()"
      >
        <div class="space-y-4">
          <div class="flex items-center gap-2 pb-2 border-b border-line">
            <app-button 
              [variant]="creationMode() === 'LIEN' ? 'primary' : 'secondary'" 
              size="xs" 
              (click)="setCreationMode('LIEN')"
            >
              Lien web
            </app-button>
            <app-button 
              [variant]="creationMode() === 'FICHIER' ? 'primary' : 'secondary'" 
              size="xs" 
              (click)="setCreationMode('FICHIER')"
            >
              Fichier
            </app-button>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">Titre <span class="text-rose-500">*</span></label>
            <input
              type="text"
              [(ngModel)]="fTitre"
              placeholder="Titre explicite de la ressource"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">Description</label>
            <textarea
              [(ngModel)]="fDescription"
              placeholder="Description optionnelle..."
              rows="2"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none resize-none"
            ></textarea>
          </div>

          @if (creationMode() === 'LIEN') {
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-ink">URL <span class="text-rose-500">*</span></label>
              <input
                type="url"
                [(ngModel)]="fUrl"
                placeholder="https://..."
                class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-ink">Type de ressource</label>
              <select
                [(ngModel)]="fType"
                class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
              >
                @for (t of TYPES; track t) {
                  <option [value]="t">{{ TYPE_LABELS[t] || t }}</option>
                }
              </select>
            </div>
          } @else {
            <div class="flex flex-col gap-1.5">
              <label class="text-xs font-bold text-ink">Fichier <span class="text-rose-500">*</span></label>
              <input
                type="file"
                (change)="onFichierChange($event)"
                class="w-full text-xs text-ink file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-surface-muted file:text-ink hover:file:bg-line/40 cursor-pointer"
              />
              @if (fFichierNom()) {
                <span class="text-[11px] text-accent font-medium">Sélectionné : {{ fFichierNom() }}</span>
              }
            </div>
          }

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">Portée</label>
            <select
              [(ngModel)]="fPortee"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
            >
              @for (p of PORTEES; track p) {
                <option [value]="p">{{ PORTEE_LABELS[p] || p }}</option>
              }
            </select>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-line mt-4">
            <app-button variant="secondary" size="sm" (click)="fermerCreation()">Annuler</app-button>
            <app-button size="sm" [disabled]="isSaving()" (click)="sauvegarder()">
              {{ isSaving() ? 'Enregistrement...' : 'Créer' }}
            </app-button>
          </div>
        </div>
      </app-modal>
    }

    <!-- MODALE DE MODIFICATION (UPDATE) -->
    @if (showEditModal() && ressourceEnCoursEdition()) {
      <app-modal
        title="Modifier la ressource"
        subtitle="Mettez à jour les informations de la ressource."
        maxWidth="md"
        (close)="fermerEditModal()"
      >
        <div class="space-y-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">Titre <span class="text-rose-500">*</span></label>
            <input
              type="text"
              [(ngModel)]="editTitre"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">Description</label>
            <textarea
              [(ngModel)]="editDescription"
              rows="2"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none resize-none"
            ></textarea>
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-ink">URL</label>
            <input
              type="url"
              [(ngModel)]="editUrl"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none"
            />
          </div>

          @if (saveError()) {
            <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
              <app-icon name="warning" class="size-4 shrink-0" />
              <span>{{ saveError() }}</span>
            </div>
          }

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-line mt-4">
            <app-button variant="secondary" size="sm" (click)="fermerEditModal()">Annuler</app-button>
            <app-button size="sm" [disabled]="isSaving()" (click)="sauvegarderModification()">
              {{ isSaving() ? 'Enregistrement...' : 'Enregistrer' }}
            </app-button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class RessourcesList {
  private readonly ressourceService = inject(RessourceService);
  private readonly structureContext = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  // ── État ──────────────────────────────────────────────
  protected readonly isLoading = signal(true);
  protected readonly ressources = signal<Ressource[]>([]);
  protected readonly activeTab = signal<RessourceTab>('ACTIVE');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  private readonly searchTerm = signal('');

  // ── Modal création (CREATE) ────────────────────────────
  protected readonly showCreateModal = signal(false);
  protected readonly creationMode = signal<CreationMode>('LIEN');
  protected readonly isSaving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  protected readonly fTitre = signal('');
  protected readonly fDescription = signal('');
  protected readonly fUrl = signal('');
  protected readonly fType = signal<TypeRessource>('LIEN');
  protected readonly fPortee = signal<PorteeRessource>('STRUCTURE');
  protected readonly fFichier = signal<File | null>(null);
  protected readonly fFichierNom = signal('');

  // ── Modal modification (UPDATE) ────────────────────────
  protected readonly showEditModal = signal(false);
  protected readonly ressourceEnCoursEdition = signal<Ressource | null>(null);
  protected editTitre = '';
  protected editDescription = '';
  protected editUrl = '';

  // ── Modal détail ───────────────────────────────────────
  protected readonly ressourceSelectionnee = signal<Ressource | null>(null);
  protected readonly showDetailModal = signal(false);

  // ── Constantes ────────────────────────────────────────
  protected readonly TYPE_LABELS = TYPE_RESSOURCE_LABELS;
  protected readonly TYPE_ICONS = TYPE_RESSOURCE_ICONS;
  protected readonly PORTEE_LABELS = PORTEE_RESSOURCE_LABELS;

  protected readonly TYPES: TypeRessource[] = ['PDF', 'LIEN', 'DOCUMENT', 'VIDEO', 'AUTRE'];
  protected readonly PORTEES: PorteeRessource[] = ['STRUCTURE', 'COHORTE', 'PARCOURS', 'PHASE', 'MISSION'];

  // ── Computed ──────────────────────────────────────────
  protected readonly filteredRessources = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    let list = this.ressources();
    if (term) {
      list = list.filter(
        (r) =>
          r.titre.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.nomFichier?.toLowerCase().includes(term)
      );
    }
    return list;
  });

  protected readonly stats = computed(() => {
    const all = this.ressources();
    return {
      total: all.length,
      pdf: all.filter((r) => r.type === 'PDF').length,
      liens: all.filter((r) => r.type === 'LIEN').length,
      documents: all.filter((r) => r.type === 'DOCUMENT').length,
      videos: all.filter((r) => r.type === 'VIDEO').length,
    };
  });

  constructor() {
    effect(() => {
      if (this.structureContext.activeStructureId()) {
        this.loadData();
      }
    });

    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => this.searchTerm.set(v));
  }

  // ── READ ──────────────────────────────────────────────
  protected loadData(): void {
    this.isLoading.set(true);
    const archivee = this.activeTab() === 'ARCHIVEE';
    this.ressourceService
      .getAll(archivee)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.ressources.set(list);
          this.isLoading.set(false);
        },
        error: () => this.isLoading.set(false),
      });
  }

  protected switchTab(tab: RessourceTab): void {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.loadData();
  }

  // ── CREATE ────────────────────────────────────────────
  protected ouvrirCreation(): void {
    this.resetForm();
    this.showCreateModal.set(true);
  }

  protected fermerCreation(): void {
    this.showCreateModal.set(false);
    this.saveError.set(null);
  }

  protected setCreationMode(mode: CreationMode): void {
    this.creationMode.set(mode);
    this.fType.set(mode === 'LIEN' ? 'LIEN' : 'DOCUMENT');
  }

  protected onFichierChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.fFichier.set(file);
    this.fFichierNom.set(file?.name ?? '');
    if (file) {
      if (file.type.includes('pdf') || file.name.endsWith('.pdf')) {
        this.fType.set('PDF');
      } else if (file.type.includes('video')) {
        this.fType.set('VIDEO');
      } else {
        this.fType.set('DOCUMENT');
      }
      if (!this.fTitre()) {
        this.fTitre.set(file.name.replace(/\.[^/.]+$/, ''));
      }
    }
  }

  protected sauvegarder(): void {
    if (!this.fTitre().trim()) {
      this.saveError.set('Le titre est obligatoire.');
      return;
    }
    this.isSaving.set(true);
    this.saveError.set(null);

    if (this.creationMode() === 'FICHIER' && this.fFichier()) {
      this.ressourceService
        .uploadFichier(this.fFichier()!, this.fTitre().trim(), {
          description: this.fDescription() || undefined,
          portee: this.fPortee(),
        })
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (r) => this.onSauvegardeOk(r),
          error: (err) => this.onSauvegardeErr(err),
        });
    } else {
      if (!this.fUrl().trim()) {
        this.saveError.set("L'URL est obligatoire pour un lien.");
        this.isSaving.set(false);
        return;
      }
      const req: CreateRessourceRequest = {
        titre: this.fTitre().trim(),
        description: this.fDescription() || undefined,
        type: this.fType(),
        url: this.fUrl().trim(),
        portee: this.fPortee(),
      };
      this.ressourceService
        .create(req)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (r) => this.onSauvegardeOk(r),
          error: (err) => this.onSauvegardeErr(err),
        });
    }
  }

  private onSauvegardeOk(r: Ressource): void {
    this.isSaving.set(false);
    this.ressources.update((list) => [r, ...list]);
    this.fermerCreation();
  }

  private onSauvegardeErr(err: unknown): void {
    this.isSaving.set(false);
    const msg = (err as { error?: { message?: string } })?.error?.message;
    this.saveError.set(msg ?? 'Une erreur est survenue.');
  }

  // ── UPDATE ────────────────────────────────────────────
  protected ouvrirEditModal(r: Ressource): void {
    this.ressourceEnCoursEdition.set(r);
    this.editTitre = r.titre || '';
    this.editDescription = r.description || '';
    this.editUrl = r.url || '';
    this.saveError.set(null);
    this.showEditModal.set(true);
  }

  protected fermerEditModal(): void {
    this.showEditModal.set(false);
    this.ressourceEnCoursEdition.set(null);
  }

  protected sauvegarderModification(): void {
    const r = this.ressourceEnCoursEdition();
    if (!r || !this.editTitre.trim()) {
      this.saveError.set('Le titre est obligatoire.');
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    const payload = {
      titre: this.editTitre.trim(),
      description: this.editDescription.trim() || undefined,
      url: this.editUrl.trim() || undefined,
    };

    // Assure-toi que la méthode update existe dans ton service RessourceService
    this.ressourceService.update(r.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.ressources.update((list) => list.map((item) => (item.id === r.id ? updated : item)));
          this.isSaving.set(false);
          this.fermerEditModal();
        },
        error: (err) => {
          this.isSaving.set(false);
          const msg = (err as { error?: { message?: string } })?.error?.message;
          this.saveError.set(msg ?? 'Erreur lors de la mise à jour.');
        },
      });
  }

  // ── ARCHIVAGE / RESTAURATION ──────────────────────────
  protected archiverRessource(r: Ressource, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Archiver la ressource "${r.titre}" ?`)) return;
    this.ressourceService
      .archiver(r.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ressources.update((list) => list.filter((x) => x.id !== r.id)),
        error: (err) => alert(err?.error?.message ?? 'Erreur lors de l\'archivage.'),
      });
  }

  protected restaurerRessource(r: Ressource, event: Event): void {
    event.stopPropagation();
    this.ressourceService
      .restaurer(r.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ressources.update((list) => list.filter((x) => x.id !== r.id)),
        error: (err) => alert(err?.error?.message ?? 'Erreur lors de la restauration.'),
      });
  }

  // ── Détail / Helpers ──────────────────────────────────
  protected voirRessource(r: Ressource): void {
    this.ressourceSelectionnee.set(r);
    this.showDetailModal.set(true);
  }

  protected ouvrirUrl(url?: string): void {
    if (url) window.open(url, '_blank', 'noopener');
  }

  protected formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  private resetForm(): void {
    this.fTitre.set('');
    this.fDescription.set('');
    this.fUrl.set('');
    this.fType.set('LIEN');
    this.fPortee.set('STRUCTURE');
    this.fFichier.set(null);
    this.fFichierNom.set('');
    this.creationMode.set('LIEN');
    this.saveError.set(null);
  }
}