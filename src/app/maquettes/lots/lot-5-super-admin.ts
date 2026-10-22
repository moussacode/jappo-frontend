import { Component } from '@angular/core';
import { MqLot, MqScreen } from '../kit';
import { MqDonnees, MqPage } from '../kit/mq-page';
import { R } from '../donnees-reelles';
import { SuperAdminDashboard } from '../../features/super-admin/dashboard/super-admin-dashboard';
import { StructuresList } from '../../features/super-admin/structures/structures-list/structures-list';
import { StructureDetail } from '../../features/super-admin/structures/structure-detail/structure-detail';
import { TransactionsList } from '../../features/super-admin/transactions/transactions-list/transactions-list';
import { AbonnementsList } from '../../features/super-admin/abonnements/abonnements-list/abonnements-list';
import { PlansList } from '../../features/super-admin/plans/plans-list/plans-list';
import { CohortesList } from '../../features/incubateur/cohortes/cohortes-list/cohortes-list';
import { EditCohorteComponent } from '../../features/incubateur/cohortes/edit-cohorte/edit-cohorte';
import { EntrepreneursList } from '../../features/incubateur/entrepreneurs/entrepreneurs-list/entrepreneurs-list';
import { InviterEntrepreneurModalComponent } from '../../features/incubateur/entrepreneurs/inviter-entrepreneur/inviter-entrepreneur';
import { ProjetsList } from '../../features/incubateur/projets/projets-list/projets-list';
import { NouveauProjetModal } from '../../features/incubateur/projets/nouveau-projet-modal/nouveau-projet-modal';
import { MissionsList } from '../../features/incubateur/missions/missions-list/missions-list';
import { MissionCreateModalComponent } from '../../features/incubateur/missions/mission-create/mission-create';
import { Dashboard } from '../../features/incubateur/dashboard/dashboard/dashboard';
import { ParametresModal } from '../../shared/components/parametres-modal/parametres-modal';

@Component({
  selector: 'mq-lot-5',
  imports: [MqLot, MqScreen, MqPage],
  template: `
    <mq-lot [numero]="5" titre="Super-admin & modales"
      description="Back-office (compte super-admin) puis modales réelles de l'espace Incubateur (compte administrateur).">
      <mq-screen numero="5.01" titre="Vue d'ensemble" route="/super-admin/dashboard"><mq-page espace="super-admin" url="/super-admin/dashboard" [composant]="c.saDashboard" /></mq-screen>
      <mq-screen numero="5.02" titre="Structures" route="/super-admin/structures"><mq-page espace="super-admin" url="/super-admin/structures" [composant]="c.structures" /></mq-screen>
      <mq-screen numero="5.03" titre="Détail d'une structure" route="/super-admin/structures/:id"><mq-page espace="super-admin" url="/super-admin/structures/:id" [composant]="c.structure" [resoudre]="r.structure" manque="Aucune structure (compte super-admin requis)." /></mq-screen>
      <mq-screen numero="5.04" titre="Transactions" route="/super-admin/transactions"><mq-page espace="super-admin" url="/super-admin/transactions" [composant]="c.transactions" /></mq-screen>
      <mq-screen numero="5.05" titre="Abonnements" route="/super-admin/abonnements"><mq-page espace="super-admin" url="/super-admin/abonnements" [composant]="c.abonnements" /></mq-screen>
      <mq-screen numero="5.06" titre="Plans" route="/super-admin/plans"><mq-page espace="super-admin" url="/super-admin/plans" [composant]="c.plans" /></mq-screen>
      <mq-screen numero="5.07" titre="Modale — Modifier une cohorte" route="/incubateur/cohortes" [hauteur]="900"><mq-page url="/incubateur/cohortes" [composant]="c.cohortes" [modale]="c.editCohorte" [resoudre]="r.cohorte" [entrees]="entreesCohorte" manque="Aucune cohorte." /></mq-screen>
      <mq-screen numero="5.08" titre="Modale — Inviter des entrepreneurs" route="/incubateur/entrepreneurs" [hauteur]="900"><mq-page url="/incubateur/entrepreneurs" [composant]="c.entrepreneurs" [modale]="c.inviter" /></mq-screen>
      <mq-screen numero="5.09" titre="Modale — Nouveau projet" route="/incubateur/projets" [hauteur]="900"><mq-page url="/incubateur/projets" [composant]="c.projets" [modale]="c.nouveauProjet" /></mq-screen>
      <mq-screen numero="5.10" titre="Modale — Nouvelle mission" route="/incubateur/missions" [hauteur]="900"><mq-page url="/incubateur/missions" [composant]="c.missions" [modale]="c.nouvelleMission" /></mq-screen>
      <mq-screen numero="5.11" titre="Modale — Paramètres" route="/incubateur/dashboard" [hauteur]="900"><mq-page url="/incubateur/dashboard" [composant]="c.dashboard" [modale]="c.parametres" /></mq-screen>
    </mq-lot>
  `,
})
export class Lot5SuperAdmin {
  protected readonly r = R;
  protected readonly entreesCohorte = (d: MqDonnees) => ({ cohorte: d['cohorte'] });
  protected readonly c = {
    saDashboard: SuperAdminDashboard, structures: StructuresList, structure: StructureDetail,
    transactions: TransactionsList, abonnements: AbonnementsList, plans: PlansList,
    cohortes: CohortesList, editCohorte: EditCohorteComponent, entrepreneurs: EntrepreneursList,
    inviter: InviterEntrepreneurModalComponent, projets: ProjetsList, nouveauProjet: NouveauProjetModal,
    missions: MissionsList, nouvelleMission: MissionCreateModalComponent, dashboard: Dashboard, parametres: ParametresModal,
  };
}
