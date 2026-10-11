import { Component, inject, signal, OnInit, OnDestroy, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { forkJoin, switchMap, tap } from 'rxjs';
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
import { LivrableAttenduMission } from '../../../../core/models/mission.model';
import { TemplateField } from '../../../../core/models/parcours.model';
import {
  BMC_DEFAULT_FIELDS,
  BmcCanvasComponent,
} from '../../../../shared/components/bmc-canvas/bmc-canvas.component';

export interface LivrableItem {
  id: string;
  type: 'fichier' | 'lien' | 'texte' | 'template';
  titre: string;
  valeur: string;
  livrableAttenduId?: string;
  taille?: string;
  fichier?: File;
  uploadedUrl?: string;
}

@Component({
  selector: 'app-mission-detail',
  standalone: true,
  imports: [
    RouterLink,
    BadgeComponent,
    ButtonComponent,
    Icon,
    FormsModule,
    DatePipe,
    BmcCanvasComponent,
  ],
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
  protected readonly reponsesBmc = signal<Record<string, Record<string, string>>>({});
  protected readonly noteEntrepreneur = signal<string>('');

  // Formulaire d'ajout de lien initial
  protected readonly showLinkForm = signal(false);
  protected readonly newLinkUrl = signal('');
  protected readonly newLinkTitle = signal('');
  protected readonly showTextForm = signal(false);
  protected readonly newTextTitle = signal('');
  protected readonly newTextBody = signal('');

  // ────────────────────────────────────────────────────────────────
  // Gestion du redépôt d'une nouvelle version (Cycle de révision)
  // ────────────────────────────────────────────────────────────────
  protected readonly activeRedepositId = signal<string | null>(null);
  protected readonly redepositType = signal<TypeLivrable>('FICHIER');
  protected readonly reponsesBmcRedepot = signal<Record<string, string>>({});
  protected readonly redepositFile = signal<File | null>(null);
  protected readonly redepositLinkUrl = signal<string>('');
  protected readonly redepositLinkTitle = signal<string>('');
  protected readonly redepositText = signal<string>('');
  protected readonly redepositComment = signal<string>('');
  protected readonly submittingRedeposit = signal<boolean>(false);
  protected readonly redepositError = signal<string | null>(null);
  protected readonly redepositSuccessId = signal<string | null>(null);
  protected readonly validationSuccessId = signal<string | null>(null);
  private validationSuccessTimer: ReturnType<typeof setTimeout> | undefined;

  // Gestion de l'historique déroulant
  protected readonly historiquesOuverts = signal<Record<string, boolean>>({});

  ngOnInit(): void {
    // Déclare la mission active dans LivrableService :
    // - charge les livrables initiaux
    // - active l'écoute WebSocket pour cette mission
    this.livrableService.setActiveMission(this.missionId);
    this.livrableService.validationEvents
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((livrableId) => {
        this.validationSuccessId.set(livrableId);
        if (this.validationSuccessTimer) {
          clearTimeout(this.validationSuccessTimer);
        }
        this.validationSuccessTimer = setTimeout(() => {
          this.validationSuccessId.set(null);
          this.validationSuccessTimer = undefined;
        }, 5000);
      });

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
    if (this.validationSuccessTimer) {
      clearTimeout(this.validationSuccessTimer);
    }
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

  protected ajouterTexte(): void {
    const body = this.newTextBody().trim();
    if (!body || body.length > 1000) return;
    this.items.update((prev) => [...prev, {
      id: crypto.randomUUID(),
      type: 'texte',
      titre: this.newTextTitle().trim() || 'Réponse texte',
      valeur: body,
    }]);
    this.newTextBody.set('');
    this.newTextTitle.set('');
    this.showTextForm.set(false);
  }

  protected supprimerItem(id: string): void {
    this.items.update((prev) => prev.filter((item) => item.id !== id));
  }

  protected attendusPourItem(item: LivrableItem) {
    const attendus = this.mission()?.livrablesAttendus ?? [];
    return attendus.filter((attendu) => {
      if (attendu.id === item.livrableAttenduId) return true;
      const dejaDepose = this.livrablesExistants().some(
        (livrable) => livrable.livrableAttenduId === attendu.id,
      );
      const dejaSelectionne = this.items().some(
        (queued) => queued.id !== item.id && queued.livrableAttenduId === attendu.id,
      );
      return !dejaDepose && !dejaSelectionne;
    });
  }

  protected associerAttendu(itemId: string, attenduId: string): void {
    this.items.update((items) => items.map((item) => item.id === itemId
      ? { ...item, livrableAttenduId: attenduId || undefined }
      : item));
  }

  protected champsTemplate(attendu: LivrableAttenduMission): TemplateField[] {
    return attendu.templateFields?.length
      ? attendu.templateFields
      : attendu.templateType?.toUpperCase() === 'BMC'
        ? BMC_DEFAULT_FIELDS
        : [];
  }

  protected reponsesTemplate(contenu: string | null | undefined): Record<string, string> {
    if (!contenu) return {};
    try {
      const answers: unknown = JSON.parse(contenu);
      if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return {};
      return Object.fromEntries(
        Object.entries(answers).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
      );
    } catch {
      return {};
    }
  }

  protected modifierReponseBmc(attenduId: string, champId: string, valeur: string): void {
    this.reponsesBmc.update((current) => ({
      ...current,
      [attenduId]: { ...current[attenduId], [champId]: valeur },
    }));
  }

  protected reponseBmcComplete(attendu: LivrableAttenduMission): boolean {
    const fields = this.champsTemplate(attendu);
    const answers = this.reponsesBmc()[attendu.id] ?? {};
    return fields.length > 0 && fields.every((field) => Boolean(answers[field.id]?.trim()));
  }

  protected modifierReponseBmcRedepot(champId: string, valeur: string): void {
    this.reponsesBmcRedepot.update((answers) => ({ ...answers, [champId]: valeur }));
  }

  protected bmcDejaSoumis(attenduId: string): boolean {
    return this.livrablesExistants().some((livrable) => livrable.livrableAttenduId === attenduId)
      || this.items().some((item) => item.livrableAttenduId === attenduId);
  }

  protected ajouterReponseBmc(attendu: LivrableAttenduMission): void {
    if (!this.reponseBmcComplete(attendu) || this.bmcDejaSoumis(attendu.id)) {
      return;
    }
    const answers = this.reponsesBmc()[attendu.id] ?? {};
    this.items.update((items) => [...items, {
      id: crypto.randomUUID(),
      type: 'template',
      titre: attendu.titre,
      valeur: JSON.stringify(Object.fromEntries(
        this.champsTemplate(attendu).map((field) => [field.id, answers[field.id].trim()]),
      )),
      livrableAttenduId: attendu.id,
    }]);
  }

  protected reponseTemplate(contenu: string | null | undefined, champId: string): string {
    if (!contenu) return '';
    try {
      const answers: unknown = JSON.parse(contenu);
      if (typeof answers !== 'object' || answers === null || Array.isArray(answers)) return '';
      const value = (answers as Record<string, unknown>)[champId];
      return typeof value === 'string' ? value : '';
    } catch {
      return '';
    }
  }

  protected remiseCompatibleAvecAttendu(item: LivrableItem): boolean {
    const attendus = this.mission()?.livrablesAttendus ?? [];
    if (attendus.length === 0) return true;
    const attendu = attendus.find((candidate) => candidate.id === item.livrableAttenduId);
    if (!attendu) return false;
    const typeSoumis: TypeLivrable = item.type === 'fichier'
      ? 'FICHIER'
      : item.type === 'lien'
        ? 'LIEN'
        : item.type === 'template'
          ? 'TEMPLATE'
          : 'TEXTE';
    if (attendu.type === 'TEMPLATE' && (attendu.templateFields?.length ?? 0) > 0) {
      return typeSoumis === 'TEMPLATE';
    }
    return attendu.type === 'TEMPLATE'
      ? typeSoumis === 'FICHIER' || typeSoumis === 'LIEN'
      : attendu.type === typeSoumis;
  }

  protected peutSoumettre(): boolean {
    return this.items().length > 0 && this.items().every((item) => this.remiseCompatibleAvecAttendu(item));
  }

  protected attenduPourLivrable(livrable: LivrableResponse) {
    return (this.mission()?.livrablesAttendus ?? []).find(
      (attendu) => attendu.id === livrable.livrableAttenduId,
    );
  }

  protected formatCompatiblePourRedepot(livrable: LivrableResponse, type: TypeLivrable): boolean {
    const attendu = this.attenduPourLivrable(livrable);
    if (!attendu) return true;
    if (attendu.type === 'TEMPLATE' && (attendu.templateFields?.length ?? 0) > 0) {
      return type === 'TEMPLATE';
    }
    return attendu.type === 'TEMPLATE'
      ? type === 'FICHIER' || type === 'LIEN'
      : attendu.type === type;
  }

  protected libelleFormatAttendu(type: string): string {
    if (type === 'TEMPLATE') return 'Modèle à compléter';
    if (type === 'FICHIER') return 'Fichier';
    if (type === 'LIEN') return 'Lien web';
    if (type === 'TEXTE') return 'Réponse texte';
    return type;
  }

  protected soumettre(): void {
    if (!this.peutSoumettre()) return;

    this.submitting.set(true);
    this.errorMessage.set(null);

    const requests = this.items().map((item) => {
      if (item.type === 'template') {
        const payload: CreateLivrableRequest = {
          nom: item.titre,
          url: '',
          contenu: item.valeur,
          typePiece: 'TEMPLATE',
          missionProjetId: this.missionId,
          livrableAttenduId: item.livrableAttenduId,
        };
        return this.livrableService.soumettreLivrable(payload).pipe(
          tap(() => this.retirerItemConfirme(item.id)),
        );
      }
      if (item.type === 'lien') {
        const payload: CreateLivrableRequest = {
          nom: item.titre,
          url: item.valeur,
          typePiece: 'LIEN',
          missionProjetId: this.missionId,
          livrableAttenduId: item.livrableAttenduId,
        };
        return this.livrableService.soumettreLivrable(payload).pipe(
          tap(() => this.retirerItemConfirme(item.id)),
        );
      }

      if (item.type === 'texte') {
        const payload: CreateLivrableRequest = {
          nom: item.titre,
          url: item.valeur,
          typePiece: 'TEXTE',
          missionProjetId: this.missionId,
          livrableAttenduId: item.livrableAttenduId,
        };
        return this.livrableService.soumettreLivrable(payload).pipe(
          tap(() => this.retirerItemConfirme(item.id)),
        );
      }

      if (!item.fichier) {
        throw new Error(`Le fichier "${item.titre}" est introuvable.`);
      }

      if (item.uploadedUrl) {
        return this.livrableService.soumettreLivrable({
          nom: item.titre,
          url: item.uploadedUrl,
          typePiece: 'FICHIER',
          missionProjetId: this.missionId,
          livrableAttenduId: item.livrableAttenduId,
        }).pipe(tap(() => this.retirerItemConfirme(item.id)));
      }

      return this.livrableService.uploaderFichier(item.fichier).pipe(
        switchMap((uploadResponse) => {
          this.items.update((current) => current.map((queued) => queued.id === item.id
            ? { ...queued, uploadedUrl: uploadResponse.url }
            : queued));
          const payload: CreateLivrableRequest = {
            nom: item.titre,
            url: uploadResponse.url,
            typePiece: 'FICHIER',
            missionProjetId: this.missionId,
            livrableAttenduId: item.livrableAttenduId,
          };
          return this.livrableService.soumettreLivrable(payload);
        }),
        tap(() => this.retirerItemConfirme(item.id)),
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

  private retirerItemConfirme(itemId: string): void {
    this.items.update((current) => current.filter((item) => item.id !== itemId));
  }

  // ────────────────────────────────────────────────────────────────
  // REDÉPÔT D'UNE NOUVELLE VERSION (V{n+1})
  // ────────────────────────────────────────────────────────────────
  protected ouvrirRedepot(livrableId: string): void {
    this.activeRedepositId.set(livrableId);
    this.redepositFile.set(null);
    this.redepositLinkUrl.set('');
    this.redepositLinkTitle.set('');
    this.redepositText.set('');
    this.redepositComment.set('');
    this.redepositError.set(null);
    const livrable = this.livrablesExistants().find((item) => item.id === livrableId);
    if (livrable) {
      const formatsPossibles: TypeLivrable[] = ['FICHIER', 'LIEN', 'TEXTE', 'TEMPLATE'];
      const formatsAcceptes = formatsPossibles
        .filter((type): type is TypeLivrable => this.formatCompatiblePourRedepot(livrable, type));
      this.redepositType.set(formatsAcceptes.includes(livrable.typePiece)
        ? livrable.typePiece
        : formatsAcceptes[0] ?? 'FICHIER');
      const attendu = this.attenduPourLivrable(livrable);
      this.reponsesBmcRedepot.set(Object.fromEntries(
        (attendu?.templateFields ?? []).map((field) => [
          field.id,
          this.reponseTemplate(livrable.contenu, field.id),
        ]),
      ));
    }
  }

  protected fermerRedepot(): void {
    this.activeRedepositId.set(null);
    this.redepositFile.set(null);
    this.redepositLinkUrl.set('');
    this.redepositLinkTitle.set('');
    this.redepositText.set('');
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
    if (!this.formatCompatiblePourRedepot(livrable, this.redepositType())) {
      this.redepositError.set('Le format de la nouvelle version doit respecter le livrable attendu.');
      return;
    }
    this.submittingRedeposit.set(true);
    this.redepositError.set(null);

    if (this.redepositType() === 'TEMPLATE') {
      const attendu = this.attenduPourLivrable(livrable);
      const fields = attendu?.templateFields ?? [];
      const answers = this.reponsesBmcRedepot();
      if (fields.length === 0 || !fields.every((field) => Boolean(answers[field.id]?.trim()))) {
        this.redepositError.set('Veuillez renseigner toutes les rubriques du Business Model Canvas.');
        this.submittingRedeposit.set(false);
        return;
      }
      const payload: SoumettreVersionRequest = {
        nom: livrable.nom,
        url: '',
        contenu: JSON.stringify(Object.fromEntries(
          fields.map((field) => [field.id, answers[field.id].trim()]),
        )),
        typePiece: 'TEMPLATE',
        commentaireEntrepreneur: this.redepositComment().trim() || undefined,
      };
      this.livrableService.soumettreNouvelleVersion(livrable.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.handleRedepositSuccess(livrable.id),
          error: (err) => this.handleRedepositError(err),
        });
      return;
    }

    const isLien = this.redepositType() === 'LIEN';

    if (this.redepositType() === 'TEXTE') {
      const body = this.redepositText().trim();
      if (!body || body.length > 1000) {
        this.redepositError.set('Le texte doit contenir entre 1 et 1000 caractères.');
        this.submittingRedeposit.set(false);
        return;
      }
      const payload: SoumettreVersionRequest = {
        nom: livrable.nom,
        url: body,
        typePiece: 'TEXTE',
        commentaireEntrepreneur: this.redepositComment().trim() || undefined,
      };
      this.livrableService.soumettreNouvelleVersion(livrable.id, payload)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.handleRedepositSuccess(livrable.id),
          error: (err) => this.handleRedepositError(err),
        });
      return;
    }

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