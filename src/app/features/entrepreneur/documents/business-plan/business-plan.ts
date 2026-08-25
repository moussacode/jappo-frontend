
import { Component, inject, computed, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DocumentService } from '../../../../core/services/document.service';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state';
import { ButtonComponent } from '../../../../shared/components/button/button.component';

interface SectionPlan {
  titre: string;
  contenu: string | null;
}

interface BusinessPlanContenu {
  sections: SectionPlan[];
}

@Component({
  selector: 'app-business-plan',
  imports: [RouterLink, EmptyState, ButtonComponent],
  templateUrl: './business-plan.html',
  styleUrl: './business-plan.css',
  
})
export class BusinessPlan {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);
  private readonly router = inject(Router);

  private readonly userId = this.authService.currentUser()?.id ?? '';

  protected readonly documentId = signal<string | undefined>(undefined);
  protected readonly sections = signal<SectionPlan[]>([]);
  protected readonly sectionActive = signal(0);

  protected readonly enEdition = signal(false);
  protected readonly texteEdite = signal('');
  protected readonly enregistrement = signal(false);

  constructor() {
    this.documentService.getByType(this.userId, 'business_plan').subscribe((doc) => {
      if (!doc) return;
      this.documentId.set(doc.id);
      this.sections.set((doc.contenu as BusinessPlanContenu).sections);
    });
  }

  protected sectionsCompletees(): number {
    return this.sections().filter((s) => s.contenu).length;
  }

  protected selectionner(index: number): void {
    this.sectionActive.set(index);
    this.enEdition.set(false);
  }

  protected commencerEdition(contenuActuel: string): void {
    this.texteEdite.set(contenuActuel);
    this.enEdition.set(true);
  }

  protected annulerEdition(): void {
    this.enEdition.set(false);
  }

  protected enregistrer(): void {
    const id = this.documentId();
    if (!id) return;

    this.enregistrement.set(true);
    const nouvellesSections = this.sections().map((s, i) =>
      i === this.sectionActive() ? { ...s, contenu: this.texteEdite() } : s,
    );

    this.documentService.updateContenu(id, { sections: nouvellesSections }).subscribe(() => {
      this.sections.set(nouvellesSections);
      this.enregistrement.set(false);
      this.enEdition.set(false);
    });
  }

  protected ouvrirAssistant(): void {
    this.router.navigate(['/entrepreneur/assistant-ia']);
  }
}
