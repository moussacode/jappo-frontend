import { Component, ElementRef, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { Icon } from '../../../../shared/components/icon/icon';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { INPUT_CLASS } from '../constants';
import {
  EtapeBrouillon,
  PhaseBrouillon,
  ProgrammeBrouillon,
  modeleRecommande,
  nombreOperations,
  nouvelleEtape,
  nouvelleMission,
  nouvellePhase,
} from './programme-brouillon';
import { ErreurCreation, ProgrammeCreationService } from './programme-creation.service';

type Etat = 'edition' | 'creation' | 'succes' | 'erreur';

const ETAPES_ASSISTANT = [
  { numero: 1, titre: 'Programme', aide: 'Nom et objectif' },
  { numero: 2, titre: 'Structure', aide: 'Phases et étapes' },
  { numero: 3, titre: 'Missions', aide: 'Travail attendu' },
  { numero: 4, titre: 'Vérification', aide: 'Créer le programme' },
] as const;

/**
 * Assistant de création d'un programme complet : informations, structure
 * (phases et étapes), missions par étape, puis création en une fois.
 */
@Component({
  selector: 'app-programme-wizard',
  imports: [RouterLink, Icon, ButtonComponent, CardComponent, PageHeaderComponent],
  template: `
    <div class="mx-auto flex w-full max-w-[1400px] min-w-0 flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <app-page-header
        title="Nouveau programme"
        subtitle="Construisez le programme, son parcours, ses phases, étapes et missions en une seule fois."
        [breadcrumb]="[{ label: 'Programmes', path: '/incubateur/programmes' }, { label: 'Nouveau programme' }]"
      />

      @if (etat() === 'edition') {
        <!-- Progression de l'assistant -->
        <ol class="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Étapes de l'assistant">
          @for (e of etapesAssistant; track e.numero) {
            <li>
              <button
                type="button"
                (click)="allerA(e.numero)"
                [disabled]="e.numero > etapeMax()"
                [attr.aria-current]="e.numero === etape() ? 'step' : null"
                class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                [class]="e.numero === etape() ? 'border-accent bg-surface' : 'border-line bg-surface/60 hover:border-line-strong'"
              >
                <span
                  class="flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                  [class]="e.numero < etape() ? 'bg-accent text-white' : e.numero === etape() ? 'border border-accent text-accent' : 'border border-line text-ink-muted'"
                >
                  @if (e.numero < etape()) { <app-icon name="check" class="size-3.5" /> } @else { {{ e.numero }} }
                </span>
                <span class="min-w-0">
                  <span class="block truncate text-sm font-medium text-ink">{{ e.titre }}</span>
                  <span class="block truncate text-xs text-ink-muted">{{ e.aide }}</span>
                </span>
              </button>
            </li>
          }
        </ol>

        <div class="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div class="flex min-w-0 flex-col gap-4">

            <!-- 1. Programme -->
            @if (etape() === 1) {
              <app-card>
                <h2 class="text-base font-semibold text-ink">Informations du programme</h2>
                <p class="mt-0.5 text-[13px] text-ink-muted">Ces informations sont visibles par votre équipe et vos entrepreneurs.</p>
                <div class="mt-5 flex flex-col gap-4">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-ink">Nom du programme <span class="text-danger-500">*</span></span>
                    <input type="text" [value]="b().nom" (input)="champ('nom', $event)" placeholder="Ex. Téranga Booster 2027" class="${INPUT_CLASS}" autofocus />
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-ink">Objectif</span>
                    <textarea rows="3" [value]="b().description" (input)="champ('description', $event)" placeholder="À qui s'adresse ce programme et quel résultat vise-t-il ?" class="${INPUT_CLASS}"></textarea>
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-sm font-medium text-ink">Nom du parcours</span>
                    <input type="text" [value]="b().nomParcours" (input)="champ('nomParcours', $event)" class="${INPUT_CLASS}" />
                    <span class="text-xs text-ink-muted">Le parcours regroupe les phases. Vous pourrez en ajouter d'autres plus tard.</span>
                  </label>
                </div>
              </app-card>
            }

            <!-- 2. Structure -->
            @if (etape() === 2) {
              @if (b().phases.length === 0) {
                <app-card>
                  <h2 class="text-base font-semibold text-ink">Comment voulez-vous démarrer ?</h2>
                  <p class="mt-0.5 text-[13px] text-ink-muted">Vous pourrez tout modifier ensuite.</p>
                  <div class="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button type="button" (click)="demarrerAvecModele()" class="flex flex-col gap-2 rounded-xl border border-line p-4 text-left transition-colors hover:border-accent">
                      <span class="text-sm font-semibold text-ink">Modèle recommandé</span>
                      <span class="text-[13px] text-ink-muted">3 phases (Idéation, Validation, Accélération), 9 étapes et une mission par étape.</span>
                    </button>
                    <button type="button" (click)="demarrerVide()" class="flex flex-col gap-2 rounded-xl border border-line p-4 text-left transition-colors hover:border-accent">
                      <span class="text-sm font-semibold text-ink">Partir de zéro</span>
                      <span class="text-[13px] text-ink-muted">Construisez vos propres phases et étapes.</span>
                    </button>
                  </div>
                </app-card>
              } @else {
                @for (phase of b().phases; track phase.cle; let i = $index; let premiere = $first; let derniere = $last) {
                  <app-card padding="none">
                    <div class="flex items-center gap-2 border-b border-line px-4 py-3">
                      <span class="shrink-0 text-xs font-medium text-ink-muted">Phase {{ i + 1 }}</span>
                      <input
                        type="text"
                        [value]="phase.nom"
                        (input)="nomPhase(i, $event)"
                        placeholder="Nom de la phase"
                        aria-label="Nom de la phase"
                        class="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-ink hover:border-line focus:border-accent"
                      />
                      <button type="button" (click)="deplacerPhase(i, -1)" [disabled]="premiere" class="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30" aria-label="Monter la phase"><app-icon name="chevron-up" class="size-4" /></button>
                      <button type="button" (click)="deplacerPhase(i, 1)" [disabled]="derniere" class="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted hover:text-ink disabled:opacity-30" aria-label="Descendre la phase"><app-icon name="chevron-down" class="size-4" /></button>
                      <button type="button" (click)="supprimerPhase(i)" class="rounded-lg p-1.5 text-ink-muted hover:bg-danger-100 hover:text-danger-500" aria-label="Supprimer la phase"><app-icon name="trash-2" class="size-4" /></button>
                    </div>
                    <div class="flex flex-col gap-1 p-3">
                      @for (et of phase.etapes; track et.cle; let j = $index; let pe = $first; let de = $last) {
                        <div class="flex items-center gap-2 rounded-lg px-1 py-0.5">
                          <span class="w-6 shrink-0 text-center text-xs text-ink-faint">{{ j + 1 }}</span>
                          <input
                            type="text"
                            [value]="et.nom"
                            (input)="nomEtape(i, j, $event)"
                            [attr.data-nouveau]="et.cle === dernierAjout() ? '' : null"
                            (keydown.enter)="ajouterEtape(i, j + 1)"
                            placeholder="Nom de l'étape"
                            aria-label="Nom de l'étape"
                            class="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink"
                          />
                          <label class="hidden shrink-0 items-center gap-1.5 text-xs text-ink-muted sm:flex">
                            <input type="checkbox" [checked]="et.obligatoire" (change)="obligatoireEtape(i, j, $event)" />
                            Obligatoire
                          </label>
                          <button type="button" (click)="deplacerEtape(i, j, -1)" [disabled]="pe" class="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30" aria-label="Monter l'étape"><app-icon name="chevron-up" class="size-3.5" /></button>
                          <button type="button" (click)="deplacerEtape(i, j, 1)" [disabled]="de" class="rounded-lg p-1.5 text-ink-muted hover:bg-surface-muted disabled:opacity-30" aria-label="Descendre l'étape"><app-icon name="chevron-down" class="size-3.5" /></button>
                          <button type="button" (click)="supprimerEtape(i, j)" class="rounded-lg p-1.5 text-ink-muted hover:bg-danger-100 hover:text-danger-500" aria-label="Supprimer l'étape"><app-icon name="x" class="size-3.5" /></button>
                        </div>
                      }
                      <button type="button" (click)="ajouterEtape(i)" class="mt-1 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-accent hover:bg-accent-soft">
                        <app-icon name="plus" class="size-3.5" /> Ajouter une étape
                      </button>
                    </div>
                  </app-card>
                }
                <button type="button" (click)="ajouterPhase()" class="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-sm font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent">
                  <app-icon name="plus" class="size-4" /> Ajouter une phase
                </button>
              }
            }

            <!-- 3. Missions -->
            @if (etape() === 3) {
              <p class="text-[13px] text-ink-muted">
                Ajoutez les missions que chaque entrepreneur devra réaliser à chaque étape. Appuyez sur Entrée pour enchaîner.
                Les livrables attendus se configurent ensuite depuis la fiche de l'étape.
              </p>
              @for (phase of b().phases; track phase.cle; let i = $index) {
                <app-card padding="none">
                  <div class="border-b border-line px-4 py-3">
                    <span class="text-xs text-ink-muted">Phase {{ i + 1 }}</span>
                    <h3 class="text-sm font-semibold text-ink">{{ phase.nom }}</h3>
                  </div>
                  <div class="divide-y divide-line">
                    @for (et of phase.etapes; track et.cle; let j = $index) {
                      <div class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:gap-4">
                        <div class="w-full shrink-0 sm:w-48">
                          <p class="text-sm font-medium text-ink">{{ et.nom }}</p>
                          <p class="text-xs text-ink-muted">{{ et.missions.length }} mission(s)</p>
                        </div>
                        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                          @for (m of et.missions; track m.cle; let k = $index) {
                            <div class="flex items-center gap-2">
                              <input
                                type="text"
                                [value]="m.titre"
                                (input)="titreMission(i, j, k, $event)"
                                [attr.data-nouveau]="m.cle === dernierAjout() ? '' : null"
                                (keydown.enter)="ajouterMission(i, j)"
                                placeholder="Titre de la mission"
                                aria-label="Titre de la mission"
                                class="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink"
                              />
                              <button type="button" (click)="retirerMission(i, j, k)" class="rounded-lg p-1.5 text-ink-muted hover:bg-danger-100 hover:text-danger-500" aria-label="Retirer la mission"><app-icon name="x" class="size-3.5" /></button>
                            </div>
                          }
                          <button type="button" (click)="ajouterMission(i, j)" class="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent-soft">
                            <app-icon name="plus" class="size-3.5" /> Ajouter une mission
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </app-card>
              }
            }

            <!-- 4. Vérification -->
            @if (etape() === 4) {
              <app-card>
                <h2 class="text-base font-semibold text-ink">{{ b().nom }}</h2>
                @if (b().description) { <p class="mt-1 text-[13px] text-ink-muted">{{ b().description }}</p> }
                <dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  @for (s of synthese(); track s.label) {
                    <div class="rounded-xl border border-line px-3 py-2.5">
                      <dt class="text-xs text-ink-muted">{{ s.label }}</dt>
                      <dd class="text-xl font-semibold text-ink tabular-nums">{{ s.valeur }}</dd>
                    </div>
                  }
                </dl>
                @if (etapesSansMission() > 0) {
                  <p class="mt-4 flex items-start gap-2 rounded-xl border border-warning-500/30 bg-warning-100 px-3 py-2.5 text-[13px] text-ink">
                    <app-icon name="alert-circle" class="mt-0.5 size-4 shrink-0 text-warning-500" />
                    {{ etapesSansMission() }} étape(s) n'ont pas encore de mission. Vous pourrez les compléter depuis la fiche du programme.
                  </p>
                }
              </app-card>
              <app-card padding="none">
                <div class="border-b border-line px-4 py-3 text-sm font-semibold text-ink">{{ b().nomParcours || 'Parcours principal' }}</div>
                <ol class="flex flex-col gap-4 p-4">
                  @for (phase of b().phases; track phase.cle; let i = $index) {
                    <li>
                      <p class="text-sm font-medium text-ink"><span class="text-ink-muted">Phase {{ i + 1 }} ·</span> {{ phase.nom }}</p>
                      <ul class="mt-2 flex flex-col gap-1.5 border-l border-line pl-4">
                        @for (et of phase.etapes; track et.cle) {
                          <li class="text-[13px] text-ink">
                            {{ et.nom }}
                            @if (!et.obligatoire) { <span class="text-xs text-ink-faint">(facultative)</span> }
                            @for (m of et.missions; track m.cle) {
                              @if (m.titre.trim()) { <span class="ml-4 block text-xs text-ink-muted">— {{ m.titre }}</span> }
                            }
                          </li>
                        }
                      </ul>
                    </li>
                  }
                </ol>
              </app-card>
            }

            @if (messageBlocage(); as message) {
              <p class="flex items-center gap-2 text-[13px] text-danger-500" role="alert">
                <app-icon name="alert-circle" class="size-4" /> {{ message }}
              </p>
            }

            <!-- Navigation -->
            <div class="flex items-center justify-between gap-3 border-t border-line pt-4">
              @if (etape() > 1) {
                <app-button variant="secondary" (click)="precedent()"><app-icon name="arrow-left" class="size-4" /> Retour</app-button>
              } @else {
                <a routerLink="/incubateur/programmes" class="text-sm font-medium text-ink-muted hover:text-ink">Annuler</a>
              }
              <div class="flex items-center gap-2">
                @if (etape() === 3) {
                  <app-button variant="ghost" (click)="suivant()">Passer</app-button>
                }
                @if (etape() < 4) {
                  <app-button (click)="suivant()" [disabled]="!!messageBlocage()">Continuer <app-icon name="arrow-right" class="size-4" /></app-button>
                } @else {
                  <app-button (click)="creer()"><app-icon name="check" class="size-4" /> Créer le programme</app-button>
                }
              </div>
            </div>
          </div>

          <!-- Aperçu -->
          <aside class="hidden lg:block">
            <app-card class="sticky top-20">
              <p class="text-xs text-ink-muted">Aperçu</p>
              <p class="mt-1 truncate text-sm font-semibold text-ink">{{ b().nom || 'Programme sans nom' }}</p>
              <p class="truncate text-xs text-ink-muted">{{ b().nomParcours || 'Parcours principal' }}</p>
              @if (b().phases.length) {
                <ol class="mt-4 flex flex-col gap-3">
                  @for (phase of b().phases; track phase.cle; let i = $index) {
                    <li>
                      <p class="truncate text-[13px] font-medium text-ink">{{ i + 1 }}. {{ phase.nom || 'Phase sans nom' }}</p>
                      <p class="text-xs text-ink-muted">{{ phase.etapes.length }} étape(s) · {{ missionsDe(phase) }} mission(s)</p>
                    </li>
                  }
                </ol>
              } @else {
                <p class="mt-4 text-xs text-ink-faint">La structure apparaîtra ici.</p>
              }
            </app-card>
          </aside>
        </div>
      }

      <!-- Création en cours / résultat -->
      @if (etat() !== 'edition') {
        <app-card class="mx-auto w-full max-w-xl">
          @if (etat() === 'creation') {
            <h2 class="text-base font-semibold text-ink">Création du programme…</h2>
            <p class="mt-0.5 text-[13px] text-ink-muted">Ne fermez pas cette page.</p>
            <div class="mt-5 h-2 w-full overflow-hidden rounded-full bg-surface-muted" role="progressbar" [attr.aria-valuenow]="pourcentage()" aria-valuemin="0" aria-valuemax="100">
              <div class="h-full rounded-full bg-accent transition-[width] duration-300" [style.width.%]="pourcentage()"></div>
            </div>
            <p class="mt-2 flex justify-between text-xs text-ink-muted">
              <span class="truncate">{{ dernierLibelle() }}</span>
              <span class="shrink-0 tabular-nums">{{ faites() }} / {{ total() }}</span>
            </p>
          } @else if (etat() === 'succes') {
            <div class="flex flex-col items-center py-4 text-center">
              <span class="flex size-12 items-center justify-center rounded-full bg-soft-mint text-vivid-green"><app-icon name="check" class="size-6" /></span>
              <h2 class="mt-4 text-lg font-semibold text-ink">Programme créé</h2>
              <p class="mt-1 text-[13px] text-ink-muted">{{ synthese()[0].valeur }} phase(s), {{ synthese()[1].valeur }} étape(s) et {{ synthese()[2].valeur }} mission(s) sont prêtes.</p>
              <div class="mt-6 flex gap-2">
                <app-button variant="secondary" (click)="recommencer()">Créer un autre programme</app-button>
                <app-button (click)="ouvrirProgramme()">Ouvrir le programme <app-icon name="arrow-right" class="size-4" /></app-button>
              </div>
            </div>
          } @else {
            <div class="flex flex-col items-center py-4 text-center">
              <span class="flex size-12 items-center justify-center rounded-full bg-danger-100 text-danger-500"><app-icon name="alert-circle" class="size-6" /></span>
              <h2 class="mt-4 text-lg font-semibold text-ink">La création n'a pas pu aboutir</h2>
              <p class="mt-1 text-[13px] text-ink-muted">{{ erreur() }}</p>
              <p class="mt-1 text-xs text-ink-faint">{{ faites() }} élément(s) sur {{ total() }} ont été créés.</p>
              <div class="mt-6 flex gap-2">
                @if (programmeId()) {
                  <app-button (click)="ouvrirProgramme()">Compléter depuis la fiche</app-button>
                } @else {
                  <app-button (click)="etat.set('edition')">Revenir à l'assistant</app-button>
                }
              </div>
            </div>
          }
        </app-card>
      }
    </div>
  `,
})
export class ProgrammeWizardComponent {
  private readonly router = inject(Router);
  private readonly creation = inject(ProgrammeCreationService);

  protected readonly etapesAssistant = ETAPES_ASSISTANT;
  protected readonly etape = signal(1);
  protected readonly etapeMax = signal(1);
  protected readonly etat = signal<Etat>('edition');
  protected readonly faites = signal(0);
  protected readonly dernierLibelle = signal('');
  protected readonly erreur = signal('');
  protected readonly programmeId = signal<string | null>(null);
  protected readonly dernierAjout = signal<string | null>(null);
  private readonly hote = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly b = signal<ProgrammeBrouillon>(this.brouillonVide());

  protected readonly total = computed(() => nombreOperations(this.b()));
  protected readonly pourcentage = computed(() => Math.round((this.faites() / Math.max(1, this.total())) * 100));

  protected readonly synthese = computed(() => {
    const phases = this.b().phases;
    const etapes = phases.flatMap((p) => p.etapes);
    return [
      { label: 'Phases', valeur: phases.length },
      { label: 'Étapes', valeur: etapes.length },
      { label: 'Missions', valeur: phases.reduce((t, p) => t + this.missionsDe(p), 0) },
      { label: 'Obligatoires', valeur: etapes.filter((e) => e.obligatoire).length },
    ];
  });

  protected readonly etapesSansMission = computed(
    () => this.b().phases.flatMap((p) => p.etapes).filter((e) => !e.missions.some((m) => m.titre.trim())).length,
  );

  /** Raison pour laquelle on ne peut pas passer à l'étape suivante, sinon null. */
  protected readonly messageBlocage = computed<string | null>(() => {
    const b = this.b();
    if (this.etape() === 1 && !b.nom.trim()) return 'Donnez un nom au programme.';
    if (this.etape() >= 2) {
      if (this.etape() === 2 && b.phases.length === 0) return 'Choisissez un point de départ.';
      if (b.phases.some((p) => !p.nom.trim())) return 'Chaque phase doit avoir un nom.';
      if (b.phases.some((p) => p.etapes.length === 0)) return 'Chaque phase doit contenir au moins une étape.';
      if (b.phases.some((p) => p.etapes.some((e) => !e.nom.trim()))) return 'Chaque étape doit avoir un nom.';
    }
    return null;
  });

  protected missionsDe(phase: PhaseBrouillon): number {
    return phase.etapes.reduce((t, e) => t + e.missions.filter((m) => m.titre.trim()).length, 0);
  }

  private valeur(event: Event): string {
    return (event.target as HTMLInputElement | HTMLTextAreaElement).value;
  }

  protected champ(nom: 'nom' | 'description' | 'nomParcours', event: Event): void {
    const v = this.valeur(event);
    this.modifier((b) => (b[nom] = v));
  }

  protected nomPhase(i: number, event: Event): void {
    const v = this.valeur(event);
    this.modifierPhase(i, (p) => (p.nom = v));
  }

  protected nomEtape(i: number, j: number, event: Event): void {
    const v = this.valeur(event);
    this.modifierEtape(i, j, (e) => (e.nom = v));
  }

  protected obligatoireEtape(i: number, j: number, event: Event): void {
    const v = (event.target as HTMLInputElement).checked;
    this.modifierEtape(i, j, (e) => (e.obligatoire = v));
  }

  protected titreMission(i: number, j: number, k: number, event: Event): void {
    const v = this.valeur(event);
    this.modifierEtape(i, j, (e) => (e.missions[k].titre = v));
  }

  protected retirerMission(i: number, j: number, k: number): void {
    this.modifierEtape(i, j, (e) => e.missions.splice(k, 1));
  }

  /** Applique une modification sur une copie du brouillon (état immuable). */
  protected modifier(fn: (b: ProgrammeBrouillon) => void): void {
    const copie = structuredClone(this.b());
    fn(copie);
    this.b.set(copie);
  }

  protected modifierPhase(i: number, fn: (p: PhaseBrouillon) => void): void {
    this.modifier((b) => fn(b.phases[i]));
  }

  protected modifierEtape(i: number, j: number, fn: (e: EtapeBrouillon) => void): void {
    this.modifier((b) => fn(b.phases[i].etapes[j]));
  }

  // --- Navigation ---
  protected allerA(n: number): void {
    if (n <= this.etapeMax()) this.etape.set(n);
  }

  protected suivant(): void {
    if (this.messageBlocage() || this.etape() >= 4) return;
    this.etape.update((n) => n + 1);
    this.etapeMax.update((m) => Math.max(m, this.etape()));
  }

  protected precedent(): void {
    this.etape.update((n) => Math.max(1, n - 1));
  }

  // --- Structure ---
  protected demarrerAvecModele(): void {
    this.modifier((b) => (b.phases = modeleRecommande()));
  }

  protected demarrerVide(): void {
    this.modifier((b) => (b.phases = [nouvellePhase('', '', [nouvelleEtape()])]));
  }

  protected ajouterPhase(): void {
    this.modifier((b) => b.phases.push(nouvellePhase('', '', [nouvelleEtape()])));
  }

  protected supprimerPhase(i: number): void {
    this.modifier((b) => b.phases.splice(i, 1));
  }

  protected deplacerPhase(i: number, sens: -1 | 1): void {
    this.modifier((b) => {
      const [p] = b.phases.splice(i, 1);
      b.phases.splice(i + sens, 0, p);
    });
  }

  protected ajouterEtape(i: number, position?: number): void {
    const etape = nouvelleEtape();
    this.modifierPhase(i, (p) => p.etapes.splice(position ?? p.etapes.length, 0, etape));
    this.focaliser(etape.cle);
  }

  protected supprimerEtape(i: number, j: number): void {
    this.modifierPhase(i, (p) => p.etapes.splice(j, 1));
  }

  protected deplacerEtape(i: number, j: number, sens: -1 | 1): void {
    this.modifierPhase(i, (p) => {
      const [e] = p.etapes.splice(j, 1);
      p.etapes.splice(j + sens, 0, e);
    });
  }

  protected ajouterMission(i: number, j: number): void {
    const mission = nouvelleMission();
    this.modifierEtape(i, j, (e) => e.missions.push(mission));
    this.focaliser(mission.cle);
  }

  /** Après un ajout, place le curseur dans le champ nouvellement créé. */
  private focaliser(cle: string): void {
    this.dernierAjout.set(cle);
    setTimeout(() => this.hote.nativeElement.querySelector<HTMLInputElement>('[data-nouveau]')?.focus());
  }

  // --- Création ---
  protected async creer(): Promise<void> {
    if (this.messageBlocage()) return;
    this.etat.set('creation');
    this.faites.set(0);
    try {
      const id = await this.creation.creer(this.b(), ({ faites, libelle }) => {
        this.faites.set(faites);
        this.dernierLibelle.set(libelle);
      });
      this.programmeId.set(id);
      this.faites.set(this.total());
      this.etat.set('succes');
    } catch (e) {
      const err = e as ErreurCreation;
      this.programmeId.set(err.programmeId ?? null);
      this.erreur.set(err.message);
      this.etat.set('erreur');
    }
  }

  protected ouvrirProgramme(): void {
    const id = this.programmeId();
    void this.router.navigate(id ? ['/incubateur/programmes', id] : ['/incubateur/programmes']);
  }

  protected recommencer(): void {
    this.b.set(this.brouillonVide());
    this.etape.set(1);
    this.etapeMax.set(1);
    this.programmeId.set(null);
    this.etat.set('edition');
  }

  private brouillonVide(): ProgrammeBrouillon {
    return { nom: '', description: '', nomParcours: 'Parcours principal', phases: [] };
  }
}
