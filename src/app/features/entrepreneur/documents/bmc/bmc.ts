
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DocumentService } from '../../../../core/services/document.service';

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
  imports: [RouterLink],
    templateUrl: './bmc.html',
  styleUrl: './bmc.css',
})
export class Bmc {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);

  private readonly userId = this.authService.currentUser()?.id ?? '';
  protected readonly document = toSignal(this.documentService.getByType(this.userId, 'bmc'), { initialValue: undefined });

  protected readonly contenu = computed(() => this.document()?.contenu as BmcContenu | undefined);
}