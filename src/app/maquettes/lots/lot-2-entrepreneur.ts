import { Component } from '@angular/core';
import { MqLot, MqScreen } from '../kit';
import { MqPage } from '../kit/mq-page';
import { R } from '../donnees-reelles';
import { MonParcours } from '../../features/entrepreneur/mon-parcours/mon-parcours';
import { Dashboard } from '../../features/entrepreneur/dashboard/dashboard/dashboard';
import { MissionsList } from '../../features/entrepreneur/missions/missions-list/missions-list';
import { MissionDetail } from '../../features/entrepreneur/missions/mission-detail/mission-detail';
import { MesDocuments } from '../../features/entrepreneur/documents/mes-documents/mes-documents';
import { EntrepreneurRessources } from '../../features/entrepreneur/ressources/entrepreneur-ressources';
import { EntrepreneurMeetingsListComponent } from '../../features/entrepreneur/meetings/entrepreneur-meetings-list/entrepreneur-meetings-list';
import { EntrepreneurProjetsListComponent } from '../../features/entrepreneur/projets/entrepreneur-projets-list/entrepreneur-projets-list';
import { EntrepreneurProjetEditComponent } from '../../features/entrepreneur/projets/entrepreneur-projet-edit/entrepreneur-projet-edit';
import { EntrepreneurAssistantPage } from '../../features/entrepreneur/assistant/entrepreneur-assistant-page';

@Component({
  selector: 'mq-lot-2',
  imports: [MqLot, MqScreen, MqPage],
  template: `
    <mq-lot [numero]="2" titre="Espace Entrepreneur"
      description="Pages réelles, avec les données du compte entrepreneur connecté.">
      <mq-screen numero="2.01" titre="Mon parcours" route="/entrepreneur/mon-parcours"><mq-page espace="entrepreneur" url="/entrepreneur/mon-parcours" [composant]="c.parcours" /></mq-screen>
      <mq-screen numero="2.02" titre="Tableau de bord" route="/entrepreneur/dashboard"><mq-page espace="entrepreneur" url="/entrepreneur/dashboard" [composant]="c.dashboard" /></mq-screen>
      <mq-screen numero="2.03" titre="Mes activités" route="/entrepreneur/missions"><mq-page espace="entrepreneur" url="/entrepreneur/missions" [composant]="c.missions" /></mq-screen>
      <mq-screen numero="2.04" titre="Détail d'une mission" route="/entrepreneur/missions/:id"><mq-page espace="entrepreneur" url="/entrepreneur/missions/:id" [composant]="c.mission" [resoudre]="r.maMission" manque="Aucune mission sur votre projet." /></mq-screen>
      <mq-screen numero="2.05" titre="Mes livrables" route="/entrepreneur/documents"><mq-page espace="entrepreneur" url="/entrepreneur/documents" [composant]="c.documents" /></mq-screen>
      <mq-screen numero="2.06" titre="Ressources" route="/entrepreneur/ressources"><mq-page espace="entrepreneur" url="/entrepreneur/ressources" [composant]="c.ressources" /></mq-screen>
      <mq-screen numero="2.07" titre="Mes réunions" route="/entrepreneur/reunions"><mq-page espace="entrepreneur" url="/entrepreneur/reunions" [composant]="c.reunions" /></mq-screen>
      <mq-screen numero="2.08" titre="Mes projets" route="/entrepreneur/projets"><mq-page espace="entrepreneur" url="/entrepreneur/projets" [composant]="c.projets" /></mq-screen>
      <mq-screen numero="2.09" titre="Modifier un projet" route="/entrepreneur/projets/:id/modifier"><mq-page espace="entrepreneur" url="/entrepreneur/projets/:id/modifier" [composant]="c.projetEdit" [resoudre]="r.monProjet" manque="Aucun projet sur ce compte." /></mq-screen>
      <mq-screen numero="2.10" titre="Assistant IA" route="/entrepreneur/assistant" [hauteur]="900"><mq-page espace="entrepreneur" url="/entrepreneur/assistant" [composant]="c.assistant" /></mq-screen>
    </mq-lot>
  `,
})
export class Lot2Entrepreneur {
  protected readonly r = R;
  protected readonly c = {
    parcours: MonParcours, dashboard: Dashboard, missions: MissionsList, mission: MissionDetail, documents: MesDocuments,
    ressources: EntrepreneurRessources, reunions: EntrepreneurMeetingsListComponent, projets: EntrepreneurProjetsListComponent,
    projetEdit: EntrepreneurProjetEditComponent, assistant: EntrepreneurAssistantPage,
  };
}
