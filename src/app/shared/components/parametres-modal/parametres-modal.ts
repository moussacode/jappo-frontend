import {
  Component,
  DestroyRef,
  HostListener,
  OnInit,
  inject,
  output,
  signal,
} from '@angular/core';
import { TranslationService, Locale } from '../../../core/services/translation.service';

import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// Components
import { Icon } from '../icon/icon';
import { ButtonComponent } from '../button/button.component';
import { ModalComponent } from '../modal/modal.component';

// Services
import { StructureContextService } from '../../../core/services/structure-context.service';
import { StructureService } from '../../../core/services/structure.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  InvitationService,
  MembreEquipe,
  RoleEquipe,
} from '../../../core/services/invitation.service';
import { InputComponent } from '../input/input.component';
import { FormFieldComponent } from '../input/form-field.component';
import { ThemeService,Theme } from '../../../core/services/theme.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TypeStructure } from '../../../core/models';

export type SettingTab =
  | 'general'
  | 'compte'
  | 'preferences'
  | 'equipe';


type Language = 'fr' | 'en' | 'wo';

interface StructureFormValue {
  nom: string;
  email: string;
  telephone: string;
  type: TypeStructure;
  pays: string;
  ville: string;
  adresse: string;
  siteWeb: string;
}

@Component({
  selector: 'app-parametres-modal',
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    Icon,
    ButtonComponent,
    ModalComponent,
    InputComponent,
    FormFieldComponent,
    TranslatePipe,
],
  templateUrl: './parametres-modal.html',
})
export class ParametresModal implements OnInit {

  // ---------------------------------------------------------------------------
  // Dependencies
  // ---------------------------------------------------------------------------

  private readonly fb = inject(FormBuilder);
  
  private readonly destroyRef = inject(DestroyRef);

  private readonly translationService = inject(TranslationService);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly structureContext =
    inject(StructureContextService);

  private readonly structureService =
    inject(StructureService);

  private readonly invitationService =
    inject(InvitationService);

    private readonly themeService = inject(ThemeService);
    private readonly authService = inject(AuthService);

    readonly selectedTheme = this.themeService.theme;
    protected readonly currentUser = this.authService.currentUser;

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  readonly close = output<void>();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  readonly activeTab = signal<SettingTab>('general');

changerTheme(theme: Theme): void {
  this.themeService.setTheme(theme);
}

  readonly selectedLanguage = signal<Language>('fr');

  readonly membres = signal<MembreEquipe[]>([]);

  readonly inviteEmail = signal('');

  readonly selectedRole = signal<RoleEquipe>('COACH');

  readonly shareLinkRole = signal<RoleEquipe>('COACH');

  readonly inviteShareLink = signal('');

  readonly isLoadingEquipe = signal(false);

  readonly isSendingInvitation = signal(false);

  readonly isSavingStructure = signal(false);

  readonly isSavingProfile = signal(false);

  readonly isChangingRole = signal(false);

  readonly isRegeneratingLink = signal(false);

  readonly isRevokingLink = signal(false);

  readonly lienCopie = signal(false);

  readonly errorMessage = signal('');

  readonly successMessage = signal('');

  readonly profileErrorMessage = signal('');

  readonly profileSuccessMessage = signal('');

  /**
   * Structure actuellement sélectionnée dans le contexte global.
   *
   * On la lit pour afficher les informations.
   * Mais on ne modifie JAMAIS directement cet objet depuis le formulaire.
   */
  protected readonly structure =
    this.structureContext.activeStructure;

  // ---------------------------------------------------------------------------
  // Forms
  // ---------------------------------------------------------------------------

  readonly profileForm = this.fb.nonNullable.group({
    prenom: ['', [Validators.required, Validators.minLength(2)]],
    nom: ['', [Validators.required, Validators.minLength(2)]],
  });

 readonly structureForm = this.fb.nonNullable.group({
  nom: ['', [Validators.required, Validators.minLength(2)]],
  email: ['', [Validators.email]],
  telephone: [''],
  type: ['incubateur' as TypeStructure],
  pays: [''],
  ville: [''],
  adresse: [''],
  siteWeb: [''],
});

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngOnInit(): void {
    this.initialiserProfileForm();
    this.initialiserStructureForm();
    this.initialiserOngletDepuisUrl();
    this.selectedLanguage.set(this.translationService.locale());
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeModal();
  }

