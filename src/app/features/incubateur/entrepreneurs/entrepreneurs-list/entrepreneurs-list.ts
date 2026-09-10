import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { EntrepreneurService, EntrepreneurResponse } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';

import { Entrepreneur, Projet } from '../../../../core/models';
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';

export interface LigneEntrepreneur {
  entrepreneur: Entrepreneur;
  projet?: Projet;
  nomCohorte: string;
  statutInvitation: string;
  dateInvitation?: string;
}

export type VueMode = 'grid' | 'table';
export type FiltreStatut = 'ACTIFS' | 'EN_ATTENTE' | 'TOUS';

@Component({
  selector: 'app-entrepreneurs-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, Icon, BadgeComponent],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête principal -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-xl font-bold tracking-tight text-ink sm:text-2xl">Entrepreneurs</h1>
          <p class="mt-1 text-xs text-ink-muted sm:text-sm">
            @if (isLoading()) {
              Chargement de la promotion...
            } @else {
              {{ compteActifs() }} actif(s) sur {{ toutesLesLignes().length }} membre(s)
            }
          </p>
        </div>

        <!-- Actions : Mode de vue & Invitation -->
        <div class="flex items-center gap-3">
          <!-- Switcher Grille / Liste -->
          <div class="flex items-center rounded-xl border border-line bg-surface p-1 shadow-xs">
            <button
              type="button"
              (click)="vueMode.set('grid')"
              [class]="vueMode() === 'grid' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
              class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
              title="Vue cartes"
            >
              <app-icon name="dashboard" class="size-4" />
            </button>
            <button
              type="button"
              (click)="vueMode.set('table')"
              [class]="vueMode() === 'table' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
              class="flex size-8 cursor-pointer items-center justify-center rounded-lg transition-all"
              title="Vue liste"
            >
              <app-icon name="entrepreneurs" class="size-4" />
            </button>
          </div>

          <a
            routerLink="/incubateur/entrepreneurs/inviter"
            class="inline-flex shrink-0 items-center justify-center gap-2 rounded-[var(--radius-button)] bg-action-fill px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-subtle)] transition-all hover:opacity-90 cursor-pointer"
          >
            <app-icon name="plus" class="size-4 text-white" />
            <span class="hidden sm:inline">Inviter des entrepreneurs</span>
          </a>
        </div>
      </div>

      <!-- Barre de contrôles : Filtres Statuts + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        <!-- Onglets par Statut (Actifs en priorité) -->
        <div class="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-xs font-semibold shadow-xs">
          <button
            type="button"
            (click)="filtreStatut.set('ACTIFS')"
            [class]="filtreStatut() === 'ACTIFS' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            Actifs ({{ compteActifs() }})
          </button>
          <button
            type="button"
            (click)="filtreStatut.set('EN_ATTENTE')"
            [class]="filtreStatut() === 'EN_ATTENTE' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            Invitations en attente ({{ compteEnAttente() }})
          </button>
          <button
            type="button"
            (click)="filtreStatut.set('TOUS')"
            [class]="filtreStatut() === 'TOUS' ? 'bg-action-fill text-white shadow-xs' : 'text-ink-muted hover:text-ink'"
            class="cursor-pointer rounded-lg px-3 py-1.5 transition-all"
          >
            Tous ({{ toutesLesLignes().length }})
          </button>
        </div>

        <!-- Recherche réactive -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par nom, email, projet..."
            class="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-2.5 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- VUES DE DONNÉES -->
      @if (isLoading()) {
        <!-- Skeleton Loader -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <div class="flex flex-col gap-3 rounded-[var(--radius-card-lg)] border border-line bg-surface p-5 shadow-xs animate-pulse">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-full bg-line"></div>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div class="h-4 w-3/4 rounded bg-line"></div>
                  <div class="h-3 w-1/2 rounded bg-line/60"></div>
                </div>
              </div>
              <div class="h-12 w-full rounded-lg bg-line/40 mt-2"></div>
            </div>
          }
        </div>
      } @else {

        <!-- VUE 1 : GRILLE DE CARTES -->
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (ligne of lignesFiltrees(); track ligne.entrepreneur.id) {
              <a
                [routerLink]="['/incubateur/entrepreneurs', ligne.entrepreneur.id]"
                class="group flex flex-col justify-between gap-4 rounded-[var(--radius-card-lg)] border border-line bg-surface p-5 shadow-[var(--shadow-subtle)] transition-all hover:border-accent/40  cursor-pointer"
              >
                <!-- Entête : Avatar + Identité -->
                <div class="flex items-start gap-3.5 min-w-0">
                  <div class="flex size-10 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft font-bold text-accent">
                    {{ initiales(ligne.entrepreneur) }}
                  </div>
                  <div class="flex min-w-0 flex-col">
                    <h2 class="truncate text-sm font-bold text-ink transition-colors group-hover:text-accent">
                      {{ afficherNom(ligne.entrepreneur) }}
                    </h2>
                    <span class="truncate text-xs text-ink-muted">
                      {{ ligne.entrepreneur.email }}
                    </span>
                  </div>
                </div>

                <!-- Section Informations Projet/Cohorte -->
                <div class="flex flex-col gap-2 rounded-xl border border-line bg-surface-muted/40 p-3 text-xs">
                  <div class="flex items-center justify-between">
                    <span class="text-ink-muted">Projet :</span>
                    <span class="font-semibold text-ink truncate max-w-[150px]">
                      {{ ligne.projet?.nom || '—' }}
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-ink-muted">Cohorte :</span>
                    <span class="font-medium text-ink truncate max-w-[150px]">
                      {{ ligne.nomCohorte }}
                    </span>
                  </div>
                </div>

                <!-- Pied de Carte : Statut d'invitation & Maturité -->
                <div class="flex items-center justify-between border-t border-line pt-3">
                  <app-badge [status]="estMembreActif(ligne.statutInvitation) ? 'success' : 'warning'" size="sm">
                    {{ estMembreActif(ligne.statutInvitation) ? 'Actif' : 'Invitation en attente' }}
                  </app-badge>

                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                      <div 
                        class="h-full rounded-full bg-accent transition-all duration-300" 
                        [style.width.%]="ligne.projet?.scoreMaturite || 0"
                      ></div>
                    </div>
                    <span class="text-xs font-bold text-ink">{{ ligne.projet?.scoreMaturite || 0 }}%</span>
                  </div>
                </div>
              </a>
            } @empty {
              <ng-container *ngTemplateOutlet="emptyState"></ng-container>
            }
          </div>
        }

        <!-- VUE 2 : TABLEAU LISTE NOTION -->
        @if (vueMode() === 'table') {
          <div class="w-full min-w-0 overflow-hidden rounded-[var(--radius-card-lg)] border border-line bg-surface shadow-[var(--shadow-subtle)]">
            <div class="w-full overflow-x-auto custom-scrollbar">
              <table class="w-full min-w-[700px] table-fixed border-collapse text-left text-xs">
                <thead>
                  <tr class="border-b border-line bg-surface-muted/50 font-semibold uppercase tracking-wider text-ink-muted">
                    <th class="w-4/12 px-5 py-3.5">Entrepreneur</th>
                    <th class="w-2/12 px-5 py-3.5">Projet</th>
                    <th class="w-2/12 px-5 py-3.5">Cohorte</th>
                    <th class="w-2/12 px-5 py-3.5">Statut</th>
                    <th class="w-2/12 px-5 py-3.5 text-right">Maturité</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-line">
                  @for (ligne of lignesFiltrees(); track ligne.entrepreneur.id) {
                    <tr class="group transition-colors hover:bg-surface-muted/40">
                      <!-- Entrepreneur -->
                      <td class="px-5 py-3.5">
                        <div class="flex items-center gap-3 min-w-0">
                          <div class="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-xs font-bold text-accent">
                            {{ initiales(ligne.entrepreneur) }}
                          </div>
                          <div class="flex min-w-0 flex-col">
                            <a 
                              [routerLink]="['/incubateur/entrepreneurs', ligne.entrepreneur.id]"
                              class="truncate text-xs font-bold text-ink transition-colors group-hover:text-accent"
                            >
                              {{ afficherNom(ligne.entrepreneur) }}
                            </a>
                            <span class="truncate text-[11px] text-ink-muted">
                              {{ ligne.entrepreneur.email }}
                            </span>
                          </div>
                        </div>
                      </td>

                      <!-- Projet -->
                      <td class="px-5 py-3.5 font-semibold text-ink truncate">
                        {{ ligne.projet?.nom || '—' }}
                      </td>

                      <!-- Cohorte -->
                      <td class="px-5 py-3.5 text-ink-muted font-medium truncate">
                        {{ ligne.nomCohorte }}
                      </td>

                      <!-- Statut -->
                      <td class="px-5 py-3.5 whitespace-nowrap">
                        <app-badge [status]="estMembreActif(ligne.statutInvitation) ? 'success' : 'warning'" size="sm">
                          {{ estMembreActif(ligne.statutInvitation) ? 'Actif' : 'En attente' }}
                        </app-badge>
                      </td>

                      <!-- Maturité -->
                      <td class="px-5 py-3.5 text-right whitespace-nowrap">
                        <div class="flex items-center justify-end gap-2">
                          <div class="h-1.5 w-12 overflow-hidden rounded-full bg-line">
                            <div 
                              class="h-full rounded-full bg-accent transition-all duration-300" 
                              [style.width.%]="ligne.projet?.scoreMaturite || 0"
                            ></div>
                          </div>
                          <span class="text-xs font-bold text-ink">{{ ligne.projet?.scoreMaturite || 0 }}%</span>
                        </div>
                      </td>
                    </tr>
                  } @empty {
                    <tr>
                      <td colspan="5">
                        <ng-container *ngTemplateOutlet="emptyState"></ng-container>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

      }
    </div>

    <!-- State vide -->
    <ng-template #emptyState>
      <div class="col-span-full flex flex-col items-center justify-center rounded-[var(--radius-card-lg)] border border-dashed border-line bg-surface p-12 text-center">
        <div class="flex size-12 items-center justify-center rounded-full bg-surface-muted text-ink-muted mb-3 border border-line">
          <app-icon name="entrepreneurs" class="size-6" />
        </div>
        <h2 class="text-sm font-bold text-ink">Aucun entrepreneur trouvé</h2>
        <p class="mt-1 text-xs text-ink-muted max-w-sm">
          Ajustez votre recherche ou votre filtre de statut pour voir plus de résultats.
        </p>
        <a
          routerLink="/incubateur/entrepreneurs/inviter"
          class="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
        >
          <app-icon name="plus" class="size-3.5" />
          <span>Inviter un entrepreneur</span>
        </a>
      </div>
    </ng-template>
  `,
})
export class EntrepreneursList implements OnInit {
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vueMode = signal<VueMode>('grid');
  protected readonly filtreStatut = signal<FiltreStatut>('ACTIFS'); // 🟢 Actifs par défaut
  protected readonly isLoading = signal<boolean>(true);
  protected readonly toutesLesLignes = signal<LigneEntrepreneur[]>([]);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  // Vérification universelle du statut d'acceptation
  protected estMembreActif(statut: string): boolean {
    const s = statut?.toUpperCase();
    return s === 'ACCEPTE' || s === 'ACTIF';
  }

  // Compteurs dynamiques d'onglets
  protected readonly compteActifs = computed(() =>
    this.toutesLesLignes().filter((l) => this.estMembreActif(l.statutInvitation)).length
  );

  protected readonly compteEnAttente = computed(() =>
    this.toutesLesLignes().filter((l) => !this.estMembreActif(l.statutInvitation)).length
  );

  // Filtrage et Tri optimisés
  protected readonly lignesFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let lignes = this.toutesLesLignes();

    // 1. Filtre statut
    if (filtre === 'ACTIFS') {
      lignes = lignes.filter((l) => this.estMembreActif(l.statutInvitation));
    } else if (filtre === 'EN_ATTENTE') {
      lignes = lignes.filter((l) => !this.estMembreActif(l.statutInvitation));
    }

    // 2. Filtre recherche
    if (term) {
      lignes = lignes.filter(
        (l) =>
          l.entrepreneur.nom?.toLowerCase().includes(term) ||
          l.entrepreneur.prenom?.toLowerCase().includes(term) ||
          l.entrepreneur.email?.toLowerCase().includes(term) ||
          l.projet?.nom?.toLowerCase().includes(term) ||
          l.nomCohorte.toLowerCase().includes(term)
      );
    }

    // 3. Tri (Actifs d'abord, puis ordre alphabétique)
    return [...lignes].sort((a, b) => {
      const aActif = this.estMembreActif(a.statutInvitation);
      const bActif = this.estMembreActif(b.statutInvitation);

      if (aActif !== bActif) return aActif ? -1 : 1;

      const nameA = this.afficherNom(a.entrepreneur) || a.entrepreneur.email;
      const nameB = this.afficherNom(b.entrepreneur) || b.entrepreneur.email;
      return nameA.localeCompare(nameB);
    });
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    this.chargerDonnees();
  }

  private chargerDonnees(): void {
    this.isLoading.set(true);

    forkJoin({
      entrepreneursDto: this.entrepreneurService.getEntrepreneurs().pipe(catchError(() => of([]))),
      projets: this.projetService.getProjets().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ entrepreneursDto, projets }) => {
          const projetsMap = new Map<string, Projet>();

          for (const p of projets as any[]) {
            const idEnt = p.entrepreneurId ?? p.entrepreneur?.id ?? p.userId;
            if (idEnt) {
              projetsMap.set(idEnt, p);
            }
          }

          const resultats: LigneEntrepreneur[] = (entrepreneursDto as EntrepreneurResponse[]).map((dto) => {
            const projet = projetsMap.get(dto.id);

            return {
              entrepreneur: {
                id: dto.id,
                prenom: dto.prenom,
                nom: dto.nom,
                email: dto.email,
              } as Entrepreneur,
              projet,
              nomCohorte: dto.nomCohorte || '—',
              statutInvitation: dto.statutInvitation || 'EN_ATTENTE',
              dateInvitation: dto.dateInvitation,
            };
          });

          this.toutesLesLignes.set(resultats);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement entrepreneurs:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected afficherNom(entrepreneur: Entrepreneur): string {
    const parts = [entrepreneur.prenom, entrepreneur.nom].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return entrepreneur.email.split('@')[0];
  }

  protected initiales(entrepreneur: Entrepreneur): string {
    const nomComplet = this.afficherNom(entrepreneur);
    const parts = nomComplet.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nomComplet.slice(0, 2).toUpperCase();
  }
}