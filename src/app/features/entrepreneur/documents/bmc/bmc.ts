import {
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AuthService } from '../../../../core/services/auth.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { DocumentService } from '../../../../core/services/document.service';

import { DocumentGenere } from '../../../../core/models';
import { Icon } from "../../../../shared/components/icon/icon";
interface BmcContenu {
partenairesCles: string;
activitesCles: string;
ressourcesCles: string;
propositionValeur: string;
relationClient: string;
canaux: string;
segmentsClients: string;
structureCouts: string;
sourcesRevenus: string;
}
@Component({
  selector: 'app-bmc',
  templateUrl: './bmc.html',
  styleUrl: './bmc.css',
  imports: [Icon],
})
export class Bmc {
  private readonly authService = inject(AuthService);
  private readonly projetService = inject(ProjetService);
  private readonly documentService = inject(DocumentService);

  protected readonly document =
    signal<DocumentGenere | undefined>(undefined);

  protected readonly contenu = computed(
    () =>
      this.document()?.contenu as
        | BmcContenu
        | undefined
  );

  protected readonly editingField =
    signal<keyof BmcContenu | null>(null);

  protected readonly editingText =
    signal('');

  constructor() {
    const userId = this.authService.currentUser()?.id;

    if (!userId) return;

    this.projetService
      .getPrincipalByEntrepreneur(userId)
      .subscribe((projet) => {
        if (!projet) return;

        this.documentService
          .getByType(projet.id, 'bmc')
          .subscribe((doc) => {
            this.document.set(doc);
          });
      });
  }

  protected startEditing(
    field: keyof BmcContenu,
    value: string
  ): void {
    this.editingField.set(field);
    this.editingText.set(value);
  }

  protected updateEditingText(event: Event): void {
    const element =
      event.target as HTMLElement;

    this.editingText.set(element.innerText);
  }

  protected stopEditing(): void {
    this.editingField.set(null);
    this.editingText.set('');
  }
}