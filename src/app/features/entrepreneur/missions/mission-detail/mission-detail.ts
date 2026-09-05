import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { STATUT_MISSION_BADGE } from '../../../../core/constants/statut-mission.constant';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LivrableService } from '../../../../core/services/livrable.service';
import { Icon } from "../../../../shared/components/icon/icon";
import { Projet, StatutMission } from '../../../../core/models';
import { ProjetService } from '../../../../core/services/projet.service';

export interface LivrableItem {
  id: string;
  type: 'fichier' | 'lien';
  titre: string;
  valeur: string; // Nom du fichier ou URL du lien
  taille?: string;
}

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [RouterLink, BadgeComponent, ButtonComponent, Icon, FormsModule],
  templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.css',
})
export class MissionDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);

  private readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly mission = toSignal(this.missionService.getById(this.missionId), { initialValue: undefined });
  protected readonly projet = signal<Projet | undefined>(undefined);

  // État de soumission
  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  // Gestion des multi-livrables et de la note
  protected readonly items = signal<LivrableItem[]>([]);
  protected readonly noteEntrepreneur = signal<string>('');

  // Formulaire d'ajout de lien
  protected readonly showLinkForm = signal(false);
  protected readonly newLinkUrl = signal('');
  protected readonly newLinkTitle = signal('');

  constructor() {
    const userId = this.authService.currentUser()?.id;
    if (userId) {
      this.projetService.getPrincipalByEntrepreneur(userId).subscribe((p) => this.projet.set(p));
    }
  }

  protected statutBadge(statut: StatutMission) {
    return STATUT_MISSION_BADGE[statut] ?? { status: 'neutral', label: statut || 'Inconnu' };
  }

  // Simulation d'ajout de fichier via input file
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
      };
      this.items.update((prev) => [...prev, newItem]);
    });

    input.value = ''; // Reset input
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

  // Soumission globale
  protected soumettre(): void {
    const projetId = this.projet()?.id;
    if (!projetId) return;

    this.submitting.set(true);

    // Payload global incluant la liste des fichiers/liens et la note explicative
    this.livrableService
  .submit(
    this.missionId,
    projetId,
    this.items(),
    this.noteEntrepreneur(),
  )
  .subscribe({
    next: () => {
      this.submitting.set(false);
      this.submitted.set(true);
    },
    error: () => {
      this.submitting.set(false);
    },
  });
  }
}