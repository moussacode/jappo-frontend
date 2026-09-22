import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MeetingService } from '../../../../core/services/meeting.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';

import { CreateMeetingRequest, MeetingMode } from '../../../../core/models/meeting.model';
import { Cohorte } from '../../../../core/models/cohorte.model';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { CardComponent } from '../../../../shared/components/card/card.component';

type TypeReunion = 'INDIVIDUELLE' | 'GROUPE';

@Component({
  selector: 'app-meeting-planning',
  standalone: true,
  imports: [RouterLink, FormsModule, Icon, ButtonComponent, PageHeaderComponent, CardComponent],
  template: `
<div class="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">

  <app-page-header
    title="Planifier une réunion"
    subtitle="Créez une réunion individuelle ou de groupe."
    breadcrumb="Incubateur > Réunions > Planifier"
  >
    <app-button variant="secondary" size="sm" routerLink="/incubateur/reunions">
      <app-icon name="arrow-left" class="size-4 mr-1.5"/>Retour
    </app-button>
  </app-page-header>

  <app-card padding="lg" class="shadow-xs border border-line/60">
    <div class="space-y-5">

      <!-- Titre -->
      <div class="flex flex-col gap-1.5">
        <label for="titre-reunion" class="text-xs font-bold text-ink">Titre <span class="text-rose-500">*</span></label>
        <input
          id="titre-reunion"
          [(ngModel)]="titre"
          type="text"
          placeholder="Ex. Point hebdomadaire"
          class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      <!-- Type -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-ink">Type de réunion <span class="text-rose-500">*</span></label>
        <div class="grid grid-cols-2 gap-3">
          <label
            class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
            [class]="typeReunion() === 'INDIVIDUELLE' ? 'border-accent bg-accent/5' : 'border-line/60 hover:border-line'"
          >
            <input type="radio" value="INDIVIDUELLE" [checked]="typeReunion() === 'INDIVIDUELLE'" (change)="typeReunion.set('INDIVIDUELLE')" class="text-accent focus:ring-accent"/>
            <div class="min-w-0">
              <p class="text-xs font-bold text-ink">Individuelle</p>
              <p class="text-[11px] text-ink-muted mt-0.5">1:1 avec un entrepreneur</p>
            </div>
          </label>
          <label
            class="flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all"
            [class]="typeReunion() === 'GROUPE' ? 'border-accent bg-accent/5' : 'border-line/60 hover:border-line'"
          >
            <input type="radio" value="GROUPE" [checked]="typeReunion() === 'GROUPE'" (change)="typeReunion.set('GROUPE')" class="text-accent focus:ring-accent"/>
            <div class="min-w-0">
              <p class="text-xs font-bold text-ink">Groupe</p>
              <p class="text-[11px] text-ink-muted mt-0.5">Tous les projets d'une cohorte</p>
            </div>
          </label>
        </div>
      </div>

      <!-- Individuelle : sélection entrepreneur -->
      @if (typeReunion() === 'INDIVIDUELLE') {
        <div class="flex flex-col gap-1.5">
          <label for="entrepreneur-select" class="text-xs font-bold text-ink">Entrepreneur <span class="text-rose-500">*</span></label>
          @if (chargementEntrepreneurs()) {
            <p class="text-xs text-ink-muted animate-pulse">Chargement des entrepreneurs...</p>
          } @else {
            <select
              id="entrepreneur-select"
              [(ngModel)]="participantId"
              class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
            >
              <option value="">-- Choisir un entrepreneur --</option>
              @for (e of entrepreneurs(); track e.id) {
                <option [value]="e.id">{{ e.prenom }} {{ e.nom }}</option>
              }
            </select>
          }
        </div>
      }

      <!-- Groupe : sélection cohorte -->
      @if (typeReunion() === 'GROUPE') {
        <div class="flex flex-col gap-1.5">
          <label for="cohorte-select" class="text-xs font-bold text-ink">Cohorte <span class="text-rose-500">*</span></label>
          @if (chargementCohortes()) {
            <p class="text-xs text-ink-muted animate-pulse">Chargement des cohortes...</p>
          } @else {
            <select
              id="cohorte-select"
              [(ngModel)]="cohorteId"
              class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
            >
              <option value="">-- Choisir une cohorte --</option>
              @for (c of cohortes(); track c.id) {
                <option [value]="c.id">{{ c.nom }} — {{ c.phase?.nom ?? '' }}</option>
              }
            </select>
          }
          @if (cohorteId()) {
            <p class="text-[11px] text-ink-muted mt-0.5">
              Les participants seront automatiquement les entrepreneurs des projets actifs de cette cohorte.
            </p>
          }
        </div>
      }

      <!-- Mode -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-bold text-ink">Mode</label>
        <div class="flex gap-4">
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
            <input type="radio" value="ONLINE" [checked]="mode() === 'ONLINE'" (change)="mode.set('ONLINE')" class="text-accent"/>
            En ligne
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink">
            <input type="radio" value="PRESENTIEL" [checked]="mode() === 'PRESENTIEL'" (change)="mode.set('PRESENTIEL')" class="text-accent"/>
            Présentiel
          </label>
        </div>
      </div>
      @if (mode() === 'PRESENTIEL') {
  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

    <div class="flex flex-col gap-1.5">
      <label for="room-input" class="text-xs font-bold text-ink">
        Salle <span class="text-rose-500">*</span>
      </label>

      <input
        id="room-input"
        [(ngModel)]="roomIdentifier"
        type="text"
        placeholder="Ex. Salle de réunion A"
        class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label for="address-input" class="text-xs font-bold text-ink">
        Adresse <span class="text-rose-500">*</span>
      </label>

      <input
        id="address-input"
        [(ngModel)]="address"
        type="text"
        placeholder="Ex. Cité Keur Gorgui, Dakar"
        class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none transition-colors"
      />
    </div>

  </div>
}

      <!-- Date et durée -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="flex flex-col gap-1.5">
          <label for="scheduled-date" class="text-xs font-bold text-ink">Date et heure <span class="text-rose-500">*</span></label>
          <input
            id="scheduled-date"
            [(ngModel)]="scheduledAt"
            type="datetime-local"
            class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
          />
        </div>
        <div class="flex flex-col gap-1.5">
          <label for="duree-input" class="text-xs font-bold text-ink">Durée (min) <span class="text-rose-500">*</span></label>
          <input
            id="duree-input"
            [(ngModel)]="dureeMinutes"
            type="number"
            min="5"
            max="480"
            placeholder="60"
            class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
          />
        </div>
      </div>

      <!-- Description -->
      <div class="flex flex-col gap-1.5">
        <label for="description-input" class="text-xs font-bold text-ink">Description</label>
        <textarea
          id="description-input"
          [(ngModel)]="description"
          rows="3"
          placeholder="Ordre du jour optionnel..."
          class="w-full rounded-xl border border-line/60 bg-surface px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none resize-none transition-colors"
        ></textarea>
      </div>

      <!-- Erreur -->
      @if (erreur()) {
        <div class="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600" role="alert">
          <app-icon name="warning" class="size-4 shrink-0" />
          <span>{{ erreur() }}</span>
        </div>
      }

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 pt-4 border-t border-line/60">
        <app-button variant="secondary" size="sm" routerLink="/incubateur/reunions">Annuler</app-button>
        <app-button size="sm" [disabled]="creation()" (click)="planifier()">
          {{ creation() ? 'Création...' : 'Planifier' }}
        </app-button>
      </div>

    </div>
  </app-card>
</div>
  `,
})
export class MeetingPlanningComponent implements OnInit {
  private readonly meetingService = inject(MeetingService);
  private readonly cohorteService = inject(CohorteService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected roomIdentifier = '';
protected address = '';

  protected readonly typeReunion = signal<TypeReunion>('INDIVIDUELLE');
  protected readonly mode = signal<MeetingMode>('ONLINE');
  protected readonly cohortes = signal<Cohorte[]>([]);
  protected readonly entrepreneurs = signal<any[]>([]);
  protected readonly chargementCohortes = signal(false);
  protected readonly chargementEntrepreneurs = signal(false);
  protected readonly creation = signal(false);
  protected readonly erreur = signal<string | null>(null);

  protected titre = '';
  protected participantId = '';
  protected cohorteId = signal('');
  protected scheduledAt = '';
  protected dureeMinutes: number = 60;
  protected description = '';

  ngOnInit(): void {
    const cohorteIdParam = this.route.snapshot.queryParamMap.get('cohorteId');
    if (cohorteIdParam) {
      this.cohorteId.set(cohorteIdParam);
      this.typeReunion.set('GROUPE');
    }

    this.chargementCohortes.set(true);
    this.cohorteService.getActiveCohortes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => { this.cohortes.set(c); this.chargementCohortes.set(false); },
        error: () => this.chargementCohortes.set(false)
      });

