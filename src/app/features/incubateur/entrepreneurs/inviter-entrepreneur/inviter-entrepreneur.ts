import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService, InvitationResultResponse } from '../../../../core/services/entrepreneur.service';
import { Cohorte } from '../../../../core/models';
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';

@Component({
  selector: 'app-inviter-entrepreneur',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Icon, BadgeComponent],
  template: `
    <div class="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-xl min-w-0 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      
      <!-- Carte Modal SaaS / Notion -->
      <div class="w-full rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-[var(--shadow-subtle)] flex flex-col gap-6">
        
        <!-- En-tête -->
        <div class="flex items-start justify-between gap-4">
          <div class="flex flex-col gap-1">
            <h1 class="text-lg font-bold text-ink">Inviter des entrepreneurs</h1>
            <p class="text-xs text-ink-muted leading-relaxed">
              Appuyez sur <kbd class="rounded border border-line bg-surface-muted px-1 py-0.5 text-[10px]">Entrée</kbd> ou <kbd class="rounded border border-line bg-surface-muted px-1 py-0.5 text-[10px]">Virgule</kbd> pour valider un email. <span class="text-ink-muted/80">(Double-cliquez pour corriger)</span>
            </p>
          </div>

          <a
            routerLink="/incubateur/entrepreneurs"
            class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors"
          >
            <app-icon name="arrow-left" class="size-3.5" />
            <span>Entrepreneurs</span>
          </a>
        </div>

        <!-- Formulaire d'invitation -->
        <form [formGroup]="form" (ngSubmit)="envoyer()" class="flex flex-col gap-5">
          
          <!-- Zone Multi-Emails (Chip Input avec Édition) -->
          <!-- Zone Multi-Emails Ajustable Dynamiquement -->
<div class="flex flex-col gap-1.5">
  <label class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
    Adresses Email ({{ emails().length }})
  </label>
  
  <!-- min-h-[42px] au lieu de min-h-[84px] -->
  <div class="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-2 transition-all focus-within:border-accent">
    
    <!-- Badges (Double-clic pour éditer) -->
    @for (email of emails(); track email) {
      <span 
        (dblclick)="editerEmail(email)"
        title="Double-cliquez pour modifier"
        class="flex cursor-pointer items-center gap-1.5 rounded-lg border border-line bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink transition-all hover:border-accent/40 hover:bg-accent-soft/30"
      >
        <span class="select-none">{{ email }}</span>
        <button
          type="button"
          (click)="retirerEmail(email); $event.stopPropagation()"
          class="text-ink-muted hover:text-danger-500 cursor-pointer transition-colors flex items-center justify-center rounded-full p-0.5 hover:bg-danger-500/10"
          title="Supprimer"
        >
          <app-icon name="close" size="xs" />
        </button>
      </span>
    }

    <!-- Champ de Saisie Compact -->
    <input
      type="email"
      [formControl]="emailInputControl"
      (keydown)="onKeyDown($event)"
      placeholder="{{ emails().length === 0 ? 'ex. jean@societe.sn, marie@societe.sn' : 'Ajouter un autre email...' }}"
      class="flex-1 min-w-[200px] border-none bg-transparent px-1 py-1 text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none"
    />
  </div>
</div>

          <!-- Choix Cohorte -->
          <div class="flex flex-col gap-1.5">
            <label class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Cohorte de destination <span class="text-ink-muted/60 font-normal">(Optionnel)</span>
            </label>
            <select
              formControlName="cohorteId"
              class="w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
            >
              <option value="">Aucune cohorte (Assignation ultérieure)</option>
              @for (c of cohortes(); track c.id) {
                <option [value]="c.id">{{ c.nom }}</option>
              }
            </select>
          </div>

          <!-- Bouton d'Envoi -->
          <button
            type="submit"
            [disabled]="(emails().length === 0 && !emailInputControl.value) || envoi()"
            class="w-full flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-action-fill py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            @if (envoi()) {
              <span class="animate-pulse">Envoi en cours...</span>
            } @else {
              <span>Envoyer {{ totalInvitations() }} invitation(s)</span>
            }
          </button>

          <!-- FEEDBACK COMPLETS -->
          @if (resultat(); as res) {
            
            <!-- Succès -->
            @if (res.invites.length > 0) {
              <div class="flex flex-col gap-1 rounded-xl bg-success-500/10 border border-success-500/20 p-3.5 text-xs text-success-600">
                <div class="flex items-center gap-2 font-semibold">
                  <app-icon name="check" class="size-4 shrink-0" />
                  <span>{{ res.invites.length }} invitation(s) transmise(s) avec succès :</span>
                </div>
                <p class="text-[11px] opacity-80 pl-6">{{ res.invites.join(', ') }}</p>
              </div>
            }

            <!-- Déjà membres -->
            @if (res.dejaMembres.length > 0) {
              <div class="flex flex-col gap-1 rounded-xl bg-warning-500/10 border border-warning-500/20 p-3.5 text-xs text-warning-700">
                <div class="flex items-center gap-2 font-semibold">
                  <app-icon name="warning" class="size-4 shrink-0 text-warning-600" />
                  <span>{{ res.dejaMembres.length }} utilisateur(s) font déjà partie de votre incubateur :</span>
                </div>
                <p class="text-[11px] opacity-90 pl-6">{{ res.dejaMembres.join(', ') }}</p>
              </div>
            }

          }

          @if (errorMessage()) {
            <div class="flex items-center gap-2 rounded-xl bg-danger-500/10 border border-danger-500/20 p-3 text-xs text-danger-600">
              <span>{{ errorMessage() }}</span>
            </div>
          }
        </form>

        <!-- Bas de carte -->
        <div class="border-t border-line pt-4 flex items-center justify-between text-xs text-ink-muted">
          <span>Rôle attribué : <strong>Entrepreneur</strong></span>
          <span class="text-[11px]">Token valide 7 jours</span>
        </div>

      </div>
    </div>
  `,
})
export class InviterEntrepreneur implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cohorteService = inject(CohorteService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly cohortes = signal<Cohorte[]>([]);
  protected readonly emails = signal<string[]>([]);
  protected readonly envoi = signal(false);
  protected readonly resultat = signal<InvitationResultResponse | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly emailInputControl = this.fb.control('');

  protected readonly form = this.fb.nonNullable.group({
    cohorteId: [''],
  });

  ngOnInit(): void {
    this.cohorteService
      .getCohortes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (c) => this.cohortes.set(c),
        error: (err) => console.error('Erreur chargement cohortes:', err),
      });
  }

  protected onKeyDown(event: KeyboardEvent): void {
    if (['Enter', ',', ' '].includes(event.key)) {
      event.preventDefault();
      this.ajouterEmailCourant();
    }
  }

  private ajouterEmailCourant(): void {
    const val = this.emailInputControl.value?.trim().toLowerCase();
    if (val && this.validerEmail(val) && !this.emails().includes(val)) {
      this.emails.update((list) => [...list, val]);
      this.emailInputControl.setValue('');
    }
  }

  protected editerEmail(emailAEditer: string): void {
    // 1. Remet l'email sélectionné dans le champ de saisie
    this.emailInputControl.setValue(emailAEditer);
    // 2. Le retire temporairement de la liste de puces
    this.retirerEmail(emailAEditer);
  }

  protected retirerEmail(emailARetirer: string): void {
    this.emails.update((list) => list.filter((e) => e !== emailARetirer));
  }

  protected totalInvitations(): number {
    const aSaisir = this.emailInputControl.value?.trim();
    return this.emails().length + (aSaisir && this.validerEmail(aSaisir) ? 1 : 0);
  }

  protected envoyer(): void {
    this.ajouterEmailCourant();

    const listeEmails = this.emails();
    if (listeEmails.length === 0) return;

    this.envoi.set(true);
    this.resultat.set(null);
    this.errorMessage.set(null);

    const { cohorteId } = this.form.getRawValue();

    this.entrepreneurService
      .inviterMultiple({
        emails: listeEmails,
        cohorteId: cohorteId || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.envoi.set(false);
          this.resultat.set(res);
          this.emails.set([]);
          this.form.reset();
        },
        error: (err) => {
          console.error('Erreur envoi invitations:', err);
          this.envoi.set(false);
          this.errorMessage.set(
            err?.error?.message ?? "Impossible d'envoyer les invitations pour le moment."
          );
        },
      });
  }

  private validerEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}