import { Component, input, output, OnInit, inject, signal, computed } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { EntrepreneurService, EntrepreneurResponse } from '../../../../core/services/entrepreneur.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { Cohorte } from '../../../../core/models';

@Component({
  selector: 'app-nouveau-projet-modal',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, Icon, ButtonComponent, ModalComponent, BadgeComponent],
  template: `
    <app-modal
      title="Ajouter un projet"
      subtitle="Renseignez les informations du projet et associez-le à son entrepreneur porteur."
      maxWidth="lg"
      (close)="close.emit()"
    >
      <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">

        <!-- ========================================== -->
        <!-- CAS 1 : ENTREPRENEUR PRÉSÉLECTIONNÉ (CONTEXTE VERROUILLÉ) -->
        <!-- ========================================== -->
        @if (preselectedEntrepreneurId()) {
          <div class="rounded-xl border border-line bg-surface-muted/60 p-4 flex items-center justify-between gap-3 shadow-xs">
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-white font-bold text-sm shadow-xs">
                {{ getInitials(preselectedEntrepreneurName() || 'EP') }}
              </div>
              <div class="flex flex-col min-w-0">
                <span class="text-xs font-bold text-ink truncate">{{ preselectedEntrepreneurName() || 'Entrepreneur' }}</span>
                <span class="text-[11px] text-ink-muted truncate">
                  @if (preselectedCohorteNom()) {
                    Cohorte : <strong class="text-ink font-medium">{{ preselectedCohorteNom() }}</strong>
                  } @else {
                    Entrepreneur porteur du projet
                  }
                </span>
              </div>
            </div>
            <div class="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 shrink-0">
              <app-icon name="check" class="size-3.5" />
              <span>Contexte lié</span>
            </div>
          </div>
        } @else {
          <!-- ========================================== -->
          <!-- CAS 2 & 3 : SÉLECTEUR RECHERCHABLE + INVITATION INLINE -->
          <!-- ========================================== -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs font-semibold text-ink-muted">Entrepreneur porteur du projet *</label>
              <button
                type="button"
                (click)="toggleInlineInvite()"
                class="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline cursor-pointer"
              >
                <app-icon name="plus" class="size-3.5" />
                <span>{{ showInlineInvite() ? 'Choisir un existant' : 'Inviter un entrepreneur' }}</span>
              </button>
            </div>

            <!-- Sous-formulaire d'invitation directe inline -->
            @if (showInlineInvite()) {
              <div class="rounded-xl border border-accent/30 bg-accent-soft/40 p-3.5 flex flex-col gap-3">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-ink">Inviter un nouvel entrepreneur</span>
                  <span class="text-[11px] text-ink-muted">Il sera automatiquement rattaché au projet</span>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    [(ngModel)]="inlineEmail"
                    [ngModelOptions]="{standalone: true}"
                    placeholder="Adresse email *"
                    class="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/60 focus:border-accent focus:outline-none"
                  />
                  <select
                    [(ngModel)]="inlineCohorteId"
                    [ngModelOptions]="{standalone: true}"
                    class="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-accent focus:outline-none cursor-pointer"
                  >
                    <option value="">Sélectionner une cohorte (opt.)</option>
                    @for (c of cohortes(); track c.id) {
                      <option [value]="c.id">{{ c.nom }}</option>
                    }
                  </select>
                </div>

                @if (inlineInviteError()) {
                  <p class="text-[11px] text-rose-600 font-medium">{{ inlineInviteError() }}</p>
                }

                <div class="flex justify-end gap-2">
                  <app-button variant="ghost" size="sm" type="button" (click)="showInlineInvite.set(false)">
                    Annuler
                  </app-button>
                  <app-button size="sm" type="button" (click)="inviterEtSelectionner()" [disabled]="isInviting() || !inlineEmail.trim()">
                    {{ isInviting() ? 'Invitation en cours...' : 'Inviter & Sélectionner' }}
                  </app-button>
                </div>
              </div>
            } @else {
              <!-- Carte entrepreneur sélectionné -->
              @if (selectedEntrepreneur()) {
                <div class="flex items-center justify-between rounded-xl border border-accent/30 bg-accent-soft/30 p-3 shadow-xs">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-white text-xs font-bold">
                      {{ getInitials(afficherNomEntrepreneur(selectedEntrepreneur()!)) }}
                    </div>
                    <div class="flex flex-col min-w-0">
                      <span class="text-xs font-bold text-ink truncate">{{ afficherNomEntrepreneur(selectedEntrepreneur()!) }}</span>
                      <span class="text-[11px] text-ink-muted truncate">
                        {{ selectedEntrepreneur()!.email }}
                        @if (selectedEntrepreneur()!.nomCohorte) {
                          · Cohorte: {{ selectedEntrepreneur()!.nomCohorte }}
                        }
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    (click)="changerEntrepreneur()"
                    class="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer shrink-0"
                  >
                    <app-icon name="x" class="size-3" />
                    <span>Changer</span>
                  </button>
                </div>
              } @else {
                <!-- Champ de recherche autocomplète -->
                <div class="relative">
                  <div class="relative">
                    <input
                      type="text"
                      [value]="searchQuery()"
                      (input)="onSearchInput($event)"
                      (focus)="dropdownOpen.set(true)"
                      placeholder="Rechercher par nom, prénom, email, cohorte..."
                      class="w-full rounded-xl border border-line bg-surface py-2.5 pl-9 pr-4 text-xs text-ink placeholder:text-ink-muted/60 transition-colors focus:border-accent focus:outline-none"
                    />
                    <app-icon name="search" class="absolute left-3 top-3 size-4 text-ink-muted" />
                  </div>

                  <!-- Menu déroulant des résultats -->
                  @if (dropdownOpen()) {
                    <div class="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
                      @if (isLoadingEntrepreneurs()) {
                        <div class="p-3 text-center text-xs text-ink-muted">Chargement des entrepreneurs...</div>
                      } @else if (entrepreneursFiltrees().length === 0) {
                        <div class="p-4 text-center flex flex-col items-center gap-2">
                          <p class="text-xs text-ink-muted">Aucun entrepreneur trouvé pour "{{ searchQuery() }}".</p>
                          <button
                            type="button"
                            (click)="toggleInlineInvite()"
                            class="inline-flex items-center gap-1 text-xs font-bold text-accent hover:underline cursor-pointer"
                          >
                            <app-icon name="plus" class="size-3.5" />
                            <span>Inviter cet entrepreneur maintenant</span>
                          </button>
                        </div>
                      } @else {
                        @for (e of entrepreneursFiltrees(); track e.id) {
                          <div
                            (click)="selectEntrepreneur(e)"
                            class="flex items-center justify-between rounded-lg p-2.5 hover:bg-surface-muted transition-colors cursor-pointer"
                          >
                            <div class="flex items-center gap-2.5 min-w-0">
                              <div class="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[10px] font-bold text-accent">
                                {{ getInitials(afficherNomEntrepreneur(e)) }}
                              </div>
                              <div class="flex flex-col min-w-0">
                                <span class="text-xs font-semibold text-ink truncate">{{ afficherNomEntrepreneur(e) }}</span>
                                <span class="text-[11px] text-ink-muted truncate">{{ e.email }}</span>
                              </div>
                            </div>
                            @if (e.nomCohorte) {
                              <span class="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] font-medium text-ink-muted shrink-0">
                                {{ e.nomCohorte }}
                              </span>
                            }
                          </div>
                        }
                      }
                    </div>
                  }
                </div>
              }
            }
          </div>
        }

        <!-- Informations Projet -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-ink-muted">Nom du projet / Startup *</label>
          <input
            type="text"
            formControlName="nom"
            placeholder="Ex: SenTech Solutions"
            class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-ink-muted">Secteur d'activité</label>
            <input
              type="text"
              formControlName="secteur"
              placeholder="Ex: FinTech, AgriTech, Santé..."
              class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-ink-muted">Cohorte associée</label>
            @if (preselectedCohorteId() || selectedEntrepreneur()?.cohorteId) {
              <div class="rounded-xl border border-line bg-surface-muted px-3 py-2.5 text-sm text-ink flex items-center justify-between">
                <span class="truncate">{{ preselectedCohorteNom() || selectedEntrepreneur()?.nomCohorte || 'Cohorte liée' }}</span>
                <app-icon name="lock" class="size-3.5 text-ink-muted" />
              </div>
            } @else {
              <select
                formControlName="cohorteId"
                class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-accent focus:outline-none cursor-pointer"
              >
                <option value="">Aucune cohorte (Indépendant)</option>
                @for (c of cohortes(); track c.id) {
                  <option [value]="c.id">{{ c.nom }}</option>
                }
              </select>
            }
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-ink-muted">Description</label>
          <textarea
            formControlName="description"
            rows="2"
            placeholder="Brève présentation des objectifs et de la proposition de valeur..."
            class="rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-ink-muted/50 focus:border-accent focus:outline-none resize-none"
          ></textarea>
        </div>

        @if (errorMessage()) {
          <div class="rounded-xl bg-rose-50 p-3 text-xs text-rose-600 border border-rose-100 dark:bg-rose-950/30 dark:border-rose-900/50">
            {{ errorMessage() }}
          </div>
        }

        <div class="mt-4 flex items-center justify-end gap-3 border-t border-line pt-4">
          <app-button variant="ghost" size="sm" type="button" (click)="close.emit()">Annuler</app-button>
          <app-button size="sm" type="submit" [disabled]="submitting() || form.invalid || !isEntrepreneurSelected()">
            {{ submitting() ? 'Création en cours…' : 'Créer le projet' }}
          </app-button>
        </div>
      </form>
    </app-modal>
  `
})
export class NouveauProjetModal implements OnInit {
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly cohorteService = inject(CohorteService);

