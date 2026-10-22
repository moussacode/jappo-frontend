import { Component } from '@angular/core';
import { MqLot, MqScreen } from '../kit';
import { MqPage } from '../kit/mq-page';
import { R } from '../donnees-reelles';
import { Dashboard } from '../../features/incubateur/dashboard/dashboard/dashboard';
import { CohortesList } from '../../features/incubateur/cohortes/cohortes-list/cohortes-list';
import { CohorteDetail } from '../../features/incubateur/cohortes/cohorte-detail/cohorte-detail';
import { CohorteRapport } from '../../features/incubateur/cohortes/cohorte-rapport/cohorte-rapport';
import { ProgrammesListComponent } from '../../features/incubateur/programmes/programmes-list/programmes-list';
import { ProgrammeWizardComponent } from '../../features/incubateur/programmes/programme-wizard/programme-wizard';
import { ProgrammeDetailComponent } from '../../features/incubateur/programmes/programme-detail/programme-detail';
import { ParcoursDetailComponent } from '../../features/incubateur/programmes/parcours-detail/parcours-detail';
import { EtapeDetailComponent } from '../../features/incubateur/programmes/etape-detail/etape-detail';
import { ParcoursList } from '../../features/incubateur/parcours/parcours-list/parcours-list';
import { EntrepreneursList } from '../../features/incubateur/entrepreneurs/entrepreneurs-list/entrepreneurs-list';
import { EntrepreneurDetail } from '../../features/incubateur/entrepreneurs/entrepreneur-detail/entrepreneur-detail';

@Component({
  selector: 'mq-lot-3',
  imports: [MqLot, MqScreen, MqPage],
  template: `
    <mq-lot [numero]="3" titre="Espace Incubateur — pilotage"
      description="Pages réelles, avec les données du compte administrateur ou coach connecté.">
      <mq-screen numero="3.01" titre="Vue d'ensemble" route="/incubateur/dashboard"><mq-page url="/incubateur/dashboard" [composant]="c.dashboard" /></mq-screen>
      <mq-screen numero="3.02" titre="Cohortes" route="/incubateur/cohortes"><mq-page url="/incubateur/cohortes" [composant]="c.cohortes" /></mq-screen>
      <mq-screen numero="3.03" titre="Détail d'une cohorte" route="/incubateur/cohortes/:id"><mq-page url="/incubateur/cohortes/:id" [composant]="c.cohorte" [resoudre]="r.cohorte" manque="Aucune cohorte." /></mq-screen>
      <mq-screen numero="3.04" titre="Rapport de cohorte" route="/incubateur/cohortes/:id/rapport"><mq-page url="/incubateur/cohortes/:id/rapport" [composant]="c.rapport" [resoudre]="r.cohorte" manque="Aucune cohorte." /></mq-screen>
      <mq-screen numero="3.05" titre="Programmes" route="/incubateur/programmes"><mq-page url="/incubateur/programmes" [composant]="c.programmes" /></mq-screen>
      <mq-screen numero="3.06" titre="Nouveau programme (assistant)" route="/incubateur/programmes/nouveau"><mq-page url="/incubateur/programmes/nouveau" [composant]="c.assistant" /></mq-screen>
      <mq-screen numero="3.07" titre="Détail d'un programme" route="/incubateur/programmes/:id"><mq-page url="/incubateur/programmes/:id" [composant]="c.programme" [resoudre]="r.programme" manque="Aucun programme." /></mq-screen>
      <mq-screen numero="3.08" titre="Détail d'un parcours" route="/incubateur/programmes/:programmeId/parcours/:parcoursId"><mq-page url="/incubateur/programmes/:programmeId/parcours/:parcoursId" [composant]="c.parcours" [resoudre]="r.parcoursDeProgramme" manque="Aucun parcours rattaché à un programme." /></mq-screen>
      <mq-screen numero="3.09" titre="Détail d'une étape" route="/incubateur/programmes/etapes/:id"><mq-page url="/incubateur/programmes/etapes/:id" [composant]="c.etape" [resoudre]="r.etape" manque="Aucune étape." /></mq-screen>
      <mq-screen numero="3.10" titre="Parcours" route="/incubateur/parcours"><mq-page url="/incubateur/parcours" [composant]="c.parcoursListe" /></mq-screen>
      <mq-screen numero="3.11" titre="Entrepreneurs" route="/incubateur/entrepreneurs"><mq-page url="/incubateur/entrepreneurs" [composant]="c.entrepreneurs" /></mq-screen>
      <mq-screen numero="3.12" titre="Détail d'un entrepreneur" route="/incubateur/entrepreneurs/:id"><mq-page url="/incubateur/entrepreneurs/:id" [composant]="c.entrepreneur" [resoudre]="r.entrepreneur" manque="Aucun entrepreneur." /></mq-screen>
    </mq-lot>
  `,
})
export class Lot3IncubateurPilotage {
  protected readonly r = R;
  protected readonly c = {
    dashboard: Dashboard, cohortes: CohortesList, cohorte: CohorteDetail, rapport: CohorteRapport,
    programmes: ProgrammesListComponent, assistant: ProgrammeWizardComponent, programme: ProgrammeDetailComponent,
    parcours: ParcoursDetailComponent, etape: EtapeDetailComponent, parcoursListe: ParcoursList,
    entrepreneurs: EntrepreneursList, entrepreneur: EntrepreneurDetail,
  };
}
