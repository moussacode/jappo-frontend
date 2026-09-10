import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { Projet, Mission } from '../../../../core/models';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

@Component({
  selector: 'app-projet-detail',
  standalone: true,
  imports: [RouterLink, BadgeComponent, Icon],
  templateUrl: './projet-detail.html',
})
export class ProjetDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly projet = signal<Projet | null>(null);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.projetService
      .getById(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.projet.set(p);
          this.loading.set(false);
          // Chargement des missions associées
          this.missionService.getByProjet(p.id).subscribe((m) => this.missions.set(m));
        },
        error: (err) => {
          console.error('Erreur projet :', err);
          this.loading.set(false);
        },
      });
  }

  protected statutBadge(statut: string): { status: BadgeStatus; label: string } {
    switch (statut) {
      case 'EN_INCUBATION': return { status: 'success', label: 'En incubation' };
      case 'DIAGNOSTIC': return { status: 'info', label: 'Diagnostic' };
      default: return { status: 'neutral', label: statut };
    }
  }
}