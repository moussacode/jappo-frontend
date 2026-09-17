import { Component, inject, signal, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, switchMap } from 'rxjs';
import { DatePipe } from '@angular/common';

import {
  LivrableResponse,
  StatutLivrable,
  CreateLivrableRequest,
  SoumettreVersionRequest,
  TypeLivrable,
} from '../../../../core/models/livrable.model';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { LivrableService } from '../../../../core/services/livrable.service';

import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { Projet, StatutMission } from '../../../../core/models';
import { STATUT_MISSION_CONFIG } from '../../../../core/constants/statut-mission.constant';
import { STATUT_LIVRABLE_CONFIG } from '../../../../core/constants/statut-livrable.constant';

export interface LivrableItem {
  id: string;
  type: 'fichier' | 'lien';
  titre: string;
  valeur: string;
  taille?: string;
  fichier?: File;
}

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [RouterLink, BadgeComponent, ButtonComponent, Icon, FormsModule, DatePipe],
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.css',
})
export class MissionDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * Signal partagé avec le LivrableService — mis à jour automatiquement via WebSocket.
   */
  protected readonly livrablesExistants = this.livrableService.livrables;

  protected readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  // Récupération réactive des détails de la mission
  protected readonly mission = toSignal(
    this.missionService.getById(this.missionId),
    { initialValue: undefined }
  );

  protected readonly projet = signal<Projet | undefined>(undefined);

  // État de soumission initiale
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  // Gestion des multi-livrables initiaux
  protected readonly items = signal<LivrableItem[]>([]);
  protected readonly noteEntrepreneur = signal<string>('');

  // Formulaire d'ajout de lien initial
  protected readonly showLinkForm = signal(false);
  protected readonly newLinkUrl = signal('');
  protected readonly newLinkTitle = signal('');

  // ────────────────────────────────────────────────────────────────
  // Gestion du redépôt d'une nouvelle version (Cycle de révision)
  // ────────────────────────────────────────────────────────────────
  protected readonly activeRedepositId = signal<string | null>(null);
  protected readonly redepositType = signal<'FICHIER' | 'LIEN'>('FICHIER');
  protected readonly redepositFile = signal<File | null>(null);
  protected readonly redepositLinkUrl = signal<string>('');
  protected readonly redepositLinkTitle = signal<string>('');
  protected readonly redepositComment = signal<string>('');
  protected readonly submittingRedeposit = signal<boolean>(false);
  protected readonly redepositError = signal<string | null>(null);
  protected readonly redepositSuccessId = signal<string | null>(null);

  // Gestion de l'historique déroulant
  protected readonly historiquesOuverts = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    // Déclare la mission active dans LivrableService :
    // - charge les livrables initiaux
    // - active l'écoute WebSocket pour cette mission
    this.livrableService.setActiveMission(this.missionId);

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

  ngOnDestroy(): void {
    // Libère le contexte mission pour éviter les mises à jour parasites
    this.livrableService.clearActiveMission();
  }

  protected rechargerLivrables(): void {
    // Délègue au service partagé — rafraîchit le signal partagé
    this.livrableService.rechargerLivrablesMissionActive();
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_CONFIG[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  protected statutBadgeLivrable(statut: string) {
    return STATUT_LIVRABLE_CONFIG[statut as StatutLivrable] ?? { status: 'neutral' as const, label: statut };
  }

  protected ouvrirFichier(url: string): void {
    this.livrableService.ouvrirFichier(url);
  }

  // ────────────────────────────────────────────────────────────────
  // SOUMISSION INITIALE (V1)
  // ────────────────────────────────────────────────────────────────
  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    Array.from(input.files).forEach((file) => {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1) + ' Mo';

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

  protected supprimerItem(id: string): void {
    this.items.update((prev) => prev.filter((item) => item.id !== id));
  }

  protected soumettre(): void {
    if (this.items().length === 0) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const requests = this.items().map((item) => {
      if (item.type === 'lien') {
        const payload: CreateLivrableRequest = {
          nom: item.titre,
          url: item.valeur,
          typePiece: 'LIEN',
          missionProjetId: this.missionId,
        };
        return this.livrableService.soumettreLivrable(payload);
      }

      if (!item.fichier) {
        throw new Error(`Le fichier "${item.titre}" est introuvable.`);
      }

      return this.livrableService.uploaderFichier(item.fichier).pipe(
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
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
          this.items.set([]);
          this.rechargerLivrables();
        },
        error: (err) => {
          console.error('Erreur lors du dépôt des livrables:', err);
          this.submitting.set(false);
          const backendMessage =
            typeof err.error === 'string' ? err.error : err.error?.message;
          this.errorMessage.set(
            backendMessage || 'Une erreur est survenue lors de la soumission de votre travail.'
          );
        },
      });
  }

  // ────────────────────────────────────────────────────────────────
  // REDÉPÔT D'UNE NOUVELLE VERSION (V{n+1})
  // ────────────────────────────────────────────────────────────────
  protected ouvrirRedepot(livrableId: string): void {
    this.activeRedepositId.set(livrableId);
    this.redepositFile.set(null);
    this.redepositLinkUrl.set('');
    this.redepositLinkTitle.set('');
    this.redepositComment.set('');
    this.redepositError.set(null);
  }

  protected fermerRedepot(): void {
    this.activeRedepositId.set(null);
    this.redepositFile.set(null);
    this.redepositLinkUrl.set('');
    this.redepositLinkTitle.set('');
    this.redepositComment.set('');
    this.redepositError.set(null);
  }

  protected onRedepositFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.redepositFile.set(input.files[0]);
    }
  }

  protected soumettreNouvelleVersion(livrable: LivrableResponse): void {
    this.submittingRedeposit.set(true);
    this.redepositError.set(null);

    const isLien = this.redepositType() === 'LIEN';

    if (isLien) {
      const url = this.redepositLinkUrl().trim();
      if (!url) {
        this.redepositError.set('Veuillez renseigner un lien valide.');
        this.submittingRedeposit.set(false);
        return;
      }

      const payload: SoumettreVersionRequest = {
        nom: this.redepositLinkTitle().trim() || livrable.nom,
        url: url,
        typePiece: 'LIEN',
        commentaireEntrepreneur: this.redepositComment().trim() || undefined,
      };

      this.livrableService
        .soumettreNouvelleVersion(livrable.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.handleRedepositSuccess(livrable.id),
          error: (err) => this.handleRedepositError(err),
        });
    } else {
      const file = this.redepositFile();
      if (!file) {
        this.redepositError.set('Veuillez sélectionner un fichier à déposer.');
        this.submittingRedeposit.set(false);
        return;
      }

      this.livrableService
        .uploaderFichier(file)
        .pipe(
          switchMap((uploadRes) => {
            const payload: SoumettreVersionRequest = {
              nom: file.name,
              url: uploadRes.url,
              typePiece: 'FICHIER',
              commentaireEntrepreneur: this.redepositComment().trim() || undefined,
            };
            return this.livrableService.soumettreNouvelleVersion(livrable.id, payload);
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: () => this.handleRedepositSuccess(livrable.id),
          error: (err) => this.handleRedepositError(err),
        });
    }
  }

  private handleRedepositSuccess(livrableId: string): void {
    this.submittingRedeposit.set(false);
    this.activeRedepositId.set(null);
    this.redepositSuccessId.set(livrableId);
    setTimeout(() => this.redepositSuccessId.set(null), 5000);
    // Rafraîchissement via le service partagé (WebSocket prendra le relais mais on force quand même)
    this.rechargerLivrables();
  }

  private handleRedepositError(err: any): void {
    console.error('Erreur redépôt version:', err);
    this.submittingRedeposit.set(false);
    const msg = typeof err.error === 'string' ? err.error : err.error?.message;
    this.redepositError.set(msg || 'Erreur lors du dépôt de la nouvelle version.');
  }

  // Historique
  protected toggleHistorique(livrableId: string): void {
    this.historiquesOuverts.update((prev) => ({
      ...prev,
      [livrableId]: !prev[livrableId],
    }));
  }

  protected isHistoriqueOpen(livrableId: string): boolean {
    return !!this.historiquesOuverts()[livrableId];
  }
}