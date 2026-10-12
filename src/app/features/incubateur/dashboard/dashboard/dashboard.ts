import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DatePipe } from '@angular/common';

import { TranslationService } from '../../../../core/services/translation.service';
import { TranslatePipe } from '../../../../shared/pipes/translate.pipe';

// Services & Modèles
import {
  DashboardService,
  DashboardStatsResponse,
  LivrableRecentResponse,
  AlerteProjetResponse,
} from '../../../../core/services/dashboard.service';
import { CohorteService } from '../../../../core/services/cohorte.service';
import { StructureContextService } from '../../../../core/services/structure-context.service';
import { AuthService } from '../../../../core/services/auth.service';
import { EntrepreneurService } from '../../../../core/services/entrepreneur.service';
import { ProjetService } from '../../../../core/services/projet.service';
import { MissionService } from '../../../../core/services/mission.service';
import { LivrableService } from '../../../../core/services/livrable.service';
import { ProgrammeService } from '../../../../core/services/programme.service';
import { ParcoursService } from '../../../../core/services/parcours.service';
import { EtapeService } from '../../../../core/services/etape.service';
import { downloadCsvArchive, CsvArchiveFile, CsvValue } from '../../../../core/utils/csv-export';
import { Cohorte, MissionCohorteResponse, Mission } from '../../../../core/models';
import { Parcours } from '../../../../core/models/cohorte.model';
import { Etape, MissionEtape, Programme } from '../../../../core/models/parcours.model';
import { Projet } from '../../../../core/models/projet.model';
import { EntrepreneurResponse } from '../../../../core/services/entrepreneur.service';
import { LivrableResponse } from '../../../../core/models/livrable.model';

// Design System Partagé
import { KpiCardComponent } from '../../../../shared/components/kpi-card/kpi-card';
import { BadgeComponent, BadgeStatus } from '../../../../shared/components/badge/badge';
import { Icon } from '../../../../shared/components/icon/icon';
import { CardComponent } from '../../../../shared/components/card/card.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { InviterEntrepreneurModalComponent } from '../../entrepreneurs/inviter-entrepreneur/inviter-entrepreneur';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    KpiCardComponent,
    BadgeComponent,
    Icon,
    CardComponent,
    PageHeaderComponent,
    ButtonComponent,
    EmptyStateComponent,
    InviterEntrepreneurModalComponent,
    TranslatePipe,
  ],
  templateUrl:"./dashboard.html"
})
export class Dashboard implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly cohorteService = inject(CohorteService);
  private readonly structureContext = inject(StructureContextService);
  private readonly authService = inject(AuthService);
  private readonly entrepreneurService = inject(EntrepreneurService);
  private readonly projetService = inject(ProjetService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);
  private readonly programmeService = inject(ProgrammeService);
  private readonly parcoursService = inject(ParcoursService);
  private readonly etapeService = inject(EtapeService);
protected readonly currentUser = this.authService.currentUser;
private readonly translationService = inject(TranslationService);
protected readonly salutation = computed(() => {
  const user = this.currentUser();
  const prenom = user?.prenom;
  const heure = new Date().getHours();

  const key =
    heure < 12
      ? 'incubateur.dashboard.salutation.matin'
      : heure < 18
        ? 'incubateur.dashboard.salutation.apresMidi'
        : 'incubateur.dashboard.salutation.soir';

  const greeting = this.translationService.t(key);

  return prenom
    ? `${greeting}, ${prenom}`
    : greeting;
});
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isLoading = signal<boolean>(true);
  protected readonly nomStructure = signal<string>('Incubateur');
  protected readonly showInviteModal = signal<boolean>(false);
  protected readonly isExporting = signal(false);
  protected readonly exportError = signal<string | null>(null);

  protected readonly stats = signal<DashboardStatsResponse | undefined>(undefined);
  protected readonly cohortesActives = signal<Cohorte[]>([]);
  protected readonly livrablesRecents = signal<LivrableRecentResponse[]>([]);
  protected readonly alertesProjets = signal<AlerteProjetResponse[]>([]);

  ngOnInit(): void {
    const activeMembership = this.structureContext.activeMembership();
    if (activeMembership) {
      this.nomStructure.set(activeMembership.structure.nom);
    }

    this.chargerDonneesDashboard();
  }

  protected chargerDonneesDashboard(): void {
    this.isLoading.set(true);

    forkJoin({
      stats: this.dashboardService.getStats().pipe(catchError(() => of(undefined))),
      cohortes: this.cohorteService.getActiveCohortes().pipe(catchError(() => of([]))),
      livrablesRecents: this.dashboardService.getLivrablesRecents(5).pipe(catchError(() => of([]))),
      alertes: this.dashboardService.getAlertes().pipe(catchError(() => of([]))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ stats, cohortes, livrablesRecents, alertes }) => {
          this.stats.set(stats);
          this.cohortesActives.set(cohortes);
          this.livrablesRecents.set(livrablesRecents);
          this.alertesProjets.set(alertes);
          this.isLoading.set(false);
        },
        error: (err) => {
          console.error('Erreur chargement dashboard:', err);
          this.isLoading.set(false);
        },
      });
  }

  protected badgeLivrableStatus(statut?: string): BadgeStatus {
    switch (statut?.toUpperCase()) {
      case 'VALIDE':
        return 'success';
      case 'EN_ATTENTE':
        return 'warning';
      case 'A_CORRIGER':
      case 'REJETE':
        return 'danger';
      default:
        return 'neutral';
    }
  }

