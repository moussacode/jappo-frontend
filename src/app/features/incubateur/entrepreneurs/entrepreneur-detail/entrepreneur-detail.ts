import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import { EntrepreneurService, EntrepreneurResponse } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';

import { Projet, Mission, Livrable } from '../../../../core/models';
import { Icon } from '../../../../shared/components/icon/icon';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { FormsModule } from '@angular/forms';
import { NouveauProjetModal } from '../../projets/nouveau-projet-modal/nouveau-projet-modal';

type Onglet = 'progression' | 'documents' | 'missions';

@Component({
  selector: 'app-entrepreneur-detail',
  standalone: true,
  imports: [RouterLink, Icon, BadgeComponent, DatePipe, FormsModule, NouveauProjetModal],
  template: `
    <div class="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      
      <!-- Bouton Retour -->
      <div class="flex items-center justify-between">
        <a
          routerLink="/incubateur/entrepreneurs"
          class="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink transition-colors cursor-pointer"
        >
          <app-icon name="arrow-left" class="size-4" />
          <span>Retour aux entrepreneurs</span>
        </a>
      </div>

      <!-- SKELETON LOADER -->
      @if (isLoading()) {
        <div class="flex flex-col gap-6 animate-pulse">
          <div class="flex items-center gap-4">
            <div class="size-14 rounded-full bg-line"></div>
            <div class="flex flex-col gap-2">
              <div class="h-6 w-48 rounded bg-line"></div>
              <div class="h-4 w-32 rounded bg-line/60"></div>
            </div>
          </div>
          <div class="h-40 rounded-2xl bg-line/40"></div>
        </div>
      } @else if (entrepreneur(); as e) {

        <!-- CAS 1 : INVITATION EN ATTENTE -->
        @if (!estMembreActif(e.statutInvitation)) {
          
          <div class="flex flex-col gap-6">
            <!-- Carte d'en-tête d'attente -->
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-line bg-surface p-6 shadow-xs">
              <div class="flex items-center gap-4 min-w-0">
                <div class="flex size-14 shrink-0 items-center justify-center rounded-full border border-warning-500/30 bg-warning-500/10 text-lg font-bold text-warning-700">
                  {{ initiales(e) }}
                </div>
                <div class="flex flex-col min-w-0">
                  <div class="flex items-center gap-2">
                    <h1 class="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
                      {{ afficherNomComplet(e) }}
                    </h1>
                    <app-badge status="warning" size="sm">Invitation en attente</app-badge>
                  </div>

                  <!-- Email avec bouton icône 2 feuilles de papier pour copier -->
                  <div class="flex items-center gap-2 mt-1">
                    <span class="truncate text-xs text-ink-muted sm:text-sm font-medium">{{ e.email }}</span>
                    
                    <button
                      type="button"
                      (click)="copierEmail(e.email)"
                      class="inline-flex items-center justify-center rounded-lg border border-line bg-surface-muted/60 p-1.5 text-ink-muted hover:text-ink hover:bg-surface-muted transition-all cursor-pointer"
                      [title]="emailCopie() ? 'Copié !' : 'Copier l\\'adresse email'"
                    >
                      @if (emailCopie()) {
                        <!-- Icône Coche Verte (Succès) -->
                        <svg class="size-3.5 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      } @else {
                        <!-- Icône 2 Feuilles de papier (Copier) -->
                        <svg class="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      }
                    </button>
                  </div>
                </div>
              </div>

              <!-- Action de Relance Directe Unique (Pas de création de doublon) -->
              <div class="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  (click)="relancerDirectement(e)"
                  [disabled]="relanceEnCours()"
                  class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-action-fill px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:opacity-90 disabled:opacity-50"
                >
                  <app-icon name="plus" class="size-4" />
                  <span>{{ relanceEnCours() ? 'Envoi en cours...' : 'Relancer l\\'invitation' }}</span>
                </button>
              </div>
            </div>

            <!-- Bloc d'information d'attente -->
            <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line bg-surface p-12 text-center shadow-xs">
              <div class="flex size-12 items-center justify-center rounded-full bg-warning-500/10 text-warning-600 mb-3 border border-warning-500/20">
                <app-icon name="warning" class="size-6" />
              </div>
              <h2 class="text-sm font-bold text-ink">Compte non encore activé</h2>
              <p class="mt-1 text-xs text-ink-muted max-w-md leading-relaxed">
                Cet utilisateur a été invité le 
                <strong>{{ e.dateInvitation ? (e.dateInvitation | date:'dd/MM/yyyy à HH:mm') : 'récemment' }}</strong>. 
                Il apparaîtra pleinement dans le tableau de bord dès qu'il aura accepté son invitation et configuré son mot de passe.
              </p>
            </div>
          </div>

        } @else {

          <!-- CAS 2 : ENTREPRENEUR ACTIF (VUE COMPLÈTE) -->
          
          <!-- En-tête Profil -->
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div class="flex items-center gap-4 min-w-0">
              <div class="flex size-14 shrink-0 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-lg font-bold text-accent">
                {{ initiales(e) }}
              </div>

              <div class="flex flex-col min-w-0">
                <div class="flex items-center gap-2">
                  <h1 class="truncate text-xl font-bold tracking-tight text-ink sm:text-2xl">
                    {{ afficherNomComplet(e) }}
                  </h1>
                  <app-badge status="success" size="sm">Membre Actif</app-badge>
                </div>
                
                <div class="flex items-center gap-2 mt-0.5">
                  <p class="truncate text-xs text-ink-muted sm:text-sm">{{ e.email }}</p>
                  
                  <!-- Bouton Icône 2 Feuilles de papier -->
                  <button
                    type="button"
                    (click)="copierEmail(e.email)"
                    class="inline-flex items-center justify-center rounded-lg border border-line bg-surface-muted/60 p-1 text-ink-muted hover:text-ink hover:bg-surface-muted transition-all cursor-pointer"
                    [title]="emailCopie() ? 'Copié !' : 'Copier l\\'adresse email'"
                  >
                    @if (emailCopie()) {
                      <svg class="size-3 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    } @else {
                      <svg class="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    }
                  </button>
                </div>
              </div>
            </div>

            <!-- Action de Création de Projet -->
            <div class="flex items-center gap-2.5 shrink-0">
              <button
                type="button"
                (click)="ouvrirModalNouveauProjet()"
                class="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-semibold text-white hover:bg-accent/90 shadow-xs transition-colors cursor-pointer"
              >
                <app-icon name="plus" class="size-3.5" />
                <span>{{ projet() ? 'Nouveau projet' : '+ Créer un projet' }}</span>
              </button>
            </div>
          </div>

          <!-- KPIS Synthétiques -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between gap-3">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Projet Principal</span>
                @if (!projet()) {
                  <button
                    type="button"
                    (click)="ouvrirModalNouveauProjet()"
                    class="text-xs font-semibold text-accent hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <app-icon name="plus" class="size-3" />
                    <span>Créer</span>
                  </button>
                }
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="text-sm font-bold text-ink truncate">
                  {{ projet()?.nom || 'Aucun projet rattaché' }}
                </span>
                <app-badge [status]="projet() ? 'primary' : 'neutral'" size="sm">
                  {{ projet()?.statut || 'En attente' }}
                </app-badge>
              </div>
            </div>

            <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between gap-3">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Cohorte</span>
              <span class="text-sm font-bold text-ink truncate">
                {{ projet()?.nomCohorte || e.nomCohorte || 'Non assigné' }}
              </span>
            </div>

            <div class="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col justify-between gap-3">
              <span class="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">Maturité du projet</span>
              <div class="flex items-center gap-3">
                <span class="text-xl font-bold text-accent">{{ projet()?.scoreMaturite || 0 }}%</span>
                <div class="flex-1 h-2 bg-line rounded-full overflow-hidden">
                  <div 
                    class="h-full bg-accent rounded-full transition-all duration-300" 
                    [style.width.%]="projet()?.scoreMaturite || 0"
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Barre d'onglets (Progression / Livrables / Missions) -->
          <div class="flex items-center gap-2 border-b border-line pt-2">
            @for (o of onglets; track o.cle) {
              <button
                type="button"
                (click)="ongletActif.set(o.cle)"
                class="relative border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors cursor-pointer"
                [class]="
                  ongletActif() === o.cle
                    ? 'border-accent text-accent'
                    : 'border-transparent text-ink-muted hover:text-ink'
                "
              >
                {{ o.label }}
              </button>
            }
          </div>

          <!-- CONTENU DES ONGLETS -->
          @if (ongletActif() === 'progression') {
            <div class="rounded-2xl border border-line bg-surface p-6 shadow-xs flex flex-col gap-5">
              <h2 class="text-sm font-bold text-ink">Diagnostic & Détails du projet</h2>
              @if (projet(); as p) {
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div class="flex flex-col gap-1 rounded-xl border border-line bg-surface-muted/30 p-4">
                    <span class="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Secteur</span>
                    <span class="text-sm font-bold text-ink">{{ p.secteur || 'Non renseigné' }}</span>
                  </div>
                  <div class="flex flex-col gap-1 rounded-xl border border-line bg-surface-muted/30 p-4">
                    <span class="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">Statut</span>
                    <span class="text-sm font-bold text-ink">{{ p.statut || 'En cours' }}</span>
                  </div>
                </div>
              } @if (!isLoading() && !projet()) {
                <div class="rounded-xl border border-dashed border-line bg-surface-muted/30 p-8 text-center flex flex-col items-center gap-3">
                  <div class="flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <app-icon name="briefcase" class="size-6" />
                  </div>
                  <div>
                    <h3 class="text-sm font-bold text-ink">Aucun projet rattaché pour le moment</h3>
                    <p class="text-xs text-ink-muted mt-1 max-w-md">
                      Créez un projet pour cet entrepreneur afin de configurer ses jalons, ses missions et ses livrables.
                    </p>
                  </div>
                  <button
                    type="button"
                    (click)="ouvrirModalNouveauProjet()"
                    class="mt-2 inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-accent/90 shadow-xs transition-colors cursor-pointer"
                  >
                    <app-icon name="plus" class="size-3.5" />
                    <span>+ Créer un projet</span>
                  </button>
                </div>
              }
            </div>
          }

          @if (ongletActif() === 'documents') {
            <div class="w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
              <div class="px-6 py-4 border-b border-line bg-surface-muted/30 flex items-center justify-between">
                <h2 class="text-sm font-bold text-ink">Documents & Livrables</h2>
                <span class="text-xs text-ink-muted">{{ livrables().length }} fichier(s)</span>
              </div>
              <div class="divide-y divide-line">
                @for (l of livrables(); track l.id) {
                  <div class="px-6 py-4 flex items-center justify-between hover:bg-surface-muted/30 transition-colors">
                    <span class="text-xs font-bold text-ink">{{ l.nom }}</span>
                    <app-badge status="primary" size="sm">{{ l.statut || 'Déposé' }}</app-badge>
                  </div>
                } @empty {
                  <p class="p-8 text-center text-xs text-ink-muted">Aucun livrable déposé.</p>
                }
              </div>
            </div>
          }

          @if (ongletActif() === 'missions') {
            <div class="w-full min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-xs">
              <div class="px-6 py-4 border-b border-line bg-surface-muted/30 flex items-center justify-between gap-3 flex-wrap">
                <div class="flex items-center gap-2">
                  <h2 class="text-sm font-bold text-ink">Missions assignées</h2>
                  <span class="text-xs text-ink-muted">({{ missions().length }})</span>
                </div>

                @if (projet(); as p) {
                  <a
                    [routerLink]="['/incubateur/missions/attribuer']"
                    [queryParams]="{ projetId: p.id, entrepreneurId: e.id, cohorteId: p.cohorteId || e.cohorteId || null }"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-action-fill px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <app-icon name="plus" class="size-3.5" />
                    <span>+ Nouvelle mission pour {{ e.prenom || 'l\\'entrepreneur' }}</span>
                  </a>
                }
              </div>
              <div class="divide-y divide-line">
                @for (m of missions(); track m.id) {
                  <a
                    [routerLink]="['/incubateur/missions', m.id]"
                    class="px-6 py-4 flex items-center justify-between hover:bg-surface-muted/30 transition-colors group cursor-pointer"
                  >
                    <div class="flex items-center gap-3 min-w-0">
                      <div class="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted border border-line text-ink-muted group-hover:border-accent/40 group-hover:text-accent transition-colors">
                        <app-icon name="missions" class="size-3.5" />
                      </div>
                      <span class="text-xs font-bold text-ink group-hover:text-accent transition-colors truncate">{{ m.titre }}</span>
                    </div>
                    <div class="flex items-center gap-3 shrink-0">
                      <app-badge status="neutral" size="sm">{{ m.statut }}</app-badge>
                      <app-icon name="chevron-right" class="size-3.5 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                    </div>
                  </a>
                } @empty {
                  <div class="p-8 text-center flex flex-col items-center justify-center gap-2">
                    <p class="text-xs text-ink-muted">Aucune mission assignée.</p>
                    @if (projet(); as p) {
                      <a
                        [routerLink]="['/incubateur/missions/attribuer']"
                        [queryParams]="{ projetId: p.id, entrepreneurId: e.id, cohorteId: p.cohorteId || e.cohorteId || null }"
                        class="text-xs font-semibold text-accent hover:underline cursor-pointer"
                      >
                        Attribuer une première mission à {{ e.prenom || 'l\'entrepreneur' }}
                      </a>
                    }
                  </div>
                }
              </div>
            </div>
          }

        }

      } @else {
        <!-- CAS 3 : NON TROUVÉ -->
        <div class="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line p-12 text-center bg-surface">
          <h2 class="text-sm font-bold text-ink">Entrepreneur introuvable</h2>
          <a routerLink="/incubateur/entrepreneurs" class="mt-4 text-xs font-semibold text-accent hover:underline">
            Retourner à la liste
          </a>
        </div>
      }

      <!-- MODALE DE CRÉATION DE PROJET (CONTEXTE VERROUILLÉ) -->
      @if (showNouveauProjetModal()) {
        <app-nouveau-projet-modal
          [preselectedEntrepreneurId]="entrepreneur()?.id"
          [preselectedEntrepreneurName]="afficherNomComplet(entrepreneur()!)"
          [preselectedCohorteId]="entrepreneur()?.cohorteId"
          [preselectedCohorteNom]="entrepreneur()?.nomCohorte"
          [submitting]="creationEnCours()"
          [errorMessage]="erreurCreation()"
          (close)="showNouveauProjetModal.set(false)"
          (created)="onProjetModalCree($event)"
        />
      }

    </div>
  `,
})
export class EntrepreneurDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly entrepreneurId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly showNouveauProjetModal = signal(false);
  protected readonly creationEnCours = signal(false);
  protected readonly erreurCreation = signal<string | null>(null);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly relanceEnCours = signal<boolean>(false);
  protected readonly emailCopie = signal<boolean>(false);
  protected readonly entrepreneur = signal<EntrepreneurResponse | undefined>(undefined);
  protected readonly projet = signal<Projet | undefined>(undefined);
  protected readonly missions = signal<Mission[]>([]);
  protected readonly livrables = signal<Livrable[]>([]);
  protected readonly ongletActif = signal<Onglet>('progression');

  protected readonly onglets: { cle: Onglet; label: string }[] = [
    { cle: 'progression', label: 'Progression' },
    { cle: 'documents', label: 'Livrables & Fichiers' },
    { cle: 'missions', label: 'Missions' },
  ];

  ngOnInit(): void {
    if (!this.entrepreneurId) {
      this.isLoading.set(false);
      return;
    }

    this.entrepreneurService
      .getById(this.entrepreneurId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (e) => {
          this.entrepreneur.set(e);

          if (this.estMembreActif(e.statutInvitation)) {
            this.chargerProjetEtActivites();
          } else {
            this.isLoading.set(false);
          }
        },
        error: (err) => {
          console.error('Erreur chargement entrepreneur:', err);
          this.isLoading.set(false);
        },
      });
  }

  private chargerProjetEtActivites(): void {
    this.projetService
      .getPrincipalByEntrepreneur(this.entrepreneurId)
      .pipe(
        catchError(() => of(undefined)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (p) => {
          this.projet.set(p);
          this.isLoading.set(false);

          if (!p?.id) return;

          forkJoin({
            missions: this.missionService.getByProjet(p.id).pipe(catchError(() => of([]))),
            livrables: this.livrableService.getLivrablesByProjet(p.id).pipe(catchError(() => of([]))),
          })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: ({ missions, livrables }) => {
                this.missions.set(missions);
                this.livrables.set(livrables);
              },
            });
        },
      });
  }



  protected ouvrirModalNouveauProjet(): void {
    this.erreurCreation.set(null);
    this.showNouveauProjetModal.set(true);
  }

  protected onProjetModalCree(payload: { nom: string; description?: string; secteur?: string; cohorteId?: string; entrepreneurId?: string }): void {
    this.creationEnCours.set(true);
    this.erreurCreation.set(null);

    this.projetService
      .create({
        nom: payload.nom,
        description: payload.description,
        secteur: payload.secteur,
        entrepreneurId: payload.entrepreneurId || this.entrepreneurId,
        cohorteId: payload.cohorteId || this.entrepreneur()?.cohorteId || null,
      } as any)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (p) => {
          this.creationEnCours.set(false);
          this.showNouveauProjetModal.set(false);
          this.projet.set(p);
          this.chargerProjetEtActivites();
        },
        error: (err) => {
          this.creationEnCours.set(false);
          this.erreurCreation.set(err?.error?.message ?? 'Erreur lors de la création du projet.');
        },
      });
  }
  protected estMembreActif(statut?: string): boolean {
    const s = statut?.toUpperCase();
    return s === 'ACCEPTE' || s === 'ACTIF';
  }

  /**
   * Copier l'adresse email sans texte verbeux, avec icône dynamique
   */
  protected copierEmail(email: string): void {
    if (!email) return;
    navigator.clipboard.writeText(email).then(() => {
      this.emailCopie.set(true);
      setTimeout(() => this.emailCopie.set(false), 2000);
    });
  }

  /**
   * Relancer l'invitation directement sans passer par la creation d'un doublon
   */
  protected relancerDirectement(e: EntrepreneurResponse): void {
    this.relanceEnCours.set(true);
    this.entrepreneurService
      .inviterMultiple({
        emails: [e.email],
        cohorteId: e.cohorteId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.relanceEnCours.set(false);
          alert(`L'invitation a été renvoyée avec succès à ${e.email}`);
        },
        error: (err) => {
          console.error('Erreur relance invitation:', err);
          this.relanceEnCours.set(false);
        },
      });
  }

  protected afficherNomComplet(e: EntrepreneurResponse): string {
    const parts = [e.prenom, e.nom].filter(Boolean);
    if (parts.length > 0) return parts.join(' ');
    return e.email ? e.email.split('@')[0] : 'Entrepreneur';
  }

  protected initiales(e: EntrepreneurResponse): string {
    const nomComplet = this.afficherNomComplet(e);
    const parts = nomComplet.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nomComplet.slice(0, 2).toUpperCase();
  }
}