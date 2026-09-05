import { Component, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { DocumentService } from '../../../../core/services/document.service';
import { Entrepreneur, Projet, Mission, DocumentGenere } from '../../../../core/models';

type Onglet = 'progression' | 'documents' | 'missions';

@Component({
  selector: 'app-entrepreneur-detail',
  imports: [RouterLink],
  template: `
    <div class="flex flex-col gap-6 p-8">
      <a routerLink="/incubateur/entrepreneurs" class="text-sm font-medium text-ink-muted hover:text-ink"> ← Entrepreneurs </a>

      @if (entrepreneur(); as e) {
        <div>
          <h1 class="text-[24px] font-normal leading-[1.33] text-ink">{{ e.nom }}</h1>
          @if (projet(); as p) {
            <p class="mt-1 text-sm text-ink-muted">{{ p.nom }} · Score {{ p.scoreMaturite }}%</p>
          }
        </div>

        <div class="flex gap-1 border-b border-line">
          @for (o of onglets; track o.cle) {
            <button
              type="button"
              (click)="ongletActif.set(o.cle)"
              class="border-b-2 px-4 py-2.5 text-sm font-medium"
              [class]="ongletActif() === o.cle ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'"
            >
              {{ o.label }}
            </button>
          }
        </div>

        @if (ongletActif() === 'progression' && projet(); as p) {
          <div class="rounded-[var(--radius-card)] border border-line bg-surface p-5">
            <p class="text-sm text-ink">Étape actuelle : <span class="font-medium">{{ p.etapeActuelle }}</span></p>
            <p class="mt-2 text-sm text-ink">Score de maturité : <span class="font-medium">{{ p.scoreMaturite }}%</span></p>
          </div>
        }

        @if (ongletActif() === 'documents') {
          <div class="rounded-[var(--radius-card)] border border-line bg-surface">
            @for (doc of documents(); track doc.id) {
              <div class="flex items-center justify-between border-b border-line px-5 py-3.5 last:border-0">
                <span class="text-sm text-ink">{{ doc.type }}</span>
                <span class="text-xs text-ink-muted">{{ doc.statut === 'genere' ? 'Généré' : 'En cours' }}</span>
              </div>
            } @empty {
              <p class="px-5 py-6 text-center text-sm text-ink-muted">Aucun document généré.</p>
            }
          </div>
        }

        @if (ongletActif() === 'missions') {
          <div class="rounded-[var(--radius-card)] border border-line bg-surface">
            @for (mission of missions(); track mission.id) {
              <div class="flex items-center justify-between border-b border-line px-5 py-3.5 last:border-0">
                <span class="text-sm text-ink">{{ mission.titre }}</span>
                <span class="text-xs text-ink-muted">{{ mission.statut }}</span>
              </div>
            } @empty {
              <p class="px-5 py-6 text-center text-sm text-ink-muted">Aucune mission assignée.</p>
            }
          </div>
        }
      }
    </div>
  `,
})
export class EntrepreneurDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly documentService = inject(DocumentService);

  private readonly entrepreneurId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly entrepreneur = signal<Entrepreneur | undefined>(undefined);
  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly documents = signal<DocumentGenere[]>([]);
  protected readonly ongletActif = signal<Onglet>('progression');

  protected readonly onglets: { cle: Onglet; label: string }[] = [
    { cle: 'progression', label: 'Progression' },
    { cle: 'documents', label: 'Documents' },
    { cle: 'missions', label: 'Missions' },
  ];

  constructor() {
    this.entrepreneurService.getById(this.entrepreneurId).subscribe((e) => this.entrepreneur.set(e));
    this.projetService.getPrincipalByEntrepreneur(this.entrepreneurId).subscribe((p) => {
      this.projet.set(p);
      if (!p) return;
      this.missionService.getByProjet(p.id).subscribe((m) => this.missions.set(m));
      this.documentService.getByProjet(p.id).subscribe((d) => this.documents.set(d));
    });
  }
}