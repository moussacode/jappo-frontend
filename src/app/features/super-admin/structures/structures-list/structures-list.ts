import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';


import { SuperAdminStructureList } from '../../../../core/models/super-admin.models';
import { SuperAdminService } from '../../../../core/services/super-admin.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { TabFilterComponent, TabOption } from '../../../../shared/components/tab-filter/tab-filter.component';

@Component({
  selector: 'app-structures-list',
  standalone: true,
  templateUrl: './structures-list.html',
  imports: [EmptyStateComponent, BadgeComponent, ButtonComponent, Icon, TabFilterComponent],
})
export class StructuresList implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);
  private readonly router = inject(Router);

  protected readonly structures = signal<SuperAdminStructureList[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly recherche = signal('');
  protected readonly planFiltre = signal('TOUS');
  protected readonly statutFiltre = signal('TOUS');

  // Options calculées pour le TabFilter des Statuts
  protected readonly optionsFiltreStatut = computed<TabOption<string>[]>(() => {
    const all = this.structures();
    return [
      { value: 'TOUS', label: 'Tous les statuts', count: all.length },
      { value: 'ACTIVE', label: 'Actives', count: all.filter(s => s.statutStructure === 'ACTIVE').length },
      { value: 'SUSPENDUE', label: 'Suspendues', count: all.filter(s => s.statutStructure === 'SUSPENDUE').length },
    ];
  });

  // Options calculées pour le TabFilter des Plans
  protected readonly optionsFiltrePlan = computed<TabOption<string>[]>(() => {
    const all = this.structures();
    // Un onglet par plan effectif rencontré, dans l'ordre des plans.
    const plans = new Map<string, { label: string; ordre: number; count: number }>();
    for (const structure of all) {
      const plan = structure.planEffectif;
      if (!plan) continue;
      const entree = plans.get(plan.code) ?? { label: plan.libelle, ordre: plan.ordre, count: 0 };
      entree.count++;
      plans.set(plan.code, entree);
    }
    return [
      { value: 'TOUS', label: 'Tous les plans', count: all.length },
      ...[...plans.entries()]
        .sort(([, a], [, b]) => a.ordre - b.ordre)
        .map(([code, plan]) => ({ value: code, label: plan.label, count: plan.count })),
    ];
  });

  protected readonly structuresFiltrees = computed(() => {
    const structures = this.structures();
    const recherche = this.recherche().trim().toLowerCase();
    const plan = this.planFiltre();
    const statut = this.statutFiltre();

    return structures.filter((structure) => {
      const correspondRecherche =
        !recherche ||
        structure.nom.toLowerCase().includes(recherche) ||
        structure.slug.toLowerCase().includes(recherche);

      const correspondPlan = plan === 'TOUS' || structure.planEffectif?.code === plan;
      const correspondStatut = statut === 'TOUS' || structure.statutStructure === statut;

      return correspondRecherche && correspondPlan && correspondStatut;
    });
  });

  ngOnInit(): void {
    this.chargerStructures();
  }

  protected chargerStructures(): void {
    this.loading.set(true);
    this.error.set(null);

    this.superAdminService.getStructures().subscribe({
      next: (structures) => {
        this.structures.set(structures);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des structures', error);
        this.error.set('Impossible de charger les structures.');
        this.loading.set(false);
      },
    });
  }

  protected ouvrirStructure(id: string): void {
    this.router.navigate(['/super-admin/structures', id]);
  }

  protected changerRecherche(value: string): void {
    this.recherche.set(value);
  }

  protected changerPlan(value: string): void {
    this.planFiltre.set(value);
  }

  protected changerStatut(value: string): void {
    this.statutFiltre.set(value);
  }

  protected reinitialiserFiltres(): void {
    this.recherche.set('');
    this.planFiltre.set('TOUS');
    this.statutFiltre.set('TOUS');
  }

  protected formaterDate(date: string): string {
    if (!date) return '-';
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }
}