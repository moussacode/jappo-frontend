import { Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { StructureContextService } from '../../../core/services/structure-context.service';
import { AuthService, StructureMembership } from '../../../core/services/auth.service';

import { Icon } from '../icon/icon';

@Component({
  selector: 'app-structure-switcher',
  standalone: true,
  imports: [Icon],
  template: `
    @if (memberships().length > 1) {
      <div class="flex items-center gap-2">
        <button
          (click)="cycleStructure()"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface hover:bg-surface-muted border border-line text-sm transition-colors cursor-pointer"
          title="Changer de structure"
        >
          <app-icon name="chevron-down" class="size-4" />
          <span class="font-medium">{{ currentStructureName() }}</span>
        </button>
      </div>
    } @else if (currentStructureName()) {
      <div class="flex items-center gap-2 px-3 py-1.5">
        <span class="text-sm font-medium text-ink-muted">{{ currentStructureName() }}</span>
      </div>
    }
  `,
})
export class StructureSwitcherComponent {
  private readonly structureContext = inject(StructureContextService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly memberships = this.authService.memberships;

  protected readonly currentStructureName = computed(() => {
    const activeId = this.structureContext.getActiveStructureId();
    const membershipList = this.memberships();
    const found = membershipList.find(m => m.structure.id === activeId);
    return found?.structure.nom || 'Choisir structure';
  });

  protected cycleStructure(): void {
    const membershipList = this.memberships();
    if (membershipList.length <= 1) return;

    const currentId = this.structureContext.getActiveStructureId();
    const currentIndex = membershipList.findIndex(m => m.structure.id === currentId);
    const nextIndex = (currentIndex + 1) % membershipList.length;
    
    this.structureContext.setActiveStructure(membershipList[nextIndex]);
    
    // Recharger la page actuelle pour rafraîchir le contexte
    const currentUrl = this.router.url;
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigate([currentUrl]);
    });
  }
}