    this.chargementEntrepreneurs.set(true);
    this.entrepreneurService.getEntrepreneurs()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e: any[]) => { this.entrepreneurs.set(e); this.chargementEntrepreneurs.set(false); },
        error: () => this.chargementEntrepreneurs.set(false)
      });
  }

  

  protected planifier(): void {
    this.erreur.set(null);
    if (!this.titre.trim()) { this.erreur.set('Le titre est obligatoire.'); return; }
    if (!this.scheduledAt) { this.erreur.set('La date et l\'heure sont obligatoires.'); return; }
    if (!this.dureeMinutes || this.dureeMinutes < 1) { this.erreur.set('La durée est obligatoire.'); return; }
    if (this.typeReunion() === 'INDIVIDUELLE' && !this.participantId) { this.erreur.set('Sélectionnez un entrepreneur.'); return; }
    if (this.typeReunion() === 'GROUPE' && !this.cohorteId()) { this.erreur.set('Sélectionnez une cohorte.'); return; }
if (this.mode() === 'PRESENTIEL' && !this.roomIdentifier.trim()) {
  this.erreur.set('La salle est obligatoire pour une réunion en présentiel.');
  return;
}

if (this.mode() === 'PRESENTIEL' && !this.address.trim()) {
  this.erreur.set("L'adresse est obligatoire pour une réunion en présentiel.");
  return;
}
    this.creation.set(true);

    const req: CreateMeetingRequest = {
  title: this.titre.trim(),
  description: this.description.trim() || undefined,
  type: this.typeReunion() === 'INDIVIDUELLE' ? 'INDIVIDUAL' : 'GROUP',
  mode: this.mode(),
  scheduledAt: this.scheduledAt,
  durationMinutes: this.dureeMinutes,

  ...(this.mode() === 'PRESENTIEL'
    ? {
        roomIdentifier: this.roomIdentifier.trim(),
        address: this.address.trim(),
      }
    : {}),

  ...(this.typeReunion() === 'INDIVIDUELLE'
    ? { participantId: this.participantId }
    : {}),

  ...(this.typeReunion() === 'GROUPE'
    ? { cohortId: this.cohorteId() }
    : {}),
};

    this.meetingService.createMeeting(req)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => { this.creation.set(false); this.router.navigate(['/incubateur/reunions']); },
        error: (err) => { this.creation.set(false); this.erreur.set(err?.error?.message ?? 'Erreur lors de la création.'); },
      });
  }
}