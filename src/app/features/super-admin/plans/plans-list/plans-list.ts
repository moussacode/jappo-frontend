import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { SuperAdminService } from '../../../../core/services/super-admin.service';
import {
  PlanAbonnement,
  PlanAbonnementRequest,
  avantagesPlan,
  formaterDuree,
  formaterPrix,
  formaterTokens,
} from '../../../../core/models/abonnement.model';
import { BadgeComponent } from '../../../../shared/components/badge/badge';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { Icon } from '../../../../shared/components/icon/icon';
import { ModalComponent } from '../../../../shared/components/modal/modal.component';

/**
 * Gestion des plans d'abonnement : création, modification, activation / désactivation.
 * Un plan utilisé ne se supprime jamais (le serveur répond 409) : on le désactive.
 */
@Component({
  selector: 'app-plans-list',
  standalone: true,
  imports: [ReactiveFormsModule, BadgeComponent, ButtonComponent, Icon, ModalComponent],
  templateUrl: './plans-list.html',
})
export class PlansList implements OnInit {
  private readonly superAdminService = inject(SuperAdminService);
  private readonly fb = inject(FormBuilder);

  protected readonly plans = signal<PlanAbonnement[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly enCours = signal(false);

  /** null = formulaire fermé ; 'nouveau' = création ; sinon le plan modifié. */
  protected readonly edition = signal<PlanAbonnement | 'nouveau' | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly prix = formaterPrix;
  protected readonly duree = formaterDuree;
  protected readonly tokens = formaterTokens;
  protected readonly avantages = avantagesPlan;

  // Les champs numériques optionnels sont saisis en texte : vide = illimité / sans fin.
  protected readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_]{2,50}$/)]],
    libelle: ['', [Validators.required, Validators.maxLength(100)]],
    description: ['', Validators.maxLength(1000)],
    prix: [0, [Validators.required, Validators.min(0)]],
    devise: ['XOF', [Validators.required, Validators.pattern(/^[A-Z]{3}$/)]],
    dureeJours: ['', Validators.pattern(/^[1-9]\d*$/)],
    maxCohortes: ['', Validators.pattern(/^\d+$/)],
    iaCoachActive: [false],
    iaEntrepreneurActive: [false],
    iaTokensMensuels: ['', Validators.pattern(/^\d+$/)],
    estDefaut: [false],
    ordre: [0, [Validators.required, Validators.min(0)]],
  });

  ngOnInit(): void {
    this.charger();
  }

  protected charger(): void {
    this.loading.set(true);
    this.error.set(null);
    this.superAdminService.getPlans().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les plans.');
        this.loading.set(false);
      },
    });
  }

  protected ouvrirCreation(): void {
    const ordreSuivant = Math.max(0, ...this.plans().map(p => p.ordre)) + 1;
    this.form.reset({ devise: 'XOF', prix: 0, ordre: ordreSuivant });
    this.form.controls.code.enable();
    this.formError.set(null);
    this.edition.set('nouveau');
  }

  protected ouvrirModification(plan: PlanAbonnement): void {
    this.form.reset({
      code: plan.code,
      libelle: plan.libelle,
      description: plan.description ?? '',
      prix: plan.prix,
      devise: plan.devise,
      dureeJours: plan.dureeJours?.toString() ?? '',
      maxCohortes: plan.maxCohortes?.toString() ?? '',
      iaCoachActive: plan.iaCoachActive,
      iaEntrepreneurActive: plan.iaEntrepreneurActive,
      iaTokensMensuels: plan.iaTokensMensuels?.toString() ?? '',
      estDefaut: plan.estDefaut,
      ordre: plan.ordre,
    });
    // Le code est stable : il n'est plus modifiable après la création.
    this.form.controls.code.disable();
    this.formError.set(null);
    this.edition.set(plan);
  }

  protected fermer(): void {
    this.edition.set(null);
  }

  protected enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const request: PlanAbonnementRequest = {
      code: v.code.trim(),
      libelle: v.libelle.trim(),
      description: v.description.trim() || null,
      prix: Number(v.prix),
      devise: v.devise.trim().toUpperCase(),
      dureeJours: entierOuNull(v.dureeJours),
      maxCohortes: entierOuNull(v.maxCohortes),
      iaCoachActive: v.iaCoachActive,
      iaEntrepreneurActive: v.iaEntrepreneurActive,
      iaTokensMensuels: entierOuNull(v.iaTokensMensuels),
      estDefaut: v.estDefaut,
      ordre: Number(v.ordre),
    };

    const edition = this.edition();
    const requete = edition === 'nouveau' || edition === null
      ? this.superAdminService.creerPlan(request)
      : this.superAdminService.modifierPlan(edition.id, request);

    this.enCours.set(true);
    this.formError.set(null);
    requete.subscribe({
      next: () => {
        this.enCours.set(false);
        this.edition.set(null);
        this.charger();
      },
      error: (err) => {
        this.enCours.set(false);
        this.formError.set(messageErreur(err, "Impossible d'enregistrer le plan."));
      },
    });
  }

  protected basculerActivation(plan: PlanAbonnement): void {
    const requete = plan.actif
      ? this.superAdminService.desactiverPlan(plan.id)
      : this.superAdminService.activerPlan(plan.id);
    this.executer(requete);
  }

  protected supprimer(plan: PlanAbonnement): void {
    if (!window.confirm(`Supprimer définitivement le plan « ${plan.libelle} » ?`)) {
      return;
    }
    this.executer(this.superAdminService.supprimerPlan(plan.id));
  }

  protected invalide(champ: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[champ];
    return control.invalid && control.touched;
  }

  private executer(requete: Observable<unknown>): void {
    this.enCours.set(true);
    this.actionError.set(null);
    requete.subscribe({
      next: () => {
        this.enCours.set(false);
        this.charger();
      },
      error: (err) => {
        this.enCours.set(false);
        this.actionError.set(messageErreur(err, "Impossible d'exécuter cette action."));
      },
    });
  }
}

function entierOuNull(valeur: string): number | null {
  const texte = valeur.trim();
  return texte === '' ? null : Number(texte);
}

function messageErreur(err: unknown, defaut: string): string {
  const body = (err as { error?: { message?: string; erreurs?: Record<string, string> } } | null)?.error;
  if (body?.erreurs) {
    return Object.values(body.erreurs).join(' ');
  }
  return body?.message ?? defaut;
}