protected formaterStatutLivrable(statut?: string): string {
  switch (statut?.toUpperCase()) {
    case 'VALIDE':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.valide'
      );

    case 'EN_ATTENTE':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.enAttente'
      );

    case 'A_CORRIGER':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.aCorriger'
      );

    case 'REJETE':
      return this.translationService.t(
        'incubateur.dashboard.livrableStatut.rejete'
      );

    default:
      return statut ||
        this.translationService.t(
          'incubateur.dashboard.livrableStatut.depose'
        );
  }
}

  protected projetsParPhaseWidth(nombre: number): number {
    const phases = this.stats()?.projetsParPhase ?? [];
    const max = Math.max(...phases.map(p => p.nombre), 1);
    return Math.round((nombre / max) * 100);
  }

  protected exporterDonneesGlobales(): void {
    if (this.isExporting()) return;

    this.isExporting.set(true);
    this.exportError.set(null);

    forkJoin({
      stats: this.dashboardService.getStats(),
      cohortes: this.cohorteService.getAllCohortes(),
      projets: this.projetService.getProjets('TOUS'),
      entrepreneurs: this.entrepreneurService.getEntrepreneurs(),
      programmes: this.programmeService.getAllProgrammes(),
      parcours: this.parcoursService.getAllParcours(),
      etapes: this.etapeService.getAllEtapes(),
      missionsCohorte: this.missionService.getMissionsCohorteAgregees(),
      suivisMissions: this.missionService.getMissions(),
      livrables: this.livrableService.getAllForExport(),
      alertes: this.dashboardService.getAlertes(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (data) => {
          const missionsEtapesRequests = data.etapes.map((etape) =>
            this.etapeService.getMissionsByEtapeId(etape.id),
          );
          const missionsEtapes$ = missionsEtapesRequests.length
            ? forkJoin(missionsEtapesRequests)
            : of([] as MissionEtape[][]);

          missionsEtapes$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (missionsEtapes) => {
                const files = this.construireExportGlobal({
                  ...data,
                  missionsEtapes: missionsEtapes.flat(),
                });
                const nomStructure = this.structureContext.activeMembership()?.structure.nom ?? 'incubateur';
                downloadCsvArchive(
                  `export-global-${nomStructure}-${new Date().toISOString().slice(0, 10)}`,
                  files,
                );
                this.isExporting.set(false);
              },
              error: (error) => this.gererErreurExport(error),
            });
        },
        error: (error) => this.gererErreurExport(error),
      });
  }

  private construireExportGlobal(data: {
    stats: DashboardStatsResponse;
    cohortes: Cohorte[];
    projets: Projet[];
    entrepreneurs: EntrepreneurResponse[];
    programmes: Programme[];
    parcours: Parcours[];
    etapes: Etape[];
    missionsCohorte: MissionCohorteResponse[];
    suivisMissions: Mission[];
    missionsEtapes: MissionEtape[];
    livrables: LivrableResponse[];
    alertes: AlerteProjetResponse[];
  }): CsvArchiveFile[] {
    const dateExport = new Date().toISOString();
    const phases = data.parcours.flatMap((parcours) =>
      (parcours.phases ?? []).map((phase) => ({ ...phase, parcours })),
    );
    const phaseById = new Map(phases.map((phase) => [phase.id, phase]));
    const cohortesById = new Map(data.cohortes.map((cohorte) => [cohorte.id, cohorte]));
    const projetsById = new Map(data.projets.map((projet) => [projet.id, projet]));

    const fichier = (
      name: string,
      headers: string[],
      rows: CsvValue[][],
    ): CsvArchiveFile => ({ name, headers, rows });

    return [
      fichier('synthese', ['Indicateur', 'Valeur', 'Date d’export'], [
        ['Structure', this.nomStructure(), dateExport],
        ['Entrepreneurs', data.stats.totalEntrepreneurs, dateExport],
        ['Entrepreneurs actifs', data.stats.entrepreneursActifs, dateExport],
        ['Invitations en attente', data.stats.invitationsEnAttente, dateExport],
        ['Cohortes', data.stats.totalCohortes, dateExport],
        ['Score moyen de maturité (%)', data.stats.scoreMaturiteMoyen, dateExport],
        ['Projets nécessitant une attention', data.stats.projetsAttention, dateExport],
        ['Livrables en attente d’évaluation', data.stats.livrablesEnAttente, dateExport],
        ['Projets en retard', data.stats.projetsEnRetard, dateExport],
        ...data.stats.projetsParPhase.map((phase) => [
          `Projets — ${phase.nomPhase}`,
          phase.nombre,
          dateExport,
        ]),
      ]),
      fichier('entrepreneurs', [
        'ID',
        'Prénom',
        'Nom',
        'E-mail',
        'Statut invitation',
        'Date invitation',
        'Cohorte',
      ], data.entrepreneurs.map((entrepreneur) => [
        entrepreneur.id,
        entrepreneur.prenom,
        entrepreneur.nom,
        entrepreneur.email,
        entrepreneur.statutInvitation,
        entrepreneur.dateInvitation,
        entrepreneur.nomCohorte,
      ])),
      fichier('projets', [
        'ID',
        'Projet',
        'Secteur',
        'Description',
        'Entrepreneur',
        'Cohorte',
        'Programme',
        'Parcours',
        'Phase',
        'Maturité (%)',
        'Missions validées',
        'Missions totales',
        'Statut',
        'Archivé',
        'Date de création',
      ], data.projets.map((projet) => [
        projet.id,
        projet.nom,
        projet.secteur,
        projet.description,
        projet.nomEntrepreneur,
        projet.nomCohorte,
        data.parcours.find((parcours) => parcours.id === projet.parcoursId)?.programmeNom,
        projet.nomParcours,
        projet.nomPhase,
        projet.scoreMaturite,
        projet.nombreMissionsValidees,
        projet.nombreMissionsTotal,
        projet.statut,
        projet.archive ? 'Oui' : 'Non',
        projet.dateCreation,
      ])),
      fichier('cohortes', [
        'ID',
        'Cohorte',
        'Statut',
        'Parcours',
        'Phase',
        'Date de début',
        'Date de fin',
        'Coachs',
      ], data.cohortes.map((cohorte) => [
        cohorte.id,
        cohorte.nom,
        cohorte.statut,
        data.parcours.find((parcours) => parcours.id === cohorte.parcoursId)?.nom,
        cohorte.phase?.nom ?? phaseById.get(cohorte.phaseId ?? '')?.nom,
        cohorte.dateDebut,
        cohorte.dateFin,
        cohorte.coachs?.map((coach) => `${coach.prenom ?? ''} ${coach.nom ?? ''}`.trim() || coach.email).join(', '),
      ])),
      fichier('programmes', ['ID', 'Programme', 'Description', 'Archivé', 'Parcours'], data.programmes.map((programme) => [
        programme.id,
        programme.nom,
        programme.description,
        programme.archive ? 'Oui' : 'Non',
        data.parcours.filter((parcours) =>
          parcours.programmeId === programme.id || programme.parcoursIds.includes(parcours.id),
        ).map((parcours) => parcours.nom).join(', '),
      ])),
      fichier('parcours-phases-etapes', [
        'Programme',
        'Parcours',
        'Phase',
        'Ordre phase',
        'Phase archivée',
        'Étape',
        'Ordre étape',
        'Étape obligatoire',
        'Étape archivée',
      ], data.etapes.map((etape) => {
        const phase = phaseById.get(etape.phaseId);
        return [
          phase?.parcours.programmeNom,
          phase?.parcours.nom,
          phase?.nom,
          phase?.ordre,
          phase?.archive ? 'Oui' : 'Non',
          etape.nom,
          etape.ordre,
          etape.obligatoire ? 'Oui' : 'Non',
          etape.archive ? 'Oui' : 'Non',
        ];
      })),
      fichier('missions-cohortes', [
        'ID',
        'Mission',
        'Cohorte',
        'Phase',
        'Étape',
        'Échéance',
        'Priorité',
        'Projets concernés',
        'Validés',
        'En revue',
        'À corriger',
        'À faire',
        'En retard',
        'Verrouillée',
      ], data.missionsCohorte.map((mission) => [
        mission.id,
        mission.titre,
        cohortesById.get(mission.cohorteId ?? '')?.nom ?? mission.nomCohorte,
        phaseById.get(cohortesById.get(mission.cohorteId ?? '')?.phaseId ?? '')?.nom,
        mission.nomEtape,
        mission.dateEcheance,
        mission.priorite,
        mission.nombreProjetsConcernes,
        mission.nombreValides,
        mission.nombreEnRevue,
        mission.nombreACorriger,
        mission.nombreAFaire,
        mission.nombreEnRetard,
        mission.verrouillee ? 'Oui' : 'Non',
      ])),
      fichier('missions-suivi-individuel', [
        'ID',
        'Mission',
        'Type',
        'Projet',
        'Entrepreneur',
        'Cohorte',
        'Statut',
        'Priorité',
        'Échéance',
        'Livrables déposés',
        'Livrables attendus',
        'Date de création',
      ], data.suivisMissions.map((mission) => [
        mission.id,
        mission.titre,
        mission.missionEtapeId ? 'Étape' : 'Cohorte',
        mission.nomProjet,
        mission.nomEntrepreneur,
        mission.nomCohorte ?? cohortesById.get(mission.cohorteId ?? '')?.nom,
        mission.statut,
        mission.priorite,
        mission.dateEcheance,
        mission.nombreLivrablesDeposes,
        mission.nombreLivrablesAttendus,
        mission.dateCreation,
      ])),
      fichier('missions-etapes-configurees', [
        'ID',
        'Mission',
        'Description',
        'Étape',
        'Phase',
        'Parcours',
        'Ordre',
        'Obligatoire',
        'Livrables attendus',
      ], data.missionsEtapes.map((mission) => {
        const etape = data.etapes.find((candidate) => candidate.id === mission.etapeId);
        const phase = phaseById.get(etape?.phaseId ?? mission.phaseId ?? '');
        return [
          mission.id,
          mission.titre,
          mission.description,
          etape?.nom,
          phase?.nom,
          phase?.parcours.nom,
          mission.ordre,
          mission.obligatoire ? 'Oui' : 'Non',
          mission.livrablesAttenduesCount,
        ];
      })),
      fichier('livrables', [
        'ID',
        'Projet',
        'Mission',
        'Nom',
        'Type',
        'Statut',
        'Version actuelle',
        'Note',
        'Date de dépôt',
        'Date d’évaluation',
        'Date de validation',
        'Réponse / contenu',
        'Lien ou fichier',
        'Commentaire coach',
        'Motif de correction',
        'Points à corriger',
        'Ressource recommandée',
        'Échéance correction',
      ], data.livrables.map((livrable) => [
        livrable.id,
        livrable.nomProjet ?? projetsById.get(livrable.projetId)?.nom,
        livrable.titreMission,
        livrable.nom,
        livrable.typePiece,
        livrable.statut,
        livrable.numeroVersion,
        livrable.note,
        livrable.dateDepot,
        livrable.dateEvaluation,
        livrable.dateValidation,
        livrable.typePiece === 'FICHIER' ? '' : livrable.contenu ?? livrable.url,
        livrable.typePiece === 'FICHIER' || livrable.typePiece === 'LIEN' ? livrable.url : '',
        livrable.commentaireCoach,
        livrable.motifRefus,
        livrable.pointsACorriger,
        livrable.ressourceRecommandee,
        livrable.dateEcheanceCorrection,
      ])),
      fichier('historique-livrables', [
        'ID livrable',
        'Projet',
        'Mission',
        'Nom',
        'Version',
        'Type',
        'Statut',
        'Note',
        'Date de dépôt',
        'Date d’évaluation',
        'Contenu',
        'Lien ou fichier',
        'Commentaire coach',
        'Motif de correction',
        'Points à corriger',
      ], data.livrables.flatMap((livrable) => (livrable.historique ?? []).map((version) => [
        livrable.id,
        livrable.nomProjet ?? projetsById.get(livrable.projetId)?.nom,
        livrable.titreMission,
        version.nom,
        version.numeroVersion,
        version.typePiece,
        version.statut,
        version.note,
        version.dateDepot,
        version.dateEvaluation,
        version.typePiece === 'FICHIER' ? '' : version.contenu ?? version.url,
        version.typePiece === 'FICHIER' || version.typePiece === 'LIEN' ? version.url : '',
        version.commentaireCoach,
        version.motifRefus,
        version.pointsACorriger,
      ]))),
      fichier('alertes', [
        'Projet',
        'Entrepreneur',
        'E-mail',
        'Cohorte',
        'Maturité (%)',
        'Raison de l’alerte',
      ], data.alertes.map((alerte) => [
        alerte.nomProjet,
        alerte.nomEntrepreneur,
        alerte.emailEntrepreneur,
        alerte.nomCohorte,
        alerte.scoreMaturite,
        alerte.raisonAlerte,
      ])),
    ];
  }

  private gererErreurExport(error: unknown): void {
    console.error('Erreur export global des données:', error);
    this.exportError.set(
      'L’export global n’a pas pu être créé car certaines données n’ont pas pu être chargées. Réessayez après avoir vérifié votre connexion.',
    );
    this.isExporting.set(false);
  }
}