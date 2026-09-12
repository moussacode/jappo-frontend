import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { DatePipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';

import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';
import { Mission, StatutMission } from '../../../../core/models/mission.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';
import { EntityCardComponent } from "../../../../shared/components/entity-card/entity-card.component";

export type FiltreStatutEntrepreneur = 'TOUTES' | 'EN_COURS' | 'A_REVOIR' | 'VALIDEE';

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    BadgeComponent,
    Icon,
    DatePipe,
    CardComponent,
    PageHeaderComponent,
    TabFilterComponent,
    EntityCardComponent
],
  templateUrl: './missions-list.html',
  styleUrl: './missions-list.css',
})
export class MissionsList implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal<boolean>(true);
  protected readonly allMissions = signal<Mission[]>([]);
  protected readonly filtreStatut = signal<FiltreStatutEntrepreneur>('TOUTES');

  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerm = signal('');

  // Compteurs dynamiques pour les onglets
  protected readonly compteEnCours = computed(() =>
    this.allMissions().filter((m) => m.statut === 'EN_COURS' || m.statut === 'A_FAIRE').length
  );

  protected readonly compteARevoir = computed(() =>
    this.allMissions().filter((m) => m.statut === 'SOUMIS' || m.statut === 'A_CORRIGER' ).length
  );

  protected readonly compteValidees = computed(() =>
    this.allMissions().filter((m) => m.statut === 'VALIDEE' || (m.statut as string) === 'VALIDE').length
  );

  // Configuration des onglets avec compteurs unifiés
  protected readonly optionsFiltreStatut = computed<TabOption<FiltreStatutEntrepreneur>[]>(() => [
    { value: 'TOUTES', label: 'Toutes', count: this.allMissions().length },
    { value: 'EN_COURS', label: 'En cours', count: this.compteEnCours() },
    { value: 'A_REVOIR', label: 'À réviser', count: this.compteARevoir() },
    { value: 'VALIDEE', label: 'Validées', count: this.compteValidees() },
  ]);

  // Filtrage combiné (Statut + Recherche par mot-clé)
  protected readonly missionsFiltrees = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const filtre = this.filtreStatut();
    let liste = this.allMissions();

    if (filtre === 'EN_COURS') {
      liste = liste.filter((m) => m.statut === 'EN_COURS' || m.statut === 'A_FAIRE');
    } else if (filtre === 'A_REVOIR') {
      liste = liste.filter((m) => m.statut === 'SOUMIS' || m.statut === 'A_CORRIGER' );
    } else if (filtre === 'VALIDEE') {
      liste = liste.filter((m) => m.statut === 'VALIDEE' || (m.statut as string) === 'VALIDE');
    }

    if (term) {
      liste = liste.filter(
        (m) =>
          m.titre.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term) ||
          m.nomCohorte?.toLowerCase().includes(term)
      );
    }

    return liste;
  });

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerm.set(val));

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .pipe(
        switchMap((projet) => {
          if (!projet?.id) return of([]);
          return this.missionService.getByProjet(projet.id);
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (missions) => {
          this.allMissions.set(missions ?? []);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des missions:', err);
          this.loading.set(false);
        },
      });
  }

  protected statutBadge(statut: string | undefined): { status: BadgeStatus; label: string } {
    if (!statut) {
      return { status: 'neutral', label: 'Non définie' };
    }
    const config = (STATUT_MISSION_CONFIG as Record<string, { status: BadgeStatus; label: string }>)[statut];
    return config ?? { status: 'neutral', label: statut };
  }
}