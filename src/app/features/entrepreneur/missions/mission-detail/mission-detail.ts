import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';

import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { LivrableService } from '../../../../core/services/livrable.service';

import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';

import { Projet, StatutMission } from '../../../../core/models';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';
import { CreateLivrableRequest, TypeLivrable } from '../../../../core/models/livrable.model';

export interface LivrableItem {
   id: string;
  type: 'fichier' | 'lien';
  titre: string;
  valeur: string;
  taille?: string;

  // Présent uniquement pour les fichiers locaux
  fichier?: File;
}

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [RouterLink, BadgeComponent, ButtonComponent, Icon, FormsModule],
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.css',
})
export class MissionDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  // Récupération réactive des détails de la mission
  protected readonly mission = toSignal(
    this.missionService.getById(this.missionId),
    { initialValue: undefined }
  );

  protected readonly projet = signal<Projet | undefined>(undefined);

  // État de soumission et erreurs
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Gestion des multi-livrables et de la note
  protected readonly items = signal<LivrableItem[]>([]);
  protected readonly noteEntrepreneur = signal<string>('');

  // Formulaire d'ajout de lien
  protected readonly showLinkForm = signal(false);
  protected readonly newLinkUrl = signal('');
  protected readonly newLinkTitle = signal('');

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.projetService
        .getPrincipalByEntrepreneur(userId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (p) => this.projet.set(p),
          error: (err) => console.error('Erreur récupération projet:', err),
        });
    }
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_CONFIG[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  // Sélection de fichier local
 protected onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;

  if (!input.files || input.files.length === 0) return;

  Array.from(input.files).forEach((file) => {
    const sizeMb =
      (file.size / (1024 * 1024)).toFixed(1) + ' Mo';

    const newItem: LivrableItem = {
      id: crypto.randomUUID(),
      type: 'fichier',
      titre: file.name,
      valeur: file.name,
      taille: sizeMb,
      fichier: file,
    };

    this.items.update((prev) => [...prev, newItem]);
  });

  input.value = '';
}

  // Ajout d'un lien Web (Figma, GitHub, Drive, Loom...)
  protected ajouterLien(): void {
    const url = this.newLinkUrl().trim();
    if (!url) return;

    const titre = this.newLinkTitle().trim() || url;
    const newItem: LivrableItem = {
      id: crypto.randomUUID(),
      type: 'lien',
      titre: titre,
      valeur: url,
    };

    this.items.update((prev) => [...prev, newItem]);
    this.newLinkUrl.set('');
    this.newLinkTitle.set('');
    this.showLinkForm.set(false);
  }

  // Suppression d'un élément
  protected supprimerItem(id: string): void {
    this.items.update((prev) => prev.filter((item) => item.id !== id));
  }

  // Soumission globale vers l'API REST
 protected soumettre(): void {
  if (this.items().length === 0) return;

  this.submitting.set(true);
  this.errorMessage.set(null);

  const requests = this.items().map((item) => {
    // ─────────────────────────────────────
    // CAS 1 : LIVRE / LIEN
    // ─────────────────────────────────────
    if (item.type === 'lien') {
      const payload: CreateLivrableRequest = {
        nom: item.titre,
        url: item.valeur,
        typePiece: 'LIEN',
        missionProjetId: this.missionId,
      };

      return this.livrableService.soumettreLivrable(payload);
    }

    // ─────────────────────────────────────
    // CAS 2 : FICHIER
    // ─────────────────────────────────────

    if (!item.fichier) {
      throw new Error(
        `Le fichier "${item.titre}" est introuvable.`
      );
    }

    return this.livrableService
      .uploaderFichier(item.fichier)
      .pipe(
        switchMap((uploadResponse) => {
          const payload: CreateLivrableRequest = {
            nom: item.titre,
            url: uploadResponse.url,
            typePiece: 'FICHIER',
            missionProjetId: this.missionId,
          };

          return this.livrableService.soumettreLivrable(payload);
        })
      );
  });

  forkJoin(requests)
    .pipe(
      takeUntilDestroyed(this.destroyRef)
    )
    .subscribe({
      next: () => {
        this.submitting.set(false);
        this.submitted.set(true);
      },

      error: (err) => {
        console.error(
          'Erreur lors du dépôt des livrables:',
          err
        );

        this.submitting.set(false);

        const backendMessage =
          typeof err.error === 'string'
            ? err.error
            : err.error?.message;

        this.errorMessage.set(
          backendMessage ||
          'Une erreur est survenue lors de la soumission de votre travail.'
        );
      },
    });
}
}