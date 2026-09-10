import { Component, inject, signal, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { StructureContextService } from '../../../core/services/structure-context.service';
import { StructureService } from '../../../core/services/structure.service';
import { Icon } from "../../../shared/components/icon/icon";
import { ButtonComponent } from "../../../shared/components/button/button.component";


type OngletParam = 'compte' | 'equipe' | 'facturation' | 'notifications';

interface NavItem {
  id: OngletParam;
  label: string;
  icon: string;
  section?: string;
}

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [FormsModule, Icon, ButtonComponent],
  template: `
    <div class="flex flex-col gap-6 p-6 sm:p-8 max-w-7xl mx-auto w-full">
      
      <!-- En-tête de page -->
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-ink">Paramètres</h1>
        <p class="mt-1 text-xs sm:text-sm text-ink-muted">
          Gérez les informations de votre structure, votre équipe et vos préférences.
        </p>
      </div>

      <!-- Layout Sidebar + Contenu -->
      <div class="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 items-start">
        
        <!-- Navigation latérale -->
        <nav class="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 border-b md:border-b-0 md:border-r border-line md:pr-6">
          @for (item of navItems; track item.id) {
            @if (item.section) {
              <p class="hidden md:block text-[10px] font-semibold uppercase tracking-wider text-ink-muted px-3 pt-4 pb-1.5 first:pt-0">
                {{ item.section }}
              </p>
            }
            <button
              type="button"
              (click)="onglet.set(item.id)"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer text-left w-full"
              [class]="
                onglet() === item.id
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-ink-muted hover:bg-surface-muted hover:text-ink'
              "
            >
              <!-- <app-icon [name]="item.icon" class="size-4 shrink-0" /> -->
              <span>{{ item.label }}</span>
            </button>
          }
        </nav>

        <!-- Contenu dynamique -->
        <div class="flex flex-col gap-6 min-w-0">

          @if (onglet() === 'compte') {
            <div class="flex flex-col gap-6 rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)] max-w-2xl">
              <div>
                <h2 class="text-base font-semibold text-ink">Informations de la structure</h2>
                <p class="mt-0.5 text-xs text-ink-muted">Mettez à jour les coordonnées et identifiants publics de votre organisation.</p>
              </div>

              @if (structure(); as s) {
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-ink">Nom de la structure</label>
                    <input
                      [(ngModel)]="s.nom"
                      type="text"
                      class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-ink">Email de contact</label>
                    <input
                      [(ngModel)]="s.email"
                      type="email"
                      class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>

                  <div class="flex flex-col gap-1.5">
                    <label class="text-xs font-semibold text-ink">Téléphone</label>
                    <input
                      [(ngModel)]="s.telephone"
                      type="text"
                      class="rounded-xl border border-line bg-surface px-3.5 py-2.5 text-xs sm:text-sm text-ink focus:border-accent focus:outline-none transition-colors"
                    />
                  </div>

                  <div class="pt-4 border-t border-line flex justify-end">
                    <app-button size="sm" (click)="sauvegarderStructure()">
                      Enregistrer les modifications
                    </app-button>
                  </div>
                </div>
              } @else {
                <div class="py-8 text-center text-xs text-ink-muted animate-pulse">Chargement des données de la structure...</div>
              }
            </div>
          }

          @if (onglet() === 'equipe') {
            <div class="flex flex-col gap-6 rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)] max-w-3xl">
              <div class="flex items-center justify-between pb-4 border-b border-line">
                <div>
                  <h2 class="text-base font-semibold text-ink">Membres de l'équipe</h2>
                  <p class="mt-0.5 text-xs text-ink-muted">Gérez les accès et les rôles au sein de votre structure.</p>
                </div>
                <app-button size="xs">Inviter un membre</app-button>
              </div>
            </div>
          }

          @if (onglet() === 'facturation') {
            <div class="flex flex-col gap-6 rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)] max-w-2xl">
              <div>
                <h2 class="text-base font-semibold text-ink">Abonnement et facturation</h2>
                <p class="mt-0.5 text-xs text-ink-muted">Consultez votre formule active.</p>
              </div>
              @if (structure(); as s) {
                <div class="rounded-2xl border border-line bg-surface-muted/30 p-5 flex items-center justify-between">
                  <div>
                    <p class="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">Forfait actuel</p>
                    <p class="mt-1 text-xl font-bold text-ink capitalize">{{ 'Standard' }}</p>
                  </div>
                  <app-button variant="secondary" size="xs">Changer de formule</app-button>
                </div>
              }
            </div>
          }

          @if (onglet() === 'notifications') {
            <div class="flex flex-col gap-6 rounded-[var(--radius-card-lg)] border border-line bg-surface p-6 shadow-[var(--shadow-subtle)] max-w-2xl">
              <h2 class="text-base font-semibold text-ink">Préférences de notifications</h2>
              <p class="text-xs text-ink-muted">Gérez vos alertes.</p>
            </div>
          }

        </div>

      </div>
    </div>
  `,
})
export class Parametres implements OnInit {
  private readonly structureContext = inject(StructureContextService);
  private readonly structureService = inject(StructureService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly onglet = signal<OngletParam>('compte');
  
  // Utilisation directe du signal réactif de la structure active
  protected readonly structure = this.structureContext.activeStructure;

  protected readonly navItems: NavItem[] = [
    { id: 'compte', label: 'Compte & Structure', icon: 'settings', section: 'Organisation' },
    { id: 'equipe', label: 'Équipe', icon: 'users', section: 'Organisation' },
    { id: 'facturation', label: 'Facturation', icon: 'settings', section: 'Abonnement' },
    { id: 'notifications', label: 'Notifications', icon: 'settings', section: 'Préférences' },
  ];

  ngOnInit(): void {
    const structureId = this.structureContext.getActiveStructureId();
    if (structureId && !this.structure()) {
      this.structureService
        .getById(structureId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          error: (err) => console.error('Erreur chargement structure:', err),
        });
    }
  }

  protected sauvegarderStructure(): void {
    const s = this.structure();
    if (!s) return;
    
    // On extrait uniquement les champs modifiables pour éviter l'erreur de typage sur 'type'
    const payload = {
      nom: s.nom,
      emailContact: s.email,
      telephone: s.telephone,
    };

    this.structureService
      .updateProfil(s.id, payload)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => console.log('Structure mise à jour avec succès'),
        error: (err) => console.error('Erreur lors de la mise à jour:', err),
      });
  }
}