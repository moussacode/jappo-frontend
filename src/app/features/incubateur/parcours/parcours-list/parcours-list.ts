import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, concatMap, switchMap, toArray } from 'rxjs/operators';
import { Observable, forkJoin, from, of } from 'rxjs';

import { ParcoursService } from '../../../../core/services/parcours.service';
import { Parcours, Phase, CreateParcoursRequest } from '../../../../core/models/cohorte.model';
import { StructureContextService } from '../../../../core/services/structure-context.service';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { ErrorState } from '../../../../shared/components/error-state/error-state';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

interface ParcoursAffiche {
  parcours: Parcours;
  phases: Phase[];
}

type FiltreStatut = 'ACTIFS' | 'ARCHIVES' | 'TOUS';

const parOrdre = (a: { ordre?: number | null }, b: { ordre?: number | null }) =>
  (a.ordre ?? 0) - (b.ordre ?? 0);

@Component({
  selector: 'app-parcours-list',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Icon,
    ButtonComponent,
    PageHeaderComponent,
    EmptyStateComponent,
    CardComponent,
    BadgeComponent,
    TabFilterComponent,
    ErrorState,
    ModalComponent,
  ],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      <!-- En-tête Page -->
      <app-page-header
        title="Parcours d'accompagnement"
        subtitle="Définissez les phases de progression de vos entrepreneurs."
      >
        @if (isAdmin()) {
          <app-button size="sm" (click)="ouvrirEditeur(null)">
            <app-icon name="plus" class="size-4 mr-1.5" />
            <span>Nouveau parcours</span>
          </app-button>
        }
      </app-page-header>

      @if (erreurAction()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ erreurAction() }}</span>
        </div>
      }

      <!-- Barre de contrôles : Filtres Statuts + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <app-tab-filter
          [options]="optionsFiltreStatut()"
          [value]="filtreStatut()"
          (valueChange)="filtreStatut.set($event)"
        />

        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher un parcours..."
            class="w-full rounded-xl border border-line/60 bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- VUES DE DONNÉES -->
      @if (erreur()) {
        <app-error-state (retry)="charger()" />
      } @else if (chargement()) {
        <div class="flex flex-col gap-3">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="h-16 w-full animate-pulse rounded-2xl border border-line/60 bg-surface-muted/30"></div>
          }
        </div>
      } @else if (parcours().length === 0) {
        <app-card padding="none" >
          <div class="p-8 sm:p-12">
            <app-empty-state
              title="Aucun parcours configuré"
              description="Créez un parcours personnalisé pour suivre vos cohortes."
              iconName="documents"
            >
              @if (isAdmin()) {
                <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <app-button size="sm" (click)="ouvrirEditeur(null)">
                    <app-icon name="plus" class="size-4 mr-1.5" />
                    <span>Créer de zéro</span>
                  </app-button>
                </div>
              }
            </app-empty-state>
          </div>
        </app-card>
      } @else {
        <!-- TABLEAU DES PARCOURS -->
        <app-card padding="none" class="w-full min-w-0  ">
          <div class="w-full overflow-x-auto custom-scrollbar">
            <table class="w-full min-w-[800px] table-fixed border-collapse text-left text-xs">
              <thead>
                <tr class="border-b border-line/60 bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                  <th class="w-3/12 px-5 py-3.5">Parcours</th>
                  <th class="w-5/12 px-5 py-3.5">Configuration des phases</th>
                  <th class="w-2/12 px-5 py-3.5">Statut</th>
                  <th class="w-2/12 px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-line/60">
                @for (item of parcoursAffiches(); track item.parcours.id) {
                  <tr class="group transition-colors hover:bg-surface-muted/40" [class.opacity-60]="item.parcours.archive">

                    <td class="px-5 py-4">
                      <div class="flex items-start gap-3 min-w-0">
                        <div class="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent border border-accent/20">
                          <app-icon name="documents" class="size-4" />
                        </div>
                        <div class="flex min-w-0 flex-col">
                          <span class="truncate text-xs font-bold text-ink">{{ item.parcours.nom }}</span>
                          @if (item.parcours.description) {
                            <span class="truncate text-[11px] text-ink-muted mt-0.5" [title]="item.parcours.description">
                              {{ item.parcours.description }}
                            </span>
                          }
                          <span class="text-[10px] text-ink-muted mt-1 font-medium">
                            {{ item.phases.length }} phase(s)
                          </span>
                        </div>
                      </div>
                    </td>

                    <td class="px-5 py-4">
                      <div class="flex flex-wrap items-center gap-1.5">
                        @for (ph of item.phases; track ph.id; let last = $last) {
                          <div class="flex items-center gap-1.5">
                            <span
                              class="whitespace-nowrap rounded-lg border border-line/60 bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-muted transition-colors group-hover:border-line"
                              [class.opacity-60]="ph.archive"
                            >
                              {{ ph.nom }}
                            </span>
                            @if (!last) {
                              <app-icon name="chevron-right" class="size-3 text-line" />
                            }
                          </div>
                        }
                        @if (item.phases.length === 0) {
                          <span class="text-[11px] italic text-ink-muted">Aucune phase configurée</span>
                        }
                      </div>
                    </td>

                    <td class="px-5 py-4 whitespace-nowrap">
                      @if (item.parcours.archive) {
                        <app-badge status="neutral" size="sm">Archivé</app-badge>
                      } @else {
                        <app-badge status="success" size="sm">Actif</app-badge>
                      }
                    </td>

                    <td class="px-5 py-4 text-right whitespace-nowrap">
                      @if (isAdmin()) {
                        <div class="flex items-center justify-end gap-2">
                          <app-button variant="secondary" size="sm" (click)="ouvrirEditeur(item.parcours)" title="Modifier">
                            <app-icon name="edit" class="size-3.5 mr-1" /> Modifier
                          </app-button>

                          @if (!item.parcours.archive) {
                            <app-button variant="secondary" size="sm" (click)="archiver(item.parcours.id)" title="Archiver">
                              <app-icon name="archive" class="size-3.5 text-rose-600" />
                            </app-button>
                          }
                        </div>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="4" class="p-8">
                      <app-empty-state
                        title="Aucun parcours trouvé"
                        description="Ajustez vos filtres ou votre recherche."
                        iconName="search"
                      />
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </app-card>
      }
    </div>

    <!-- ÉDITEUR -->
    @if (editeurOuvert()) {
      <app-modal
        [title]="parcoursCourant() ? 'Modifier le parcours' : 'Nouveau parcours'"
        subtitle="Choisissez et ordonnez les phases de la bibliothèque"
        maxWidth="2xl"
        (close)="fermerEditeur()"
      >
        <div class="space-y-6">

          <!-- Infos générales -->
          <div class="space-y-4">
            <div class="flex flex-col gap-1.5">
              <label for="parcours-nom" class="text-xs font-bold text-ink">Nom du parcours <span class="text-rose-500">*</span></label>
              <input
                id="parcours-nom"
                type="text"
                placeholder="Ex. Programme d'Accélération 2026"
                [ngModel]="nomEdit()"
                (ngModelChange)="nomEdit.set($event)"
                [class]="tentative() && !nomEdit().trim() ? 'border-rose-500 focus:border-rose-500' : 'border-line/60 focus:border-accent'"
                class="w-full rounded-xl border bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:outline-none transition-colors"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label for="parcours-desc" class="text-xs font-bold text-ink">Description</label>
              <textarea
                id="parcours-desc"
                rows="2"
                placeholder="Description optionnelle..."
                [ngModel]="descEdit()"
                (ngModelChange)="descEdit.set($event)"
                class="w-full resize-none rounded-xl border border-line/60 bg-surface px-3 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
              ></textarea>
            </div>
          </div>

          <!-- Phases -->
          <div class="space-y-3">
            <div class="border-t border-line/60 pt-4">
              <h3 class="text-xs font-extrabold uppercase tracking-wider text-ink-muted">Phases du parcours</h3>
            </div>

            <!-- Ajouter une phase existante -->
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                aria-label="Phase existante"
                [ngModel]="phaseAChoisir()"
                (ngModelChange)="phaseAChoisir.set($event)"
                class="min-w-0 flex-1 rounded-xl border border-line/60 bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Choisir une phase existante…</option>
                @for (p of phasesDisponibles(); track p.id) {
                  <option [value]="p.id">{{ p.nom }}</option>
                }
              </select>
              <app-button variant="secondary" size="sm" [disabled]="!phaseAChoisir()" (click)="ajouterPhaseExistante()">
                <app-icon name="plus" class="size-3.5 mr-1" /> Ajouter
              </app-button>
            </div>

            <!-- Créer une nouvelle phase dans la bibliothèque -->
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                aria-label="Nom de la nouvelle phase"
                placeholder="Ou créer une nouvelle phase (ex: Pré-incubation)"
                [ngModel]="nouvellePhaseNom()"
                (ngModelChange)="nouvellePhaseNom.set($event)"
                (keydown.enter)="creerEtAjouterPhase()"
                class="min-w-0 flex-1 rounded-xl border border-line/60 bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
              />
              <app-button
                variant="secondary"
                size="sm"
                [disabled]="!nouvellePhaseNom().trim() || creationPhase()"
                (click)="creerEtAjouterPhase()"
              >
                {{ creationPhase() ? 'Création…' : 'Créer et ajouter' }}
              </app-button>
            </div>

            @if (phasesEdit().length === 0) {
              <p class="rounded-xl border border-dashed border-line/60 bg-surface-muted/30 py-8 text-center text-xs text-ink-muted">
                Ce parcours n'a aucune phase. Ajoutez-en depuis la bibliothèque ci-dessus.
              </p>
            }

            <div class="space-y-2 max-h-[40vh] overflow-y-auto custom-scrollbar pr-1">
              @for (phase of phasesEdit(); track phase.id; let i = $index) {
                <div class="flex items-center gap-2 rounded-xl border border-line/60 bg-surface px-3 py-2.5 sm:gap-3 sm:px-4">
                  <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">
                    {{ i + 1 }}
                  </span>
                  <div class="flex min-w-0 flex-1 flex-col">
                    <span class="truncate text-xs font-semibold text-ink">
                      {{ phase.nom }}
                      @if (phase.archive) {
                        <span class="ml-1 text-[10px] font-medium text-ink-muted">(archivée)</span>
                      }
                    </span>
                    @if (phase.description) {
                      <span class="truncate text-[11px] text-ink-muted" [title]="phase.description">{{ phase.description }}</span>
                    }
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      (click)="deplacerPhase(i, -1)"
                      [disabled]="i === 0"
                      title="Monter"
                      aria-label="Monter la phase"
                      class="rounded p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    >
                      <app-icon name="chevron-up" class="size-4" />
                    </button>
                    <button
                      type="button"
                      (click)="deplacerPhase(i, 1)"
                      [disabled]="i === phasesEdit().length - 1"
                      title="Descendre"
                      aria-label="Descendre la phase"
                      class="rounded p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink disabled:opacity-30 cursor-pointer"
                    >
                      <app-icon name="chevron-down" class="size-4" />
                    </button>
                    <button
                      type="button"
                      (click)="retirerPhase(i)"
                      title="Retirer du parcours (la phase reste dans la bibliothèque)"
                      aria-label="Retirer la phase du parcours"
                      class="rounded p-1 text-ink-muted transition-colors hover:bg-rose-500/10 hover:text-rose-600 cursor-pointer"
                    >
                      <app-icon name="x" class="size-4" />
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>

          @if (erreurEditeur()) {
            <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
              <app-icon name="warning" class="size-4 shrink-0" />
              <span>{{ erreurEditeur() }}</span>
            </div>
          }

          <div class="flex items-center justify-end gap-3 border-t border-line/60 pt-4 mt-2">
            <app-button variant="secondary" size="sm" (click)="fermerEditeur()">Annuler</app-button>
            <app-button size="sm" [disabled]="sauvegarde()" (click)="sauvegarder()">
              {{ sauvegarde() ? 'Enregistrement…' : 'Enregistrer le parcours' }}
            </app-button>
          </div>
        </div>
      </app-modal>
    }
  `,
})
export class ParcoursList implements OnInit {
  private readonly parcoursService = inject(ParcoursService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly destroyRef = inject(DestroyRef);

  // -- Liste --
  protected readonly parcours = signal<Parcours[]>([]);
  protected readonly chargement = signal(true);
  protected readonly erreur = signal<string | null>(null);
  protected readonly erreurAction = signal<string | null>(null);

  // -- Filtres & Recherche --
  protected readonly filtreStatut = signal<FiltreStatut>('ACTIFS');
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  protected readonly isAdmin = computed(() => this.structureCtx.activeRole() === 'ADMIN_STRUCTURE');

  protected readonly compteActifs = computed(() => this.parcours().filter((p) => !p.archive).length);
  protected readonly compteArchives = computed(() => this.parcours().filter((p) => p.archive).length);

  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatut>[]>(() => [
    { value: 'ACTIFS', label: 'Actifs', count: this.compteActifs() },
    { value: 'ARCHIVES', label: 'Archivés', count: this.compteArchives() },
    { value: 'TOUS', label: 'Tous', count: this.parcours().length },
  ]);

  protected readonly parcoursAffiches = computed<ParcoursAffiche[]>(() => {
    let list = this.parcours();
    const filtre = this.filtreStatut();
    const term = this.searchTerm().trim().toLowerCase();

    if (filtre === 'ACTIFS') list = list.filter((p) => !p.archive);
    else if (filtre === 'ARCHIVES') list = list.filter((p) => p.archive);

    if (term) {
      list = list.filter(
        (p) => p.nom.toLowerCase().includes(term) || p.description?.toLowerCase().includes(term),
      );
    }

    // L'ordre vient de ParcoursPhase, exposé via PhaseResponse.ordre
    return list.map((parcours) => ({
      parcours,
      phases: [...(parcours.phases ?? [])].sort(parOrdre),
    }));
  });

  // -- Éditeur (Modale) --
  protected readonly editeurOuvert = signal(false);
  protected readonly parcoursCourant = signal<Parcours | null>(null);
  protected readonly nomEdit = signal('');
  protected readonly descEdit = signal('');
  protected readonly phasesEdit = signal<Phase[]>([]);
  protected readonly sauvegarde = signal(false);
  protected readonly tentative = signal(false);
  protected readonly erreurEditeur = signal<string | null>(null);

  // -- Bibliothèque de phases --
  protected readonly bibliothequePhases = signal<Phase[]>([]);
  protected readonly phaseAChoisir = signal('');
  protected readonly nouvellePhaseNom = signal('');
  protected readonly creationPhase = signal(false);

  protected readonly phasesDisponibles = computed(() => {
    const selectionnees = new Set(this.phasesEdit().map((p) => p.id));
    return this.bibliothequePhases().filter((p) => !selectionnees.has(p.id));
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    this.charger();
  }

  protected onEscape(): void {
    if (this.editeurOuvert()) this.fermerEditeur();
  }

  protected charger(): void {
    this.chargement.set(true);
    this.erreur.set(null);
    this.parcoursService
      .getAllParcours()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.parcours.set(data);
          this.chargement.set(false);
        },
        error: () => {
          this.erreur.set('Impossible de charger les parcours.');
          this.chargement.set(false);
        },
      });
  }

  protected archiver(id: string): void {
    if (!confirm('Archiver ce parcours ?')) return;
    this.erreurAction.set(null);
    this.parcoursService
      .archiverParcours(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () =>
          this.parcours.update((list) => list.map((p) => (p.id === id ? { ...p, archive: true } : p))),
        error: (err) => this.erreurAction.set(err?.error?.message ?? "Erreur lors de l'archivage."),
      });
  }

  // --- ÉDITEUR : ouverture / fermeture ---

  protected ouvrirEditeur(p: Parcours | null): void {
    this.parcoursCourant.set(p);
    this.nomEdit.set(p?.nom ?? '');
    this.descEdit.set(p?.description ?? '');
    this.tentative.set(false);
    this.erreurEditeur.set(null);
    this.phaseAChoisir.set('');
    this.nouvellePhaseNom.set('');
    this.phasesEdit.set([...(p?.phases ?? [])].sort(parOrdre));
    this.chargerBibliotheque();
    this.editeurOuvert.set(true);
  }

  protected fermerEditeur(): void {
    this.editeurOuvert.set(false);
    this.parcoursCourant.set(null);
    this.erreurEditeur.set(null);
  }

  private chargerBibliotheque(): void {
    this.parcoursService
      .getPhasesActives()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (phases) => this.bibliothequePhases.set(phases),
        error: () => this.erreurEditeur.set('Impossible de charger la bibliothèque de phases.'),
      });
  }

  // --- ÉDITEUR : phases ---

  protected ajouterPhaseExistante(): void {
    const id = this.phaseAChoisir();
    const phase = this.bibliothequePhases().find((p) => p.id === id);
    if (!phase) return;
    this.phasesEdit.update((list) => [...list, phase]);
    this.phaseAChoisir.set('');
  }

  protected creerEtAjouterPhase(): void {
    const nom = this.nouvellePhaseNom().trim();
    if (!nom || this.creationPhase()) return;

    this.creationPhase.set(true);
    this.erreurEditeur.set(null);
    this.parcoursService
      .createPhase({ nom })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (phase) => {
          this.bibliothequePhases.update((list) => [...list, phase]);
          this.phasesEdit.update((list) => [...list, phase]);
          this.nouvellePhaseNom.set('');
          this.creationPhase.set(false);
        },
        error: (err) => {
          this.creationPhase.set(false);
          this.erreurEditeur.set(err?.error?.message ?? 'Erreur lors de la création de la phase.');
        },
      });
  }

  protected retirerPhase(i: number): void {
    this.phasesEdit.update((list) => list.filter((_, idx) => idx !== i));
  }

  protected deplacerPhase(i: number, delta: -1 | 1): void {
    this.phasesEdit.update((list) => this.deplacer(list, i, delta));
  }

  private deplacer<T>(liste: T[], index: number, delta: -1 | 1): T[] {
    const cible = index + delta;
    if (cible < 0 || cible >= liste.length) return liste;
    const copie = [...liste];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    return copie;
  }

  // --- ÉDITEUR : sauvegarde ---

  protected sauvegarder(): void {
    this.tentative.set(true);
    this.erreurEditeur.set(null);

    const nom = this.nomEdit().trim();
    if (!nom) {
      this.erreurEditeur.set('Le nom du parcours est obligatoire.');
      return;
    }

    const req: CreateParcoursRequest = {
      nom,
      description: this.descEdit().trim() || undefined,
    };

    const courant = this.parcoursCourant();
    const idsInitiaux = [...(courant?.phases ?? [])].sort(parOrdre).map((p) => p.id);
    const idsFinaux = this.phasesEdit().map((p) => p.id);

    const parcours$ = courant?.id
      ? this.parcoursService.updateParcours(courant.id, req)
      : this.parcoursService.createParcours(req);

    this.sauvegarde.set(true);
    parcours$
      .pipe(
        switchMap((p) => this.synchroniserPhases(p, idsInitiaux, idsFinaux)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (p) => {
          this.parcours.update((list) =>
            courant?.id ? list.map((x) => (x.id === p.id ? p : x)) : [p, ...list],
          );
          this.sauvegarde.set(false);
          this.fermerEditeur();
        },
        error: (err) => {
          this.sauvegarde.set(false);
          this.erreurEditeur.set(err?.error?.message ?? 'Erreur lors de la sauvegarde du parcours.');
        },
      });
  }

  /**
   * Aligne les phases du parcours sur la sélection :
   * 1) retire celles en trop  2) ajoute les nouvelles (séquentiel : le back
   * calcule l'ordre = max + 1)  3) réordonne si nécessaire  4) recharge.
   */
  private synchroniserPhases(
    parcours: Parcours,
    initiaux: string[],
    finaux: string[],
  ): Observable<Parcours> {
    const aRetirer = initiaux.filter((id) => !finaux.includes(id));
    const aAjouter = finaux.filter((id) => !initiaux.includes(id));
    const memeOrdre = initiaux.length === finaux.length && initiaux.every((id, i) => id === finaux[i]);

    if (aRetirer.length === 0 && aAjouter.length === 0 && memeOrdre) {
      return of(parcours);
    }

    const parcoursId = parcours.id;

    const retraits$: Observable<unknown> = aRetirer.length
      ? forkJoin(aRetirer.map((id) => this.parcoursService.retirerPhase(parcoursId, id)))
      : of(null);

    const ajouts$ = from(aAjouter).pipe(
      concatMap((id) => this.parcoursService.ajouterPhase(parcoursId, id)),
      toArray(),
    );

    return retraits$.pipe(
      switchMap(() => ajouts$),
      // Le back exige la liste COMPLÈTE des phases (400 si vide ou incomplète)
      switchMap(() =>
        finaux.length ? this.parcoursService.reorganiserPhases(parcoursId, finaux) : of([]),
      ),
      switchMap(() => this.parcoursService.getParcoursById(parcoursId)),
    );
  }
}