import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { Mission, StatutMission } from '../../../../core/models/mission.model';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';

export type FiltreStatut = 'toutes' | StatutMission;

@Component({
  selector: 'app-missions-list',
  standalone: true,
  imports: [RouterLink, BadgeComponent, Icon, DatePipe],
  templateUrl: './missions-list.html',
  styleUrl: './missions-list.css',
})
export class MissionsList implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly allMissions = signal<Mission[]>([]);
  protected readonly filtreActif = signal<FiltreStatut>('toutes');
  protected readonly loading = signal<boolean>(true);

  protected readonly filtres: { cle: FiltreStatut; label: string }[] = [
    { cle: 'toutes', label: 'Toutes' },
    { cle: 'A_FAIRE', label: 'À faire' },
    { cle: 'EN_COURS', label: 'En cours' },
    { cle: 'EN_REVUE', label: 'En revue' },
    { cle: 'A_CORRIGER', label: 'À corriger' },
    { cle: 'VALIDEE', label: 'Validées' },
  ];

  // Calcul réactif des missions filtrées
  protected readonly missionsFiltrees = computed(() => {
    const filtre = this.filtreActif();
    const missions = this.allMissions();
    return filtre === 'toutes' ? missions : missions.filter((m) => m.statut === filtre);
  });

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.loading.set(false);
      return;
    }

    // Chaînage propre via RxJS switchMap
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
    
    // Essaye de récupérer la config prédéfinie ou applique un fallback
    const config = (STATUT_MISSION_CONFIG as Record<string, { status: BadgeStatus; label: string }>)[statut];
    
    return config ?? { status: 'neutral', label: statut };
  }
}