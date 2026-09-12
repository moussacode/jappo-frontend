import {
  Component,
  inject,
  signal,
  output,
  HostListener,
  OnInit,
  DestroyRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '../icon/icon';
import { StructureContextService } from '../../../core/services/structure-context.service';
import { StructureService } from '../../../core/services/structure.service';
import {
  InvitationService,
  MembreEquipe,
  RoleEquipe,
} from '../../../core/services/invitation.service';
import { ButtonComponent } from '../button/button.component';

export type SettingTab = 'general' | 'compte' | 'preferences' | 'equipe';

@Component({
  selector: 'app-parametres-modal',
  standalone: true,
  imports: [FormsModule, Icon, ButtonComponent],
  template: `
    <div class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div class="relative flex h-[85vh] max-h-[680px] w-full max-w-4xl overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl animate-in zoom-in-95 duration-200">
        
        <!-- Bouton Fermer -->
        <button
          type="button"
          (click)="closeModal()"
          class="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-muted hover:text-ink transition-colors cursor-pointer"
        >
          <app-icon name="x" class="size-4" />
        </button>

        <!-- Navigation de la Modal -->
        <div class="w-60 border-r border-line bg-surface-muted/30 p-3 flex flex-col justify-between shrink-0">
          <div class="flex flex-col gap-1">
            <div class="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Réglages</div>

            <button
              type="button"
              (click)="switchTab('general')"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer"
              [class]="activeTab() === 'general' ? 'bg-surface-muted text-ink font-semibold' : 'text-ink-muted hover:text-ink'"
            >
              <app-icon name="settings" class="size-4" />
              <span>Général</span>
            </button>

            <button
              type="button"
              (click)="switchTab('compte')"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer"
              [class]="activeTab() === 'compte' ? 'bg-surface-muted text-ink font-semibold' : 'text-ink-muted hover:text-ink'"
            >
              <span>Organisation & Structure</span>
            </button>

            <button
              type="button"
              (click)="switchTab('equipe')"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer"
              [class]="activeTab() === 'equipe' ? 'bg-surface-muted text-ink font-semibold' : 'text-ink-muted hover:text-ink'"
            >
              <app-icon name="users" class="size-4" />
              <span>Membres de l'équipe</span>
            </button>

            <button
              type="button"
              (click)="switchTab('preferences')"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors text-left cursor-pointer"
              [class]="activeTab() === 'preferences' ? 'bg-surface-muted text-ink font-semibold' : 'text-ink-muted hover:text-ink'"
            >
              <app-icon name="bell" class="size-4" />
              <span>Apparence & Langue</span>
            </button>
          </div>
        </div>

        <!-- Contenu de la Modal -->
        <div class="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          <!-- TAB: ÉQUIPE -->
          @if (activeTab() === 'equipe') {
            <div class="flex flex-col gap-6 max-w-xl animate-in fade-in duration-150">
              <div>
                <h2 class="text-lg font-bold text-ink">Inviter un membre de l'équipe</h2>
                <p class="mt-1 text-xs text-ink-muted">Gérez l'équipe interne de l'incubateur (administrateurs et coachs).</p>
              </div>

              <!-- Formulaire Invitation Email -->
              <div class="flex flex-col gap-2">
                <label class="text-xs font-semibold text-ink">Adresse email</label>
                <div class="flex items-center gap-2">
                  <input
                    type="email"
                    [ngModel]="inviteEmail()"
                    (ngModelChange)="inviteEmail.set($event)"
                    placeholder="contact@exemple.com"
                    class="flex-1 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs text-ink focus:border-accent focus:outline-none transition-colors"
                  />

                  <select
                    [ngModel]="selectedRole()"
                    (ngModelChange)="selectedRole.set($event)"
                    class="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink font-medium focus:border-accent focus:outline-none cursor-pointer"
                  >
                    <option value="COACH">Coach</option>
                    <option value="ADMIN_STRUCTURE">Administrateur</option>
                  </select>

                  <button
                    type="button"
                    (click)="envoyerInvitation()"
                    [disabled]="isSending() || !inviteEmail()"
                    class="shrink-0 rounded-xl bg-ink px-4 py-2.5 text-xs font-semibold text-surface transition-all hover:bg-ink/90 disabled:opacity-50 cursor-pointer"
                  >
                    {{ isSending() ? 'Envoi...' : 'Envoyer' }}
                  </button>
                </div>
              </div>

              <!-- Liste des membres -->
              <div class="flex flex-col gap-3 pt-2">
                <p class="text-xs font-semibold text-ink">Membres de l'équipe ({{ membres().length }})</p>
                
                <div class="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                  @for (m of membres(); track m.id) {
                    <div class="flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-surface p-2.5 transition-colors hover:bg-surface-muted/30">
                      
                      <!-- Infos du membre -->
                      <div class="flex items-center gap-3 min-w-0">
                        <div class="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent-strong uppercase">
                          {{ getInitiales(m.prenom, m.nom) }}
                        </div>
                        <div class="flex flex-col min-w-0">
                          <div class="flex items-center gap-2">
                            <span class="truncate text-xs font-semibold text-ink leading-tight">
                              {{ m.prenom || 'Utilisateur' }} {{ m.nom || 'Invité' }}
                            </span>
                          </div>
                          <span class="truncate text-[11px] text-ink-muted leading-tight mt-0.5">{{ m.email }}</span>
                        </div>
                      </div>

                      <!-- Zone d'actions : Statut & Rôle -->
                      <div class="flex items-center gap-3 shrink-0">
                        
                        <!-- Badges de Statut -->
                        @if (m.statut === 'ACCEPTE') {
                          <span class="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-600 border border-emerald-200">
                            Actif
                          </span>
                        } @else if (m.statut === 'EN_ATTENTE') {
                          <div class="flex items-center gap-2">
                            <span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-600 border border-amber-200">
                              En attente
                            </span>
                            <button 
                              type="button"
                              (click)="renvoyerInvitation(m.email, m.role)"
                              class="text-[10px] font-medium text-accent hover:underline cursor-pointer"
                            >
                              Renvoyer
                            </button>
                          </div>
                        }

                        <!-- Sélection de Rôle -->
                        @if (m.estProprietaire) {
                          <span class="px-2.5 py-1 text-xs font-medium text-ink-muted bg-surface-muted/60 rounded-lg select-none">
                            Propriétaire
                          </span>
                        } @else {
                          <select
                            [value]="m.role"
                            (change)="changerRole(m.id, $any($event.target).value)"
                            class="rounded-lg border border-line bg-surface-muted/50 px-2.5 py-1.5 text-xs font-medium text-ink focus:border-accent focus:outline-none cursor-pointer"
                          >
                            <option value="ADMIN_STRUCTURE">Administrateur</option>
                            <option value="COACH">Coach</option>
                          </select>
                        }
                      </div>

                    </div>
                  } @empty {
                    <div class="py-6 text-center text-xs text-ink-muted">Aucun membre d'équipe configuré.</div>
                  }
                </div>
              </div>

              <!-- Bloc Lien Direct Dynamique -->
              <div class="flex flex-col gap-2 pt-3 border-t border-line">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <label class="text-xs font-semibold text-ink">Lien d'invitation direct</label>
                    @if (inviteShareLink()) {
                      <span class="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-emerald-500/20">Actif</span>
                    } @else {
                      <span class="inline-flex items-center rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-600 ring-1 ring-rose-500/20">Désactivé</span>
                    }
                  </div>

                  <select
                    [ngModel]="shareLinkRole()"
                    (ngModelChange)="changerRoleLienPartage($event)"
                    class="rounded-lg border border-line bg-surface px-2 py-1 text-[11px] font-medium text-ink focus:outline-none cursor-pointer"
                  >
                    <option value="COACH">Rôle : Coach</option>
                    <option value="ADMIN_STRUCTURE">Rôle : Administrateur</option>
                  </select>
                </div>

                @if (inviteShareLink()) {
                  <div class="flex items-center gap-2">
                    <input
                      type="text"
                      readonly
                      [value]="inviteShareLink()"
                      class="w-full rounded-xl border border-line bg-surface-muted/40 px-3.5 py-2.5 text-xs text-ink-muted select-all focus:outline-none"
                    />

                    <!-- Copier -->
                    <button
                      type="button"
                      (click)="copierLien()"
                      class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                      [title]="lienCopie() ? 'Copié !' : 'Copier le lien'"
                    >
                      <!-- <app-icon [name]="lienCopie() ? 'check' : 'copy'" class="size-4" /> -->
                    </button>

                    <!-- Régénérer -->
                    <button
                      type="button"
                      (click)="regenererLien()"
                      class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                      title="Régénérer un nouveau lien"
                    >
                      <!-- <app-icon name="refresh-cw" class="size-4" /> -->
                    </button>

                    <!-- Révoquer -->
                    <button
                      type="button"
                      (click)="revoquerLien()"
                      class="flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Désactiver le lien immédiatement"
                    >
                      <app-icon name="trash" class="size-4" />
                    </button>
                  </div>
                } @else {
                  <div class="flex items-center justify-between rounded-xl border border-dashed border-line p-3 bg-surface-muted/20">
                    <span class="text-xs text-ink-muted">Aucun lien actif pour le rôle {{ shareLinkRole() }}.</span>
                    <button
                      type="button"
                      (click)="regenererLien()"
                      class="rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-surface hover:bg-ink/90 transition-colors cursor-pointer"
                    >
                      Générer un lien
                    </button>
                  </div>
                }
              </div>

            </div>
          }

          <!-- TAB: AUTRES ONGLETS -->
          @if (activeTab() === 'general') {
            <div class="flex flex-col gap-4">
              <h2 class="text-lg font-bold text-ink">Profil personnel</h2>
              <p class="text-xs text-ink-muted">Gérez vos préférences de compte.</p>
            </div>
          }

          @if (activeTab() === 'compte') {
            @if (structure(); as s) {
              <div class="flex flex-col gap-4 max-w-xl">
                <h2 class="text-lg font-bold text-ink">Structure active</h2>
                <div class="flex flex-col gap-2">
                  <label class="text-xs font-semibold text-ink">Nom</label>
                  <input [(ngModel)]="s.nom" class="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-ink focus:outline-none" />
                </div>
                <div class="flex flex-col gap-2">
                  <label class="text-xs font-semibold text-ink">Email de contact</label>
                  <input [(ngModel)]="s.email" class="rounded-xl border border-line bg-surface px-3.5 py-2 text-xs text-ink focus:outline-none" />
                </div>
                <div class="flex justify-end">
                  <app-button size="xs" (click)="sauvegarderStructure()">Sauvegarder</app-button>
                </div>
              </div>
            }
          }

          @if (activeTab() === 'preferences') {
            <div class="flex flex-col gap-4">
              <h2 class="text-lg font-bold text-ink">Préférences d'affichage</h2>
              <p class="text-xs text-ink-muted">Apparence et langue.</p>
            </div>
          }

        </div>
      </div>
    </div>
  `,
})
export class ParametresModal implements OnInit {
  private readonly structureContext = inject(StructureContextService);
  private readonly structureService = inject(StructureService);
  private readonly invitationService = inject(InvitationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  close = output<void>();

  activeTab = signal<SettingTab>('general');
  membres = signal<MembreEquipe[]>([]);
  inviteEmail = signal<string>('');
  selectedRole = signal<RoleEquipe>('COACH');
  shareLinkRole = signal<RoleEquipe>('COACH');
  inviteShareLink = signal<string>('');
  isSending = signal<boolean>(false);
  lienCopie = signal<boolean>(false);

  protected readonly structure = this.structureContext.activeStructure;

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params['tab']) {
          this.activeTab.set(params['tab'] as SettingTab);
          if (params['tab'] === 'equipe') {
            this.chargerDonneesEquipe();
          }
        }
      });
  }

  protected switchTab(tab: SettingTab): void {
    this.router.navigate([], {
      queryParams: { tab },
      queryParamsHandling: 'merge',
    });
  }

  protected closeModal(): void {
    this.router.navigate([], {
      queryParams: { modal: null, tab: null },
      queryParamsHandling: 'merge',
    });
    this.close.emit();
  }

  private chargerDonneesEquipe(): void {
    this.invitationService
      .getMembresEquipe()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => this.membres.set(data),
      });

    this.chargerLienPartage(this.shareLinkRole(), false);
  }

  private chargerLienPartage(role: RoleEquipe, regenerate: boolean): void {
    this.invitationService
      .getLienInvitation(role, regenerate)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => this.inviteShareLink.set(res.link),
        error: () => this.inviteShareLink.set(''),
      });
  }

  protected changerRoleLienPartage(role: RoleEquipe): void {
    this.shareLinkRole.set(role);
    this.chargerLienPartage(role, false);
  }

  protected regenererLien(): void {
    this.chargerLienPartage(this.shareLinkRole(), true);
  }

  protected revoquerLien(): void {
    this.invitationService
      .revoquerLienInvitation(this.shareLinkRole())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.inviteShareLink.set(''),
      });
  }

  protected envoyerInvitation(): void {
    const email = this.inviteEmail().trim();
    if (!email) return;

    this.isSending.set(true);
    this.invitationService
      .envoyerInvitation(email, this.selectedRole())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isSending.set(false);
          this.inviteEmail.set('');
          this.chargerDonneesEquipe();
        },
        error: () => this.isSending.set(false),
      });
  }

  protected renvoyerInvitation(email: string, role: RoleEquipe): void {
    this.invitationService
      .envoyerInvitation(email, role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected changerRole(membreId: string, role: RoleEquipe): void {
    this.invitationService
      .updateRoleMembre(membreId, role)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.membres.update((list) =>
            list.map((m) => (m.id === membreId ? { ...m, role } : m))
          );
        },
      });
  }

  protected copierLien(): void {
    const link = this.inviteShareLink();
    if (!link) return;

    navigator.clipboard.writeText(link).then(() => {
      this.lienCopie.set(true);
      setTimeout(() => this.lienCopie.set(false), 2000);
    });
  }

  protected sauvegarderStructure(): void {
    const s = this.structure();
    if (!s) return;

    this.structureService
      .updateProfil(s.id, {
        nom: s.nom,
        emailContact: s.email,
        telephone: s.telephone,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe();
  }

  protected getInitiales(prenom?: string, nom?: string): string {
    const p = prenom ? prenom.charAt(0) : '';
    const n = nom ? nom.charAt(0) : '';
    return `${p}${n}`.toUpperCase() || 'M';
  }
}