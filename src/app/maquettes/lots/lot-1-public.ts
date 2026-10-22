import { Component } from '@angular/core';
import { MqLot, MqScreen } from '../kit';
import { MqPage } from '../kit/mq-page';
import { LandingPage } from '../../features/landing/landing-page/landing-page';
import { Connexion } from '../../features/auth/pages/connexion/connexion';
import { ForgotPasswordComponent } from '../../features/auth/pages/forgot-password/forgot-password.component';
import { InscriptionStructure } from '../../features/auth/pages/inscription-structure/inscription-structure';
import { AcceptInvitationComponent } from '../../features/auth/accept-invitation/accept-invitation';
import { OnboardingProjetComponent } from '../../features/auth/pages/onboarding-projet/onboarding-projet';
import { ChoisirStructure } from '../../features/auth/choisir-structure/choisir-structure';
import { UpgradePremium } from '../../features/paiement/pages/upgrade-premium/upgrade-premium';
import { PaiementSucces } from '../../features/paiement/pages/paiement-succes/paiement-succes';
import { PaiementAnnule } from '../../features/paiement/pages/paiement-annule/paiement-annule';
import { AssistancePage } from '../../features/assistance/assistance-page';

@Component({
  selector: 'mq-lot-1',
  imports: [MqLot, MqScreen, MqPage],
  template: `
    <mq-lot [numero]="1" titre="Public, authentification & paiement"
      description="Pages réelles de l'application, hors espaces connectés.">
      <mq-screen numero="1.01" titre="Landing page" route="/"><mq-page espace="public" [composant]="c.landing" /></mq-screen>
      <mq-screen numero="1.02" titre="Connexion" route="/connexion"><mq-page espace="public" [composant]="c.connexion" /></mq-screen>
      <mq-screen numero="1.03" titre="Mot de passe oublié" route="/mot-de-passe-oublie"><mq-page espace="public" [composant]="c.motDePasse" /></mq-screen>
      <mq-screen numero="1.04" titre="Inscription d'un incubateur" route="/inscription/incubateur"><mq-page espace="public" [composant]="c.inscription" /></mq-screen>
      <mq-screen numero="1.05" titre="Acceptation d'invitation" route="/auth/accept-invitation"><mq-page espace="public" [composant]="c.invitation" /></mq-screen>
      <mq-screen numero="1.06" titre="Onboarding projet" route="/onboarding/projet"><mq-page espace="public" [composant]="c.onboarding" /></mq-screen>
      <mq-screen numero="1.07" titre="Choix de l'espace" route="/choisir-structure"><mq-page espace="public" [composant]="c.choisir" /></mq-screen>
      <mq-screen numero="1.08" titre="Offres Premium" route="/upgrade"><mq-page espace="public" [composant]="c.upgrade" /></mq-screen>
      <mq-screen numero="1.09" titre="Retour de paiement" route="/paiement/succes"><mq-page espace="public" [composant]="c.succes" /></mq-screen>
      <mq-screen numero="1.10" titre="Paiement annulé" route="/paiement/annule"><mq-page espace="public" [composant]="c.annule" /></mq-screen>
      <mq-screen numero="1.11" titre="Assistance" route="/assistance"><mq-page espace="public" [composant]="c.assistance" /></mq-screen>
    </mq-lot>
  `,
})
export class Lot1Public {
  protected readonly c = {
    landing: LandingPage, connexion: Connexion, motDePasse: ForgotPasswordComponent, inscription: InscriptionStructure,
    invitation: AcceptInvitationComponent, onboarding: OnboardingProjetComponent, choisir: ChoisirStructure,
    upgrade: UpgradePremium, succes: PaiementSucces, annule: PaiementAnnule, assistance: AssistancePage,
  };
}
