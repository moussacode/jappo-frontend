import { Component, inject, signal, output, OnInit, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Services & Modèles
import { CohorteService } from '../../../../core/services/cohorte.service';
import { EntrepreneurService, InvitationResultResponse } from '../../../../core/services/entrepreneur.service';
import { Cohorte } from '../../../../core/models';

// Design System Partagé
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { FormFieldComponent } from '../../../../shared/components/input/form-field.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

@Component({
  selector: 'app-inviter-entrepreneur-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Icon,
    ButtonComponent,
    FormFieldComponent,
    ModalComponent
],
  template: `
    <!-- Backdrop de la Modale -->
    <app-modal
    title="Inviter des entrepreneurs"
  subtitle="Ajoutez une ou plusieurs adresses email pour envoyer les invitations."
  maxWidth="lg"
  (close)="closeModal()">
      <form [formGroup]="form" (ngSubmit)="envoyer()" class="flex flex-col gap-5">
            
            <!-- Zone Multi-Emails (Chip Input) -->
            <app-form-field [label]="'Adresses Email (' + emails().length + ')'">
              <div class="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border border-line bg-surface p-2 transition-all focus-within:border-accent">
                
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

            <!-- Pied de Formulaire : Rôle + Boutons -->
            <div class="flex items-center justify-between  pt-4 mt-1">
              <span class="text-xs text-ink-muted">Rôle : <strong class="text-ink font-medium">Entrepreneur</strong></span>

              <div class="flex items-center gap-2">
                <app-button type="button" variant="ghost" size="sm" (click)="closeModal()">
                  Annuler
                </app-button>

                <app-button
                  type="submit"
                  size="sm"
                  [disabled]="(emails().length === 0 && !emailInputControl.value) || envoi()"
                >
                  @if (envoi()) {
                    <span class="animate-pulse">Envoi...</span>
                  } @else {
                    <app-icon name="plus" class="size-3.5 mr-1" />
                    <span>Envoyer ({{ totalInvitations() }})</span>
                  }
                </app-button>
              </div>
            </div>

            <!-- RETOURS & FEEDBACKS D'ENVOI -->
            @if (resultat(); as res) {
              @if (res.invites.length > 0) {
                <div class="flex flex-col gap-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
                  <div class="flex items-center gap-2 font-semibold">
                    <app-icon name="check" class="size-4 shrink-0" />
                    <span>{{ res.invites.length }} invitation(s) transmise(s) avec succès !</span>
                  </div>
                </div>
              }
              @if (res.dejaMembres.length > 0) {
                <div class="flex flex-col gap-1 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-700 dark:text-amber-400">
                  <div class="flex items-center gap-2 font-semibold">
                    <app-icon name="warning" class="size-4 shrink-0 text-amber-600" />
                    <span>{{ res.dejaMembres.length }} utilisateur(s) font déjà partie de l'incubateur.</span>
                  </div>
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
    </app-modal>
  `,
})
export class InviterEntrepreneurModalComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cohorteService = inject(CohorteService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly destroyRef = inject(DestroyRef);

  // Outputs pour communiquer avec la liste parente
  readonly close = output<void>();
  readonly invited = output<void>();

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

  protected closeModal(): void {
    this.close.emit();
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
          this.invited.emit(); // Notifie le parent pour rafraîchir la liste
          setTimeout(() => this.closeModal(), 1200); // Fermeture auto après succès
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