  // Entrées contextuelles
  cohorteId = input<string | undefined>(undefined);
  preselectedEntrepreneurId = input<string | undefined>(undefined);
  preselectedEntrepreneurName = input<string | undefined>(undefined);
  preselectedCohorteId = input<string | undefined>(undefined);
  preselectedCohorteNom = input<string | undefined>(undefined);
  submitting = input<boolean>(false);
  errorMessage = input<string | null>(null);

  close = output<void>();
  created = output<{ nom: string; description?: string; secteur?: string; cohorteId?: string; entrepreneurId?: string }>();

  // État local
  entrepreneurs = signal<EntrepreneurResponse[]>([]);
  cohortes = signal<Cohorte[]>([]);
  isLoadingEntrepreneurs = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedEntrepreneur = signal<EntrepreneurResponse | null>(null);
  dropdownOpen = signal<boolean>(false);

  // État invitation inline
  showInlineInvite = signal<boolean>(false);
  isInviting = signal<boolean>(false);
  inlineEmail = '';
  inlineCohorteId = '';
  inlineInviteError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    nom: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    secteur: new FormControl('', { nonNullable: true }),
    cohorteId: new FormControl('', { nonNullable: true }),
  });

  protected readonly entrepreneursFiltrees = computed(() => {
    const list = this.entrepreneurs();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return list;
    return list.filter((e) => {
      const nomComplet = `${e.prenom || ''} ${e.nom || ''}`.toLowerCase();
      const email = (e.email || '').toLowerCase();
      const cohorte = (e.nomCohorte || '').toLowerCase();
      return nomComplet.includes(query) || email.includes(query) || cohorte.includes(query);
    });
  });

  ngOnInit(): void {
    if (this.cohorteId()) {
      this.form.patchValue({ cohorteId: this.cohorteId() });
    } else if (this.preselectedCohorteId()) {
      this.form.patchValue({ cohorteId: this.preselectedCohorteId() });
    }

    // Charger les listes nécessaires si on n'a pas de contexte pré-rempli complet
    if (!this.preselectedEntrepreneurId()) {
      this.chargerEntrepreneurs();
      this.chargerCohortes();
    }
  }

  protected isEntrepreneurSelected(): boolean {
    if (this.preselectedEntrepreneurId()) return true;
    return this.selectedEntrepreneur() !== null;
  }

  private chargerEntrepreneurs(): void {
    this.isLoadingEntrepreneurs.set(true);
    this.entrepreneurService.getEntrepreneurs().subscribe({
      next: (data) => {
        this.entrepreneurs.set(data);
        this.isLoadingEntrepreneurs.set(false);
      },
      error: () => {
        this.isLoadingEntrepreneurs.set(false);
      }
    });
  }

  private chargerCohortes(): void {
    this.cohorteService.getCohortes().subscribe({
      next: (data) => this.cohortes.set(data),
      error: () => {}
    });
  }

  protected onSearchInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.searchQuery.set(val);
    this.dropdownOpen.set(true);
  }

  protected selectEntrepreneur(e: EntrepreneurResponse): void {
    this.selectedEntrepreneur.set(e);
    this.dropdownOpen.set(false);
    this.searchQuery.set('');
    if (e.cohorteId && !this.form.get('cohorteId')?.value) {
      this.form.patchValue({ cohorteId: e.cohorteId });
    }
  }

  protected changerEntrepreneur(): void {
    this.selectedEntrepreneur.set(null);
    this.searchQuery.set('');
  }

  protected toggleInlineInvite(): void {
    this.showInlineInvite.update((v) => !v);
    this.inlineInviteError.set(null);
  }

  protected inviterEtSelectionner(): void {
    const email = this.inlineEmail.trim().toLowerCase();
    if (!email) return;

    this.isInviting.set(true);
    this.inlineInviteError.set(null);

    this.entrepreneurService.inviterMultiple({
      emails: [email],
      cohorteId: this.inlineCohorteId || undefined,
    }).subscribe({
      next: () => {
        // Rafraîchir la liste et auto-sélectionner
        this.entrepreneurService.getEntrepreneurs().subscribe({
          next: (list) => {
            this.entrepreneurs.set(list);
            const nouvel = list.find((e) => e.email.toLowerCase() === email);
            if (nouvel) {
              this.selectEntrepreneur(nouvel);
            } else {
              // Fallback s'il n'est pas encore renvoyé
              this.selectedEntrepreneur.set({
                id: '',
                email,
                statutInvitation: 'EN_ATTENTE',
                cohorteId: this.inlineCohorteId || undefined
              });
            }
            this.isInviting.set(false);
            this.showInlineInvite.set(false);
            this.inlineEmail = '';
          },
          error: () => {
            this.isInviting.set(false);
            this.showInlineInvite.set(false);
          }
        });
      },
      error: (err) => {
        this.isInviting.set(false);
        this.inlineInviteError.set(err?.error?.message || "Erreur lors de l'envoi de l'invitation.");
      }
    });
  }

  protected afficherNomEntrepreneur(e: EntrepreneurResponse): string {
    const prenom = e.prenom?.trim();
    const nom = e.nom?.trim();
    if (prenom || nom) {
      return `${prenom || ''} ${nom || ''}`.trim();
    }
    return e.email;
  }

  protected getInitials(nom: string): string {
    if (!nom) return 'EP';
    const parts = nom.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nom.substring(0, 2).toUpperCase();
  }

  protected onSubmit(): void {
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    const entrepreneurId = this.preselectedEntrepreneurId() || this.selectedEntrepreneur()?.id;
    const finalCohorteId = this.preselectedCohorteId() || this.selectedEntrepreneur()?.cohorteId || val.cohorteId || undefined;

    this.created.emit({
      nom: val.nom.trim(),
      description: val.description.trim() || undefined,
      secteur: val.secteur.trim() || undefined,
      cohorteId: finalCohorteId || undefined,
      entrepreneurId: entrepreneurId ? entrepreneurId : undefined
    });
  }
}