  // ---------------------------------------------------------------------------
  // Tabs
  // ---------------------------------------------------------------------------

  switchTab(tab: SettingTab): void {
    this.activeTab.set(tab);

    if (tab === 'equipe' && this.membres().length === 0) {
      this.chargerDonneesEquipe();
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        tab,
        modal: 'parametres',
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private initialiserOngletDepuisUrl(): void {
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const tab = params.get('tab');

        if (!this.isValidSettingTab(tab)) {
          return;
        }

        this.activeTab.set(tab);

        if (tab === 'equipe') {
          this.chargerDonneesEquipe();
        }
      });
  }

  private isValidSettingTab(
    tab: string | null
  ): tab is SettingTab {
    return (
      tab === 'general' ||
      tab === 'compte' ||
      tab === 'preferences' ||
      tab === 'equipe'
    );
  }

  // ---------------------------------------------------------------------------
  // Profile (Utilisateur Connecté)
  // ---------------------------------------------------------------------------

  private initialiserProfileForm(): void {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        prenom: user.prenom ?? '',
        nom: user.nom ?? '',
      });
    }
  }

  sauvegarderProfil(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSavingProfile.set(true);
    this.profileErrorMessage.set('');
    this.profileSuccessMessage.set('');

    const val = this.profileForm.getRawValue();
    this.authService
      .updateProfile(val.prenom.trim(), val.nom.trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.profileSuccessMessage.set('Votre profil a été mis à jour avec succès.');
          this.isSavingProfile.set(false);
        },
        error: (err) => {
          this.profileErrorMessage.set(err?.error?.message ?? 'Impossible de mettre à jour votre profil.');
          this.isSavingProfile.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Structure
  // ---------------------------------------------------------------------------

 private initialiserStructureForm(): void {
  const structure = this.structure();
  if (!structure) return;

  this.structureForm.patchValue({
    nom: structure.nom ?? '',
    email: structure.email ?? '',
    telephone: structure.telephone ?? '',
    type: (structure.type as TypeStructure | null | undefined) ?? 'incubateur',
    pays: structure.pays ?? '',
    ville: structure.ville ?? '',
    adresse: structure.adresse ?? '',
    siteWeb: structure.siteWeb ?? '',
  });
}

  sauvegarderStructure(): void {
    if (this.structureForm.invalid) {
      this.structureForm.markAllAsTouched();
      return;
    }

    const structure = this.structure();
    if (!structure) {
      return;
    }

    this.isSavingStructure.set(true);
    this.clearMessages();

    const value: StructureFormValue = this.structureForm.getRawValue();

    this.structureService
      .updateProfil(structure.id, {
        nom: value.nom.trim(),
        type: value.type,
        pays: value.pays.trim() || undefined,
        email: value.email.trim() || undefined,
        telephone: value.telephone.trim() || undefined,
        adresse: value.adresse.trim() || undefined,
        ville: value.ville.trim() || undefined,
        siteWeb: value.siteWeb.trim() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updatedStructure) => {
          this.structureContext.updateActiveStructure(updatedStructure);
          this.successMessage.set('Les informations de la structure ont été enregistrées.');
        },
        error: (error) => {
          console.error('Erreur lors de la sauvegarde de la structure', error);
          this.errorMessage.set('Impossible d’enregistrer les modifications.');
        },
        complete: () => {
          this.isSavingStructure.set(false);
        },
      });
  }

  // ---------------------------------------------------------------------------
  // Équipe
  // ---------------------------------------------------------------------------

  private chargerDonneesEquipe(): void {
    if (this.isLoadingEquipe()) {
      return;
    }

    this.isLoadingEquipe.set(true);
    this.errorMessage.set('');

    forkJoin({
      membres: this.invitationService.getMembresEquipe(),

      lien: this.invitationService.getLienInvitation(
        this.shareLinkRole(),
        false
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ membres, lien }) => {
          this.membres.set(membres);
          this.inviteShareLink.set(lien.link);
        },

        error: error => {
          console.error(
            'Erreur lors du chargement de l’équipe',
            error
          );

          this.errorMessage.set(
            'Impossible de charger les informations de l’équipe.'
          );
        },

        complete: () => {
          this.isLoadingEquipe.set(false);
        },
      });
  }

 // ---------------------------------------------------------------------------
