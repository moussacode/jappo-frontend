import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ProgrammeService, CreateProgrammeRequest, UpdateProgrammeRequest } from '../../../../core/services/programme.service';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { EtapeService } from '../../../../core/services/etape.service';
import { Programme, Etape } from '../../../../core/models/parcours.model';
import { Parcours } from '../../../../core/models/cohorte.model';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { INPUT_CLASS } from '../constants';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

type FiltreStatut = 'ACTIFS' | 'ARCHIVES' | 'TOUS';

interface ProgrammeStats {
  parcours: number;
  phases: number;
  etapes: number;
  parcoursSansPhase: number;
  detail: boolean; // false si parcours/étapes n'ont pas pu être chargés
}

@Component({
  selector: 'app-programmes-list',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DatePipe,
    Icon,
    ButtonComponent,
    EmptyStateComponent,
    BadgeComponent,
    TabFilterComponent,
    ModalComponent,
    PageHeaderComponent,
    CardComponent,
  ],
  host: { '(document:keydown.escape)': 'menuOuvertId.set(null)' },
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

      <app-page-header
        title="Programmes"
        subtitle="Construisez et suivez la structure d'accompagnement de votre structure."
      >
        @if (isAdmin()) {
          <app-button size="sm" (click)="ouvrirEditeur(null)">
            <app-icon name="plus" class="size-4" />
            <span>Nouveau programme</span>
          </app-button>
        }
      </app-page-header>

      @if (erreurAction()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ erreurAction() }}</span>
        </div>
      }

      <!-- Contrôles -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <app-tab-filter
          [options]="optionsFiltreStatut()"
          [value]="filtreStatut()"
          (valueChange)="onFiltreChange($event)"
        />
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [value]="recherche()"
            (input)="recherche.set($any($event.target).value)"
            placeholder="Rechercher un programme..."
            class="${INPUT_CLASS} pr-9"
          />
          <app-icon name="search" class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-16">
          <div class="h-8 w-8 animate-spin rounded-full border-4 border-accent border-t-transparent"></div>
        </div>
      } @else if (programmesFiltres().length === 0) {
        <app-empty-state
          iconName="folder"
          [title]="recherche() ? 'Aucun résultat' : 'Aucun programme'"
          [description]="recherche() ? 'Aucun programme ne correspond à votre recherche.' : 'Commencez par créer votre premier programme d\\'accompagnement.'"
        >
          @if (isAdmin() && !recherche()) {
            <app-button size="sm" (click)="ouvrirEditeur(null)">
              <app-icon name="plus" class="size-4" />
              Créer un programme
            </app-button>
          }
        </app-empty-state>
      } @else {
        <!-- Fond invisible : ferme le menu ⋯ au clic extérieur -->
        @if (menuOuvertId()) {
          <div class="fixed inset-0 z-10" (click)="menuOuvertId.set(null)"></div>
        }

        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (programme of programmesFiltres(); track programme.id) {
            @let s = stats().get(programme.id);
            <div
              class="group relative h-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-2xl"
              role="link"
              tabindex="0"
              (click)="ouvrirDetail(programme.id)"
              (keydown.enter)="ouvrirDetail(programme.id)"
            >
              <app-card padding="md" [hoverable]="true" class="flex h-full flex-col gap-4">

                <!-- En-tête -->
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0 flex-1">
                    <h3 class="truncate text-base font-semibold text-ink group-hover:text-accent transition-colors">{{ programme.nom }}</h3>
                    @if (programme.description) {
                      <p class="mt-1 line-clamp-2 text-sm text-ink-muted">{{ programme.description }}</p>
                    }
                  </div>
                  <div class="flex shrink-0 items-center gap-1.5">
                    <app-badge [status]="programme.archive ? 'warning' : 'success'" size="sm">
                      {{ programme.archive ? 'Archivé' : 'Actif' }}
                    </app-badge>

                    @if (isAdmin()) {
                      <div class="relative" (click)="$event.stopPropagation()" (keydown.enter)="$event.stopPropagation()">
                        <button
                          type="button"
                          (click)="toggleMenu(programme.id)"
                          class="flex size-7 items-center justify-center rounded-lg text-lg leading-none text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
                          aria-label="Actions du programme"
                          [attr.aria-expanded]="menuOuvertId() === programme.id"
                        >⋯</button>

                        @if (menuOuvertId() === programme.id) {
                          <div class="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-lg">
                            <button type="button" (click)="ouvrirEditeur(programme)" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted cursor-pointer">
                              <app-icon name="edit-2" class="size-4 text-ink-muted" /> Modifier
                            </button>
                            @if (programme.archive) {
                              <button type="button" (click)="restaurer(programme)" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted cursor-pointer">
                                <app-icon name="rotate-ccw" class="size-4 text-ink-muted" /> Restaurer
                              </button>
                            } @else {
                              <button type="button" (click)="demanderArchivage(programme)" class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-surface-muted cursor-pointer">
                                <app-icon name="archive" class="size-4 text-ink-muted" /> Archiver
                              </button>
                            }
                          </div>
                        }
                      </div>
                    }
                  </div>
                </div>

                <!-- Chiffres clés -->
                <div class="grid grid-cols-3 gap-2 rounded-xl border border-line bg-surface-muted/40 p-3 text-center">
                  <div>
                    <p class="text-lg font-semibold text-ink">{{ s ? s.parcours : programme.parcoursIds.length }}</p>
                    <p class="text-[11px] text-ink-muted">{{ (s ? s.parcours : programme.parcoursIds.length) > 1 ? 'Parcours' : 'Parcours' }}</p>
                  </div>
                  <div>
                    <p class="text-lg font-semibold text-ink">{{ s?.detail ? s!.phases : '—' }}</p>
                    <p class="text-[11px] text-ink-muted">{{ s?.detail && s!.phases > 1 ? 'Phases' : 'Phase' }}</p>
                  </div>
                  <div>
                    <p class="text-lg font-semibold text-ink">{{ s?.detail ? s!.etapes : '—' }}</p>
                    <p class="text-[11px] text-ink-muted">{{ s?.detail && s!.etapes > 1 ? 'Étapes' : 'Étape' }}</p>
                  </div>
                </div>

                <!-- Pied -->
                <div class="mt-auto flex items-center justify-between gap-2 text-xs text-ink-muted">
                  <span class="flex items-center gap-1.5">
                    <app-icon name="calendar" class="size-3.5" />
                    Modifié le {{ (programme.dateModification || programme.dateCreation) | date:'dd/MM/yyyy' }}
                  </span>
                  @if (s?.detail && s!.parcoursSansPhase > 0) {
                    <span class="text-amber-600">
                      {{ s!.parcoursSansPhase }} parcours sans phase
                    </span>
                  }
                </div>
              </app-card>
            </div>
          }
        </div>
      }

      <!-- Modal création / édition -->
      @if (modalOuvert()) {
        <app-modal
          [title]="programmeEnEdition() ? 'Modifier le programme' : 'Nouveau programme'"
          maxWidth="md"
          (close)="fermerModal()"
        >
          <form [formGroup]="form" (ngSubmit)="soumettre()" class="flex flex-col gap-4">
            @if (erreurModal()) {
              <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
                <app-icon name="warning" class="size-4 shrink-0" />
                <span>{{ erreurModal() }}</span>
              </div>
            }
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Nom *</label>
              <input type="text" formControlName="nom" placeholder="Ex : Pré-incubation" class="${INPUT_CLASS}" />
              @if (form.controls.nom.invalid && form.controls.nom.touched) {
                <p class="mt-1 text-xs text-rose-600">Le nom est obligatoire</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-ink">Description</label>
              <textarea formControlName="description" rows="3" placeholder="À quoi sert ce programme ?" class="${INPUT_CLASS}"></textarea>
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <app-button type="button" variant="ghost" (click)="fermerModal()">Annuler</app-button>
              <app-button type="submit" [disabled]="form.invalid || enCours()">
                {{ enCours() ? 'En cours...' : (programmeEnEdition() ? 'Enregistrer' : 'Créer') }}
              </app-button>
            </div>
          </form>
        </app-modal>
      }

      <!-- Modal confirmation archivage -->
      @if (aArchiver()) {
        <app-modal title="Archiver ce programme ?" maxWidth="sm" (close)="aArchiver.set(null)">
          <div class="flex flex-col gap-4">
            <p class="text-sm text-ink-muted">
              « {{ aArchiver()!.nom }} » ne sera plus proposé parmi les programmes actifs.
              Vous pourrez le restaurer à tout moment depuis l'onglet « Archivés ».
            </p>
            <div class="flex justify-end gap-2">
              <app-button variant="ghost" (click)="aArchiver.set(null)">Annuler</app-button>
              <app-button (click)="confirmerArchivage()">Archiver</app-button>
            </div>
          </div>
        </app-modal>
      }
    </div>
  `,
})
export class ProgrammesListComponent implements OnInit {
  private readonly programmeService = inject(ProgrammeService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly etapeService = inject(EtapeService);
  private readonly structureCtx = inject(StructureContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly programmes = signal<Programme[]>([]);
  readonly parcours = signal<Parcours[] | null>(null);
  readonly etapes = signal<Etape[] | null>(null);

  readonly loading = signal(true);
  readonly modalOuvert = signal(false);
  readonly programmeEnEdition = signal<Programme | null>(null);
  readonly aArchiver = signal<Programme | null>(null);
  readonly menuOuvertId = signal<string | null>(null);
  readonly enCours = signal(false);
  readonly erreurAction = signal<string | null>(null);
  readonly erreurModal = signal<string | null>(null);
  readonly filtreStatut = signal<FiltreStatut>('ACTIFS');
  readonly recherche = signal('');

  readonly form = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(150)] }),
    description: new FormControl('', { nonNullable: true }),
  });

  readonly isAdmin = computed(() => this.structureCtx.activeRole() === 'ADMIN_STRUCTURE');

  /** Statistiques calculées à partir des données existantes (aucune API ajoutée). */
  readonly stats = computed(() => {
    const result = new Map<string, ProgrammeStats>();
    const tousParcours = this.parcours();
    const toutesEtapes = this.etapes();

    for (const prog of this.programmes()) {
      const detail = tousParcours !== null && toutesEtapes !== null;
      if (!detail) {
        result.set(prog.id, { parcours: prog.parcoursIds.length, phases: 0, etapes: 0, parcoursSansPhase: 0, detail: false });
        continue;
      }

      const parcoursProg = tousParcours!.filter(p => prog.parcoursIds.includes(p.id) && !p.archive);
      const phaseIds = new Set<string>();
      let sansPhase = 0;
      for (const p of parcoursProg) {
        const phasesActives = (p.phases ?? []).filter(ph => !ph.archive);
        if (phasesActives.length === 0) sansPhase++;
        phasesActives.forEach(ph => phaseIds.add(ph.id));
      }
      const nbEtapes = toutesEtapes!.filter(e => !e.archive && phaseIds.has(e.phaseId)).length;

      result.set(prog.id, {
        parcours: parcoursProg.length,
        phases: phaseIds.size,
        etapes: nbEtapes,
        parcoursSansPhase: sansPhase,
        detail: true,
      });
    }
    return result;
  });

  readonly optionsFiltreStatut = computed<TabOption[]>(() => {
    const liste = this.programmes();
    return [
      { label: 'Actifs', value: 'ACTIFS', count: liste.filter(p => !p.archive).length },
      { label: 'Archivés', value: 'ARCHIVES', count: liste.filter(p => p.archive).length },
      { label: 'Tous', value: 'TOUS', count: liste.length },
    ];
  });

  readonly programmesFiltres = computed(() => {
    const statut = this.filtreStatut();
    const terme = this.recherche().trim().toLowerCase();

    return this.programmes().filter(p => {
      const matchStatut =
        statut === 'TOUS' || (statut === 'ACTIFS' && !p.archive) || (statut === 'ARCHIVES' && p.archive);
      const matchRecherche =
        !terme ||
        p.nom.toLowerCase().includes(terme) ||
        (p.description?.toLowerCase().includes(terme) ?? false);
      return matchStatut && matchRecherche;
    });
  });

  ngOnInit(): void {
    this.charger();

    
  }
onFiltreChange(value: string): void {
  this.filtreStatut.set(value as FiltreStatut);
}
  charger(): void {
    this.loading.set(true);
    forkJoin({
      programmes: this.programmeService.getAllProgrammes(),
      // Si ces deux appels échouent, la liste reste affichée (sans le détail des chiffres).
      parcours: this.parcoursService.getAllParcours().pipe(catchError(() => of(null))),
      etapes: this.etapeService.getAllEtapes().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ programmes, parcours, etapes }) => {
          this.programmes.set(programmes);
          this.parcours.set(parcours);
          this.etapes.set(etapes);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.erreurAction.set('Impossible de charger les programmes.');
        },
      });
  }

  toggleMenu(id: string): void {
    this.menuOuvertId.set(this.menuOuvertId() === id ? null : id);
  }

  ouvrirDetail(id: string): void {
    this.router.navigate(['/incubateur/programmes', id]);
  }

  ouvrirEditeur(programme: Programme | null): void {
    this.menuOuvertId.set(null);
    this.programmeEnEdition.set(programme);
    this.erreurModal.set(null);
    this.form.reset({ nom: programme?.nom ?? '', description: programme?.description ?? '' });
    this.modalOuvert.set(true);
  }

  fermerModal(): void {
    this.modalOuvert.set(false);
    this.programmeEnEdition.set(null);
    this.form.reset();
  }

  soumettre(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enCours.set(true);
    this.erreurModal.set(null);

    const { nom, description } = this.form.getRawValue();
    const request = { nom, description: description || undefined };
    const enEdition = this.programmeEnEdition();

    const operation = enEdition
      ? this.programmeService.updateProgramme(enEdition.id, request as UpdateProgrammeRequest)
      : this.programmeService.createProgramme(request as CreateProgrammeRequest);

    operation.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.enCours.set(false);
        this.fermerModal();
        this.charger();
      },
      error: (err) => {
        this.enCours.set(false);
        this.erreurModal.set(err.error?.message || 'Une erreur est survenue. Veuillez réessayer.');
      },
    });
  }

  demanderArchivage(programme: Programme): void {
    this.menuOuvertId.set(null);
    this.aArchiver.set(programme);
  }

  confirmerArchivage(): void {
    const programme = this.aArchiver();
    if (!programme) return;
    this.aArchiver.set(null);
    this.erreurAction.set(null);

    this.programmeService.archiverProgramme(programme.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.charger(),
      error: () => this.erreurAction.set("Impossible d'archiver le programme."),
    });
  }

  restaurer(programme: Programme): void {
    this.menuOuvertId.set(null);
    this.erreurAction.set(null);

    this.programmeService.restaurerProgramme(programme.id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.charger(),
      error: () => this.erreurAction.set('Impossible de restaurer le programme.'),
    });
  }
}