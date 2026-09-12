import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

// Services & Modèles
import { MissionService } from '../../../../core/services/mission.service';
import { Mission, StatutMission, PrioriteMission } from '../../../../core/models/mission.model';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";
import { MissionCreateModalComponent } from "../mission-create/mission-create";

// Modale de création

export type FiltreStatutMission = 'TOUTES' | 'EN_COURS' | 'A_REVOIR' | 'VALIDEE';

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    DatePipe,
    Icon,
    BadgeComponent,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    TabFilterComponent,
    EntityCardComponent,
    MissionCreateModalComponent
],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- En-tête Page Unifié -->
      <app-page-header
        title="Missions & Jalons"
        [subtitle]="
          isLoading()
            ? 'Chargement des missions...'
            : missionsFiltrees().length + ' mission(s) affichée(s) sur ' + missions().length
        "
      >
        <!-- Déclencheur de la modale -->
        <app-button size="sm" (click)="showCreateModal.set(true)">
          <app-icon name="plus" class="size-4 text-white" />
          <span class="hidden sm:inline">Nouvelle Mission</span>
        </app-button>
      </app-page-header>

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
            placeholder="Rechercher par titre, projet, responsable..."
            class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
          />
          <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
        </div>
      </div>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (i of [1, 2, 3, 4, 5, 6]; track i) {
            <app-card padding="md" class="animate-pulse flex flex-col justify-between gap-4 h-36">
              <div class="flex items-center justify-between">
                <div class="h-4 w-1/3 rounded bg-line"></div>
                <div class="h-4 w-16 rounded-full bg-line"></div>
              </div>
              <div class="h-5 w-3/4 rounded bg-line/60"></div>
              <div class="h-4 w-1/2 rounded bg-line/40"></div>
            </app-card>
          }
        </div>
      } @else {

        <!-- LISTE EN GRILLE AVEC ENTITY-CARD -->
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          @for (m of missionsFiltrees(); track m.id) {
            <app-entity-card
              [title]="m.titre"
              [subtitle]="m.nomProjet ? ('Projet : ' + m.nomProjet) : 'Cohorte générale'"
              [routerLink]="['/incubateur/missions', m.id]"
              [badgeLabel]="formaterStatut(m.statut)"
              [badgeStatus]="badgeStatus(m.statut)"
            >
              <!-- Corps de la carte -->
              <div card-body class="flex flex-col gap-2">
                @if (m.priorite) {
                  <div class="flex items-center gap-1.5">
                    <span class="text-[11px] text-ink-muted">Priorité :</span>
                    <app-badge [status]="badgePrioriteStatus(m.priorite)" size="sm">
                      {{ m.priorite }}
                    </app-badge>
                  </div>
                }

                @if (m.description) {
                  <p class="text-xs text-ink-muted line-clamp-2 leading-relaxed">
                    {{ m.description }}
                  </p>
                } @else {
                  <p class="text-xs text-ink-muted/50 italic">Aucune description détaillée.</p>
                }
              </div>

              <!-- Pied de carte -->
              <div card-footer class="w-full flex items-center justify-between text-[11px] text-ink-muted">
                <span class="flex items-center gap-1.5">
                  <app-icon name="calendar" class="size-3.5" />
                  <span>{{ m.dateEcheance ? (m.dateEcheance | date:'dd/MM/yyyy') : 'Aucune' }}</span>
                </span>

                @if (m.nomAssigneA) {
                  <span class="font-medium text-ink truncate max-w-[120px]" [title]="m.nomAssigneA">
                    {{ m.nomAssigneA }}
                  </span>
                }
              </div>
            </app-entity-card>
          } @empty {
            <div class="col-span-full">
              <app-empty-state
                title="Aucune mission trouvée"
                description="Ajustez votre recherche ou créez une nouvelle mission pour la promotion."
                iconName="missions"
              >
                <app-button size="xs" (click)="showCreateModal.set(true)">
                  <app-icon name="plus" class="size-3.5" />
                  <span>Créer une mission</span>
                </app-button>
              </app-empty-state>
            </div>
          }
        </div>

      }

    </div>

    <!-- Modale de Création de Mission -->
    @if (showCreateModal()) {
      <app-mission-create-modal
        (close)="showCreateModal.set(false)"
        (created)="chargerMissions(); showCreateModal.set(false)"
      />
    }
  `,
})
export class MissionsList implements OnInit {
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly filtreStatut = signal<FiltreStatutMission>('TOUTES');
  protected readonly showCreateModal = signal<boolean>(false);

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  protected readonly compteEnCours = computed(() =>
    this.missions().filter((m) => m.statut === 'EN_COURS' || m.statut === 'A_FAIRE').length
  );

  protected readonly compteARevoir = computed(() =>
    this.missions().filter((m) => m.statut === 'SOUMIS' || m.statut === 'A_CORRIGER').length
  );

  protected readonly compteValidees = computed(() =>
    this.missions().filter((m) => m.statut === 'VALIDEE' || (m.statut as string) === 'VALIDE').length
  );

  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatutMission>[]>(() => [
    { value: 'TOUTES', label: 'Toutes', count: this.missions().length },
    { value: 'EN_COURS', label: 'En cours', count: this.compteEnCours() },
    { value: 'A_REVOIR', label: 'À réviser', count: this.compteARevoir() },
    { value: 'VALIDEE', label: 'Validées', count: this.compteValidees() },
  ]);

  protected readonly missionsFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let liste = this.missions();

    if (filtre === 'EN_COURS') {
      liste = liste.filter((m) => m.statut === 'EN_COURS' || m.statut === 'A_FAIRE');
    } else if (filtre === 'A_REVOIR') {
      liste = liste.filter((m) => m.statut === 'SOUMIS' || m.statut === 'A_CORRIGER');
    } else if (filtre === 'VALIDEE') {
      liste = liste.filter((m) => m.statut === 'VALIDEE' || (m.statut as string) === 'VALIDE');
    }

    if (term) {
      liste = liste.filter(
        (m) =>
          m.titre.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term) ||
          m.nomProjet?.toLowerCase().includes(term) ||
          m.nomAssigneA?.toLowerCase().includes(term)
      );
    }

    return liste;
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    this.chargerMissions();
  }

  protected chargerMissions(): void {
    this.isLoading.set(true);
    this.missionService
      .getMissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.missions.set(data);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement missions:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected badgeStatus(statut: StatutMission): BadgeStatus {
    switch (statut) {
      case 'VALIDEE':
      case 'VALIDE' as any:
        return 'success';
      case 'SOUMIS':
      case 'EN_COURS':
        return 'primary';
      case 'A_CORRIGER':
      case 'EN_RETARD':
        return 'danger';
      default:
        return 'neutral';
    }
  }

  protected formaterStatut(statut: StatutMission): string {
    switch (statut) {
      case 'VALIDEE':
      case 'VALIDE' as any:
        return 'Validée';
      case 'SOUMIS':
        return 'En revue';
      case 'EN_COURS':
        return 'En cours';
      case 'A_CORRIGER':
        return 'À corriger';
      case 'EN_RETARD':
        return 'En retard';
      default:
        return 'À faire';
    }
  }

  protected badgePrioriteStatus(priorite?: PrioriteMission): BadgeStatus {
    switch (priorite) {
      case 'URGENTE':
      case 'HAUTE':
        return 'danger';
      case 'MOYENNE':
        return 'warning';
      case 'BASSE':
      default:
        return 'neutral';
    }
  }
}