// Invitation
// ---------------------------------------------------------------------------

protected envoyerInvitation(): void {
  const email = this.inviteEmail().trim();

  if (!email || !this.isValidEmail(email)) {
    this.errorMessage.set(
      'Veuillez saisir une adresse email valide.'
    );
    return;
  }

  this.isSendingInvitation.set(true);
  this.clearMessages();

  this.invitationService
    .envoyerInvitation(
      email,
      this.selectedRole()
    )
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.inviteEmail.set('');

        this.successMessage.set(
          'Invitation envoyée avec succès.'
        );

        this.chargerMembresEquipe();
      },

      error: (error) => {
        console.error(
          'Erreur lors de l’envoi de l’invitation',
          error
        );

        this.errorMessage.set(
          error?.error?.message ??
          'Impossible d’envoyer l’invitation.'
        );

        this.isSendingInvitation.set(false);
      },

      complete: () => {
        this.isSendingInvitation.set(false);
      },
    });
}

protected renvoyerInvitation(membre: MembreEquipe): void {
  this.isSendingInvitation.set(true);
  this.clearMessages();

  this.invitationService
    .renvoyerInvitationMembre(membre.id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.successMessage.set(
          `Une nouvelle invitation a été envoyée à ${membre.email}.`
        );
        this.chargerMembresEquipe();
        this.isSendingInvitation.set(false);
      },

      error: (error) => {
        console.error(
          'Erreur lors du renvoi de l’invitation',
          error
        );

        this.errorMessage.set(
          error?.error?.message ??
          'Impossible de renvoyer l’invitation.'
        );

        this.isSendingInvitation.set(false);
      },

      complete: () => {
        this.isSendingInvitation.set(false);
      },
    });
}

protected annulerInvitation(membre: MembreEquipe): void {
  if (!confirm(`Êtes-vous sûr de vouloir annuler l'invitation envoyée à ${membre.email} ?`)) {
    return;
  }
  this.clearMessages();
  this.invitationService
    .annulerInvitationMembre(membre.id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.successMessage.set(`L'invitation pour ${membre.email} a été annulée.`);
        this.chargerMembresEquipe();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message ?? "Impossible d'annuler l'invitation.");
      },
    });
}

protected retirerMembre(membre: MembreEquipe): void {
  const nomAffiche = membre.prenom || membre.nom ? `${membre.prenom} ${membre.nom}`.trim() : membre.email;
  if (!confirm(`Êtes-vous sûr de vouloir retirer ${nomAffiche} de l'équipe ?`)) {
    return;
  }
  this.clearMessages();
  this.invitationService
    .retirerMembre(membre.id)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.successMessage.set(`${nomAffiche} a été retiré de l'équipe.`);
        this.chargerMembresEquipe();
      },
      error: (error) => {
        this.errorMessage.set(error?.error?.message ?? "Impossible de retirer ce membre.");
      },
    });
}

// ---------------------------------------------------------------------------
// Rôles
// ---------------------------------------------------------------------------

protected changerRole(
  membre: MembreEquipe,
  role: RoleEquipe
): void {
  if (membre.role === role) {
    return;
  }

  this.isChangingRole.set(true);
  this.clearMessages();

  this.invitationService
    .updateRoleMembre(membre.id, role)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.membres.update((membres) =>
          membres.map((item) =>
            item.id === membre.id
              ? { ...item, role }
              : item
          )
        );

        this.successMessage.set(
          'Le rôle a été mis à jour.'
        );
      },

      error: (error) => {
        console.error(
          'Erreur lors du changement de rôle',
          error
        );

        this.errorMessage.set(
          error?.error?.message ??
          'Impossible de modifier le rôle.'
        );

        this.isChangingRole.set(false);
      },

      complete: () => {
        this.isChangingRole.set(false);
      },
    });
}

