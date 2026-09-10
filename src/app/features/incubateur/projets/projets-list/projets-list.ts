import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { ProjetService } from '../../../../core/services/projet.service';
import { Projet, StatutProjet } from '../../../../core/models';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';

type FiltreStatut = 'tous' | 'IDEE' | 'DIAGNOSTIC' | 'EN_INCUBATION' | 'ACCOMPAGNE' | 'DIPLOME';

@Component({
  selector: 'app-projets-list',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, BadgeComponent, Icon],
  templateUrl: './projets-list.html',
})
export class ProjetsList implements OnInit {
  private readonly projetService = inject(ProjetService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly allProjets = signal<Projet[]>([]);
  protected readonly loading = signal(true);
  protected readonly filtreStatutActif = signal<FiltreStatut>('tous');
  
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchTerms = signal('');

  protected readonly tabs: { cle: FiltreStatut; label: string }[] = [
    { cle: 'tous', label: 'Tous' },
    { cle: 'EN_INCUBATION', label: 'En incubation' },
    { cle: 'DIAGNOSTIC', label: 'Diagnostic' },
    { cle: 'IDEE', label: 'Idéation' },
    { cle: 'DIPLOME', label: 'Diplômés' },
  ];

  // Filtre réactif
  protected readonly projetsFiltres = computed(() => {
    let result = this.allProjets();
    const query = this.searchTerms().toLowerCase().trim();
    const statut = this.filtreStatutActif();

    if (statut !== 'tous') {
      result = result.filter((p) => p.statut === statut);
    }

   if (query) {
  result = result.filter(
    (p) =>
      p.nom.toLowerCase().includes(query) ||
      p.secteur?.toLowerCase().includes(query) ||
      p.nomEntrepreneur?.toLowerCase().includes(query) ||
      p.nomCohorte?.toLowerCase().includes(query)
  );
}

    return result;
  });

  ngOnInit(): void {
    // Détection de la saisie utilisateur
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((val) => this.searchTerms.set(val));

    // Chargement des projets
    this.projetService
      .getProjets()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          this.allProjets.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement projets :', err);
          this.loading.set(false);
        },
      });
  }

  protected statutBadge(statut: string): { status: BadgeStatus; label: string } {
    switch (statut) {
      case 'EN_INCUBATION':
      case 'ACCOMPAGNE':
        return { status: 'success', label: 'En incubation' };
      case 'DIAGNOSTIC':
        return { status: 'info', label: 'Diagnostic' };
      case 'IDEE':
        return { status: 'neutral', label: 'Idéation' };
      case 'DIPLOME':
        return { status: 'info', label: 'Diplômé' };
      default:
        return { status: 'neutral', label: statut };
    }
  }
}