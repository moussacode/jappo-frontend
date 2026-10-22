import { Component } from '@angular/core';
import { MqLot, MqScreen } from '../kit';
import { MqPage } from '../kit/mq-page';
import { R } from '../donnees-reelles';
import { MissionsList } from '../../features/incubateur/missions/missions-list/missions-list';
import { MissionDetail } from '../../features/incubateur/missions/mission-detail/mission-detail';
import { MissionCohorteDetail } from '../../features/incubateur/missions/mission-cohorte-detail/mission-cohorte-detail';
import { ProjetsList } from '../../features/incubateur/projets/projets-list/projets-list';
import { ProjetDetail } from '../../features/incubateur/projets/projet-detail/projet-detail';
import { MeetingsListComponent } from '../../features/incubateur/meetings/meetings-list/meetings-list';
import { MeetingPlanningComponent } from '../../features/incubateur/meetings/meeting-planning/meeting-planning';
import { RessourcesList } from '../../features/incubateur/ressources/ressources-list/ressources-list';
import { AssistantIa } from '../../features/incubateur/assistant-ia/assistant-ia/assistant-ia';
import { Parametres } from '../../features/incubateur/parametres/parametres';

@Component({
  selector: 'mq-lot-4',
  imports: [MqLot, MqScreen, MqPage],
  template: `
    <mq-lot [numero]="4" titre="Espace Incubateur — suivi & collaboration"
      description="Pages réelles, avec les données du compte administrateur ou coach connecté.">
      <mq-screen numero="4.01" titre="Activités" route="/incubateur/missions"><mq-page url="/incubateur/missions" [composant]="c.missions" /></mq-screen>
      <mq-screen numero="4.02" titre="Mission d'un projet — évaluation" route="/incubateur/missions/:id"><mq-page url="/incubateur/missions/:id" [composant]="c.mission" [resoudre]="r.missionSuivie" manque="Aucune mission attribuée." /></mq-screen>
      <mq-screen numero="4.03" titre="Mission de cohorte — suivi" route="/incubateur/missions-cohorte/:id"><mq-page url="/incubateur/missions-cohorte/:id" [composant]="c.missionCohorte" [resoudre]="r.missionCohorte" manque="Aucune mission de cohorte." /></mq-screen>
      <mq-screen numero="4.04" titre="Projets" route="/incubateur/projets"><mq-page url="/incubateur/projets" [composant]="c.projets" /></mq-screen>
      <mq-screen numero="4.05" titre="Détail d'un projet" route="/incubateur/projets/:id"><mq-page url="/incubateur/projets/:id" [composant]="c.projet" [resoudre]="r.projet" manque="Aucun projet." /></mq-screen>
      <mq-screen numero="4.06" titre="Réunions" route="/incubateur/reunions"><mq-page url="/incubateur/reunions" [composant]="c.reunions" /></mq-screen>
      <mq-screen numero="4.07" titre="Planifier une réunion" route="/incubateur/reunions/nouvelle"><mq-page url="/incubateur/reunions/nouvelle" [composant]="c.planifier" /></mq-screen>
      <mq-screen numero="4.08" titre="Ressources" route="/incubateur/ressources"><mq-page url="/incubateur/ressources" [composant]="c.ressources" /></mq-screen>
      <mq-screen numero="4.09" titre="Assistant IA" route="/incubateur/assistant-ia" [hauteur]="900"><mq-page url="/incubateur/assistant-ia" [composant]="c.assistant" /></mq-screen>
      <mq-screen numero="4.10" titre="Paramètres" route="/incubateur/parametres"><mq-page url="/incubateur/parametres" [composant]="c.parametres" /></mq-screen>
    </mq-lot>
  `,
})
export class Lot4IncubateurSuivi {
  protected readonly r = R;
  protected readonly c = {
    missions: MissionsList, mission: MissionDetail, missionCohorte: MissionCohorteDetail, projets: ProjetsList,
    projet: ProjetDetail, reunions: MeetingsListComponent, planifier: MeetingPlanningComponent,
    ressources: RessourcesList, assistant: AssistantIa, parametres: Parametres,
  };
}
