import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// Services & Modèles
import { EntrepreneurService, EntrepreneurResponse } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { Entrepreneur, Projet } from '../../../../core/models';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { AvatarComponent } from '../../../../shared/components/avatar/avatar.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ViewSwitcherComponent } from '../../../../shared/components/view-switcher/view-switcher.component';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";

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
  imports: [
    RouterLink,
    ReactiveFormsModule,
    Icon,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    AvatarComponent,
    ButtonComponent,
    EmptyStateComponent,
    ViewSwitcherComponent,
    TabFilterComponent,
    EntityCardComponent
],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page -->
      <app-page-header
        title="Entrepreneurs"
        [subtitle]="
          isLoading()
            ? 'Chargement de la promotion...'
            : compteActifs() + ' actif(s) sur ' + toutesLesLignes().length + ' membre(s)'
        "
      >
        <!-- Switcher Grille / Liste -->
        <app-view-switcher
          [mode]="vueMode()"
          tableIcon="entrepreneurs"
          (modeChange)="vueMode.set($event)"
        />

        <a routerLink="/incubateur/entrepreneurs/inviter">
          <app-button size="sm">
            <app-icon name="plus" class="size-4" />
            <span class="hidden sm:inline">Inviter des entrepreneurs</span>
          </app-button>
        </a>
      </app-page-header>

      <!-- Barre de contrôles : Filtres Statuts + Recherche -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        <!-- Onglets par Statut (Composant unifié app-tab-filter) -->
        <app-tab-filter
          [options]="optionsFiltreStatut()"
          [value]="filtreStatut()"
          (valueChange)="filtreStatut.set($event)"
        />

        <!-- Recherche réactive -->
        <div class="relative w-full sm:w-72">
          <input
            type="text"
            [formControl]="searchControl"
            placeholder="Rechercher par nom, email, projet..."
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- VUES DE DONNÉES -->
      @if (isLoading()) {
        <!-- Skeleton Loader -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <app-card padding="md" class="animate-pulse">
              <div class="flex items-center gap-3">
                <div class="size-10 rounded-xl bg-line"></div>
                <div class="flex-1 flex flex-col gap-1.5">
                  <div class="h-4 w-3/4 rounded bg-line"></div>
                  <div class="h-3 w-1/2 rounded bg-line/60"></div>
                </div>
              </div>
              <div class="h-12 w-full rounded-lg bg-line/40 mt-4"></div>
            </app-card>
          }
        </div>
      } @else {

        <!-- VUE 1 : GRILLE DE CARTES -->
      
        @if (vueMode() === 'grid') {
          <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            @for (ligne of lignesFiltrees(); track ligne.entrepreneur.id) {
              <app-entity-card
                [title]="afficherNom(ligne.entrepreneur)"
                
                [routerLink]="['/incubateur/entrepreneurs', ligne.entrepreneur.id]"
                [badgeLabel]="estMembreActif(ligne.statutInvitation) ? 'Actif' : 'En attente'"
                [badgeStatus]="estMembreActif(ligne.statutInvitation) ? 'success' : 'warning'"
              >
                <!-- Corps de la carte : Projet & Cohorte -->
                <div card-body class="flex flex-col gap-1.5 text-xs">
                  <div class="flex items-center justify-between min-w-0 gap-2">
                    <span class="text-ink-muted shrink-0">Projet :</span>
                    <span class="font-semibold text-ink truncate">{{ ligne.projet?.nom || '—' }}</span>
                  </div>
                  <div class="flex items-center justify-between min-w-0 gap-2">
                    <span class="text-ink-muted shrink-0">Cohorte :</span>
                    <span class="font-medium text-ink truncate">{{ ligne.nomCohorte }}</span>
                  </div>
                </div>

                <!-- Pied de carte : Score de maturité -->
                <div card-footer class="w-full flex items-center justify-between text-xs">
                  <span class="font-medium text-ink-muted">Score de maturité</span>
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                      <div 
                        class="h-full rounded-full bg-accent transition-all duration-300" 
                        [style.width.%]="ligne.projet?.scoreMaturite || 0"
                      ></div>
                    </div>
                    <span class="font-bold text-ink">{{ ligne.projet?.scoreMaturite || 0 }}%</span>
                  </div>
                </div>
              </app-entity-card>
            } @empty {
              <div class="col-span-full">
                <app-empty-state
                  title="Aucun entrepreneur trouvé"
                  description="Ajustez votre recherche ou votre filtre de statut pour voir plus de résultats."
                  iconName="entrepreneurs"
                >
                  <a routerLink="/incubateur/entrepreneurs/inviter">
                    <app-button size="xs">
                      <app-icon name="plus" class="size-3.5" />
                      <span>Inviter un entrepreneur</span>
                    </app-button>
                  </a>
                </app-empty-state>
              </div>
            }
          </div>
        }

        <!-- VUE 2 : TABLEAU LISTE NOTION -->
        @if (vueMode() === 'table') {
          <app-card padding="none" class="w-full min-w-0">
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
                          <app-avatar [initials]="initiales(ligne.entrepreneur)" size="sm" />
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
                      <td colspan="5" class="p-8">
                        <app-empty-state
                          title="Aucun entrepreneur trouvé"
                          description="Ajustez votre recherche ou votre filtre de statut pour voir plus de résultats."
                          iconName="entrepreneurs"
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
  `,
})
export class EntrepreneursList implements OnInit {
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly vueMode = signal<VueMode>('grid');
  protected readonly filtreStatut = signal<FiltreStatut>('ACTIFS');
  protected readonly isLoading = signal<boolean>(true);
  protected readonly toutesLesLignes = signal<LigneEntrepreneur[]>([]);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  protected estMembreActif(statut: string): boolean {
    const s = statut?.toUpperCase();
    return s === 'ACCEPTE' || s === 'ACTIF';
  }

  protected readonly compteActifs = computed(() =>
    this.toutesLesLignes().filter((l) => this.estMembreActif(l.statutInvitation)).length
  );

  protected readonly compteEnAttente = computed(() =>
    this.toutesLesLignes().filter((l) => !this.estMembreActif(l.statutInvitation)).length
  );

  // Computed pour alimenter de manière réactive le composant app-tab-filter
  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatut>[]>(() => [
    { value: 'ACTIFS', label: 'Actifs', count: this.compteActifs() },
    { value: 'EN_ATTENTE', label: 'Invitations en attente', count: this.compteEnAttente() },
    { value: 'TOUS', label: 'Tous', count: this.toutesLesLignes().length },
  ]);

  protected readonly lignesFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let lignes = this.toutesLesLignes();

    if (filtre === 'ACTIFS') {
      lignes = lignes.filter((l) => this.estMembreActif(l.statutInvitation));
    } else if (filtre === 'EN_ATTENTE') {
      lignes = lignes.filter((l) => !this.estMembreActif(l.statutInvitation));
    }

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