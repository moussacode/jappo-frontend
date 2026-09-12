import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService, InvitationResultResponse } from '../../../../core/services/entrepreneur.service';
import { Cohorte } from '../../../../core/models';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';

@Component({
  selector: 'app-inviter-entrepreneur',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    Icon,
    BadgeComponent,
    CardComponent,
    ButtonComponent,
    FormFieldComponent,
  ],
  template: `
    <div class="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-xl min-w-0 flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      
      <!-- Carte SaaS / Notion Design System -->
      <app-card padding="lg" class="w-full shadow-xs">
        <div class="flex flex-col gap-6">
          
          <!-- En-tête de la Carte -->
          <div class="flex items-start justify-between gap-4">
            <div class="flex flex-col gap-0.5">
              <h1 class="text-base font-bold text-ink">Inviter des entrepreneurs</h1>
              <p class="text-xs text-ink-muted">
                Validez un email avec <kbd class="rounded border border-line bg-surface-muted px-1 py-0.2 text-[10px] font-mono text-ink">Entrée</kbd> ou <kbd class="rounded border border-line bg-surface-muted px-1 py-0.2 text-[10px] font-mono text-ink">,</kbd>
              </p>
            </div>

            <a routerLink="/incubateur/entrepreneurs">
              <app-button variant="ghost" size="xs">
                <app-icon name="arrow-left" class="size-3.5" />
                <span>Retour</span>
              </app-button>
            </a>
          </div>

          <!-- Formulaire d'invitation -->
          <form [formGroup]="form" (ngSubmit)="envoyer()" class="flex flex-col gap-5">
            
            <!-- Zone Multi-Emails (Chip Input) -->
            <app-form-field [label]="'Adresses Email (' + emails().length + ')'">
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
                      class="text-ink-muted hover:text-rose-600 cursor-pointer transition-colors flex items-center justify-center rounded-full p-0.5 hover:bg-rose-500/10"
                      title="Supprimer"
                    >
                      <app-icon name="close" class="size-3" />
                    </button>
                  </span>
                }

                <!-- Champ de Saisie Compact -->
                <input
                  type="email"
                  [formControl]="emailInputControl"
                  (keydown)="onKeyDown($event)"
                  placeholder="{{ emails().length === 0 ? 'ex. jean@societe.sn, marie@societe.sn' : 'Ajouter un email...' }}"
                  class="flex-1 min-w-[180px] border-none bg-transparent px-1 py-1 text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none"
                />
              </div>
            </app-form-field>

            <!-- Choix Cohorte -->
            <app-form-field label="Cohorte de destination (Optionnel)">
              <select
                formControlName="cohorteId"
                class="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Aucune cohorte (Assignation ultérieure)</option>
                @for (c of cohortes(); track c.id) {
                  <option [value]="c.id">{{ c.nom }}</option>
                }
              </select>
            </app-form-field>

            <!-- Pied de Formulaire : Rôle + Boutons Alignés à Droite (Notion Style) -->
            <div class="flex items-center justify-between border-t border-line pt-4 mt-1">
              <span class="text-xs text-ink-muted">Rôle : <strong class="text-ink font-medium">Entrepreneur</strong></span>

              <div class="flex items-center gap-2">
                <a routerLink="/incubateur/entrepreneurs">
                  <app-button type="button" variant="ghost" size="sm">
                    Annuler
                  </app-button>
                </a>

                <app-button
                  type="submit"
                  size="sm"
                  [disabled]="(emails().length === 0 && !emailInputControl.value) || envoi()"
                >
                  @if (envoi()) {
                    <span class="animate-pulse">Envoi...</span>
                  } @else {
                    <app-icon name="plus" class="size-3.5" />
                    <span>Envoyer ({{ totalInvitations() }})</span>
                  }
                </app-button>
              </div>
            </div>

            <!-- RETOURS & FEEDBACKS D'ENVOI -->
            @if (resultat(); as res) {
              
              <!-- Succès -->
              @if (res.invites.length > 0) {
                <div class="flex flex-col gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  <div class="flex items-center gap-2 font-semibold">
                    <app-icon name="check" class="size-4 shrink-0" />
                    <span>{{ res.invites.length }} invitation(s) transmise(s) avec succès :</span>
                  </div>
                  <p class="text-[11px] opacity-80 pl-6">{{ res.invites.join(', ') }}</p>
                </div>
              }

              <!-- Déjà membres -->
              @if (res.dejaMembres.length > 0) {
                <div class="flex flex-col gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <div class="flex items-center gap-2 font-semibold">
                    <app-icon name="warning" class="size-4 shrink-0 text-amber-600" />
                    <span>{{ res.dejaMembres.length }} utilisateur(s) font déjà partie de votre incubateur :</span>
                  </div>
                  <p class="text-[11px] opacity-90 pl-6">{{ res.dejaMembres.join(', ') }}</p>
                </div>
              }

            }

            @if (errorMessage()) {
              <div class="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">
                <app-icon name="warning" class="size-4 shrink-0" />
                <span>{{ errorMessage() }}</span>
              </div>
            }
          </form>

        </div>
      </app-card>
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
  protected readonly envoi = signal<boolean>(false);
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
    this.emailInputControl.setValue(emailAEditer);
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