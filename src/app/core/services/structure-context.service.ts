import {
  Injectable,
  computed,
  inject,
  signal,
} from '@angular/core';

import {
  StructureMembership,
  Structure,
  RoleMembreStructure,
} from './auth.service';

import { AbonnementService } from './abonnement.service';
import { Abonnement, UsageAbonnement } from '../models/abonnement.model';

@Injectable({
  providedIn: 'root',
})
export class StructureContextService {

  private readonly activeStructureIdKey =
    'jappo_active_structure_id';

  private readonly abonnementService =
    inject(AbonnementService);

  private readonly _memberships =
    signal<StructureMembership[]>([]);

  readonly memberships =
    this._memberships.asReadonly();

  private readonly _activeMembership =
    signal<StructureMembership | null>(null);

  readonly activeMembership =
    this._activeMembership.asReadonly();

  private readonly _abonnement =
    signal<Abonnement | null>(null);

  readonly abonnement =
    this._abonnement.asReadonly();

  /** Plan réellement appliqué à la structure active (configuré par le SUPER_ADMIN). */
  readonly planEffectif = computed(
    () => this._abonnement()?.planEffectif ?? null
  );

  private readonly _usage =
    signal<UsageAbonnement | null>(null);

  /** Limites du plan et consommation courante (cohortes, tokens IA du mois). */
  readonly usage =
    this._usage.asReadonly();

  /**
   * L'utilisateur connecté peut-il utiliser l'assistant IA ?
   * null tant que l'usage n'est pas chargé (ne rien bloquer à l'aveugle).
   */
  readonly iaDisponible = computed(
    () => this._usage()?.ia.accesUtilisateur ?? null
  );

  readonly activeStructure = computed(
    () => this._activeMembership()?.structure ?? null
  );

  readonly activeStructureId = computed(
    () => this.activeStructure()?.id ?? null
  );

  readonly activeRole = computed(
    () => this._activeMembership()?.role ?? null
  );

  private loadAbonnement(
    structureId: string
  ): void {

    // On supprime l'ancien abonnement
    // pendant le chargement du nouveau.
    this._abonnement.set(null);
    this._usage.set(null);
    this.refreshUsage(structureId);

    this.abonnementService
      .getAbonnement(structureId)
      .subscribe({
        next: (abonnement) => {
          this._abonnement.set(abonnement);
        },

        error: (error) => {
          console.error(
            'Impossible de récupérer l’abonnement',
            error
          );

          this._abonnement.set(null);
        },
      });
  }

  /** Recharge la consommation (après un message IA, une création de cohorte…). */
  refreshUsage(
    structureId: string | null = this.activeStructureId()
  ): void {

    if (!structureId) {
      return;
    }

    this.abonnementService
      .getUsage(structureId)
      .subscribe({
        next: (usage) => {
          // Ignore une réponse arrivée après un changement de structure.
          if (this.activeStructureId() === structureId) {
            this._usage.set(usage);
          }
        },
        error: () => this._usage.set(null),
      });
  }

  /**
   * Enregistre les structures et sélectionne
   * automatiquement la meilleure structure.
   */
  setMemberships(
    memberships: StructureMembership[]
  ): void {

    this._memberships.set(memberships);

    this.selectBestStructure(memberships);
  }

  /**
   * Sélectionne automatiquement la structure :
   * - une seule structure → sélection automatique
   * - plusieurs → restauration de la dernière utilisée
   */
  selectBestStructure(
    memberships: StructureMembership[]
  ): void {

    if (memberships.length === 1) {

      this.setActiveStructure(
        memberships[0]
      );

    } else {

      this.restore();
    }
  }

  setActiveStructure(
    membership: StructureMembership
  ): void {

    this._activeMembership.set(
      membership
    );

    localStorage.setItem(
      this.activeStructureIdKey,
      membership.structure.id
    );

    // Charge le plan de cette structure.
    this.loadAbonnement(
      membership.structure.id
    );
  }

  /**
   * Restaure la structure active depuis le localStorage.
   */
  restore(): boolean {

    const activeStructureId =
      localStorage.getItem(
        this.activeStructureIdKey
      );

    const memberships =
      this._memberships();

    // Pas d'ID sauvegardé.
    if (!activeStructureId) {
      return false;
    }

    // Les structures ne sont pas encore chargées.
    if (memberships.length === 0) {
      return false;
    }

    const membership =
      memberships.find(
        item =>
          item.structure.id === activeStructureId
      );

    // La structure n'existe plus
    // parmi les adhésions.
    if (!membership) {

      this.clear();

      return false;
    }

    this._activeMembership.set(
      membership
    );

    // Recharge également l'abonnement
    // après un refresh de la page.
    this.loadAbonnement(
      membership.structure.id
    );

    return true;
  }

  clear(): void {

    this._activeMembership.set(null);

    this._memberships.set([]);

    this._abonnement.set(null);

    this._usage.set(null);

    localStorage.removeItem(
      this.activeStructureIdKey
    );
  }

  getActiveStructureId(): string | null {
    return this.activeStructureId();
  }

  getActiveRole(): RoleMembreStructure | null {
    return this.activeRole();
  }

  getActiveStructure(): Structure | null {
    return this.activeStructure();
  }

  updateActiveStructure(
    partial: Partial<Structure>
  ): void {

    const current =
      this._activeMembership();

    if (!current) return;

    this._activeMembership.set({
      ...current,

      structure: {
        ...current.structure,
        ...partial,
      },
    });
  }
}