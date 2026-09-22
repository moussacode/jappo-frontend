import {
  Injectable,
  computed,
  signal,
} from '@angular/core';

import {
  StructureMembership,
  Structure,
  RoleMembreStructure,
} from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class StructureContextService {

  private readonly activeStructureIdKey = 'jappo_active_structure_id';

  private readonly _memberships = signal<StructureMembership[]>([]);
  readonly memberships = this._memberships.asReadonly();

  private readonly _activeMembership = signal<StructureMembership | null>(null);
  readonly activeMembership = this._activeMembership.asReadonly();

  readonly activeStructure = computed(
    () => this._activeMembership()?.structure ?? null
  );

  readonly activeStructureId = computed(
    () => this.activeStructure()?.id ?? null
  );

  readonly activeRole = computed(
    () => this._activeMembership()?.role ?? null
  );

  /**
   * Enregistre les structures et sélectionne automatiquement la meilleure structure
   */
  setMemberships(memberships: StructureMembership[]): void {
    this._memberships.set(memberships);
    // Sélectionne automatiquement la meilleure structure (auto-choix si une seule, sinon restaure)
    this.selectBestStructure(memberships);
  }

  /**
   * Sélectionne automatiquement la meilleure structure :
   * - Si une seule structure : auto-sélection
   * - Si plusieurs : tente de restaurer la dernière utilisée
   */
  selectBestStructure(memberships: StructureMembership[]): void {
    if (memberships.length === 1) {
      // Auto-sélection si une seule structure
      this.setActiveStructure(memberships[0]);
    } else {
      // Sinon, tente de restaurer la dernière utilisée
      this.restore();
    }
  }

  setActiveStructure(membership: StructureMembership): void {
    this._activeMembership.set(membership);

    localStorage.setItem(
      this.activeStructureIdKey,
      membership.structure.id
    );
  }

  /**
   * Restaure la structure active depuis le localStorage sans l'effacer prématurément
   */
  restore(): boolean {
    const activeStructureId = localStorage.getItem(this.activeStructureIdKey);
    const memberships = this._memberships();

    // 1. Pas d'ID stocké dans le localStorage
    if (!activeStructureId) {
      return false;
    }

    // 2. Les structures ne sont pas encore chargées depuis le backend (on attend sans effacer)
    if (memberships.length === 0) {
      return false;
    }

    // 3. Recherche de la structure correspondante dans la liste
    const membership = memberships.find(
      item => item.structure.id === activeStructureId
    );

    // 4. Si la structure n'existe vraiment pas parmi les adhésions de l'utilisateur
    if (!membership) {
      this.clear();
      return false;
    }

    // 5. Structure trouvée et restaurée !
    this._activeMembership.set(membership);
    return true;
  }

  clear(): void {
    this._activeMembership.set(null);
    this._memberships.set([]);

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


  updateActiveStructure(partial: Partial<Structure>): void {
  const current = this._activeMembership();
  if (!current) return;

  this._activeMembership.set({
    ...current,
    structure: { ...current.structure, ...partial },
  });
}

}