// ---------------------------------------------------------------------------
// Lien d'invitation
// ---------------------------------------------------------------------------

protected changerRoleLienPartage(
  role: RoleEquipe
): void {
  this.shareLinkRole.set(role);
  this.chargerLienPartage(role, false);
}

protected regenererLien(): void {
  this.isRegeneratingLink.set(true);
  this.clearMessages();

  this.chargerLienPartage(
    this.shareLinkRole(),
    true
  );
}

private chargerLienPartage(
  role: RoleEquipe,
  regenerate: boolean
): void {
  this.invitationService
    .getLienInvitation(role, regenerate)
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (response) => {
        this.inviteShareLink.set(response.link);

        if (regenerate) {
          this.successMessage.set(
            'Le lien d’invitation a été régénéré.'
          );
        }
      },

      error: (error) => {
        console.error(
          'Erreur lors du chargement du lien',
          error
        );

        this.errorMessage.set(
          error?.error?.message ??
          'Impossible de récupérer le lien d’invitation.'
        );

        this.isRegeneratingLink.set(false);
      },

      complete: () => {
        this.isRegeneratingLink.set(false);
      },
    });
}

protected revoquerLien(): void {
  this.isRevokingLink.set(true);
  this.clearMessages();

  this.invitationService
    .revoquerLienInvitation(this.shareLinkRole())
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: () => {
        this.inviteShareLink.set('');

        this.successMessage.set(
          'Le lien d’invitation a été révoqué.'
        );
      },

      error: (error) => {
        console.error(
          'Erreur lors de la révocation du lien',
          error
        );

        this.errorMessage.set(
          error?.error?.message ??
          'Impossible de révoquer le lien.'
        );

        this.isRevokingLink.set(false);
      },

      complete: () => {
        this.isRevokingLink.set(false);
      },
    });
}

protected async copierLien(): Promise<void> {
  const link = this.inviteShareLink();

  if (!link) {
    return;
  }

  try {
    await navigator.clipboard.writeText(link);

    this.lienCopie.set(true);

    window.setTimeout(() => {
      this.lienCopie.set(false);
    }, 2000);
  } catch (error) {
    console.error(
      'Impossible de copier le lien',
      error
    );

    this.errorMessage.set(
      'Impossible de copier le lien.'
    );
  }
}

// ---------------------------------------------------------------------------
// Reload équipe
// ---------------------------------------------------------------------------

private chargerMembresEquipe(): void {
  this.invitationService
    .getMembresEquipe()
    .pipe(takeUntilDestroyed(this.destroyRef))
    .subscribe({
      next: (membres) => {
        this.membres.set(membres);
      },

      error: (error) => {
        console.error(
          'Erreur lors du chargement des membres',
          error
        );
      },
    });
}

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------

  

 changerLangue(language: Language): void {
  this.selectedLanguage.set(language);

  // Le wolof n'est pas encore disponible : on affiche le choix sans l'appliquer
  if (language === 'wo') {
    return;
  }

  this.translationService.setLocale(language as Locale);
}

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------


  protected isAdminStructure(): boolean {
  return this.structureContext.activeRole() === 'ADMIN_STRUCTURE';
}

protected isCoach(): boolean {
  return this.structureContext.activeRole() === 'COACH';
}

protected isEntrepreneur(): boolean {
  return this.structureContext.activeRole() === 'ENTREPRENEUR';
}
  getInitiales(
    prenom?: string,
    nom?: string
  ): string {
    const first = prenom?.trim()?.charAt(0) ?? '';
    const last = nom?.trim()?.charAt(0) ?? '';

    return `${first}${last}`.toUpperCase();
  }

  isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  clearMessages(): void {
    this.errorMessage.set('');
    this.successMessage.set('');
  }

  // ---------------------------------------------------------------------------
  // Close
  // ---------------------------------------------------------------------------

  closeModal(): void {
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        modal: null,
        tab: null,
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });

    this.close.emit();
  }
}