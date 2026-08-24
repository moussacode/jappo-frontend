
import { Component, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { DocumentService } from '../../../../core/services/document.service';
import {  BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { TypeDocument } from '../../../../core/models';

interface DocInfo {
  type: TypeDocument;
  label: string;
  description: string;
  route: string;
}

const DOCUMENTS: DocInfo[] = [
  {
    type: 'bmc',
    label: 'Business Model Canvas',
    description: 'Modélise ton économie en 9 blocs clés',
    route: '/entrepreneur/documents/bmc',
  },
  {
    type: 'etude_marche',
    label: 'Étude de marché',
    description: 'Analyse de la concurrence et du marché cible',
    route: '/entrepreneur/documents/etude-marche',
  },
  {
    type: 'pitch_deck',
    label: 'Pitch Deck',
    description: 'Présentation investisseurs prête à partager',
    route: '/entrepreneur/documents/pitch-deck',
  },
  {
    type: 'business_plan',
    label: 'Business Plan',
    description: "Plan d'affaires complet avec projections financières",
    route: '/entrepreneur/documents/business-plan',
  },
];

@Component({
  selector: 'app-documents-hub',
  imports: [RouterLink, BadgeComponent],
    templateUrl: './documents-hub.html',
  styleUrl: './documents-hub.css',
 
})
export class DocumentsHub {
  private readonly authService = inject(AuthService);
  private readonly documentService = inject(DocumentService);

  private readonly userId = this.authService.currentUser()?.id ?? '';
  private readonly documents = toSignal(this.documentService.getByEntrepreneur(this.userId), { initialValue: [] });

  protected readonly documentsAffiches = computed(() =>
    DOCUMENTS.map((info) => {
      const doc = this.documents().find((d) => d.type === info.type);
      let badgeStatus: BadgeStatus = 'neutral';
      let badgeLabel = 'Non commencé';
      let ctaLabel = 'Générer';

      if (doc?.statut === 'genere') {
        badgeStatus = 'success';
        badgeLabel = 'Généré';
        ctaLabel = 'Voir le document';
      } else if (doc?.statut === 'en_cours') {
        badgeStatus = 'warning';
        badgeLabel = 'En cours';
        ctaLabel = 'Continuer';
      }

      return { info, badgeStatus, badgeLabel, ctaLabel };
    }),
  );
}