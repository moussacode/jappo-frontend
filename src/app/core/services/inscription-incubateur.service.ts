import { Injectable, inject } from '@angular/core';
import { Observable, of, delay, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { MembreEquipe } from '../models/membre-equipe.model';
import { Structure, TypeStructure } from '../models/structure.model';
import { SessionOtp } from '../mocks/otp.mock';

interface CompteTemporaire {
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  motDePasse: string;
}

const OTP_DUREE_MS = 10 * 60 * 1000;
const OTP_MAX_TENTATIVES = 5;

@Injectable({ providedIn: 'root' })
export class InscriptionIncubateurService {
  private readonly authService = inject(AuthService);

  private compteTemporaire: CompteTemporaire | null = null;
  private session: SessionOtp | null = null;

  registerAccount(data: CompteTemporaire): Observable<void> {
    // Ne crée rien en base — garde juste les infos en mémoire le temps de l'OTP.
    this.compteTemporaire = data;
    return this.sendOtp(data.email);
  }

  sendOtp(email: string): Observable<void> {
    // TODO backend réel : this.http.post('/api/auth/otp/envoyer', { email })
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    this.session = { email, code, expiresAt: Date.now() + OTP_DUREE_MS, tentatives: 0 };
    console.log(`[MOCK OTP] Code envoyé à ${email} : ${code}`); // à retirer une fois le vrai envoi d'email branché
    return of(void 0).pipe(delay(400));
  }

  verifyOtp(code: string): Observable<void> {
    // TODO backend réel : this.http.post('/api/auth/otp/verifier', { email, code })
    if (!this.session) return throwError(() => new Error('code_expire'));
    if (Date.now() > this.session.expiresAt) return throwError(() => new Error('code_expire'));
    if (this.session.tentatives >= OTP_MAX_TENTATIVES) return throwError(() => new Error('trop_de_tentatives'));

    if (this.session.code !== code) {
      this.session.tentatives++;
      return throwError(() => new Error('code_incorrect'));
    }
    return of(void 0).pipe(delay(300));
  }

  completeRegistration(structureData: {
    nom: string;
    type: TypeStructure;
    pays: string;
    ville: string;
    description?: string;
    logo?: string | null;
  }): Observable<{ utilisateur: MembreEquipe; structure: Structure }> {
    if (!this.compteTemporaire) return throwError(() => new Error('compte_manquant'));

    const structure: Structure = {
      id: crypto.randomUUID(),
      nom: structureData.nom,
      emailContact: this.compteTemporaire.email,
      telephone: this.compteTemporaire.telephone,
      type: structureData.type,
      pays: structureData.pays,
      ville: structureData.ville,
      description: structureData.description,
      logo: structureData.logo ?? null,
      statut: 'active',
      forfait: 'starter',
      dateInscription: new Date().toISOString(),
      abonnementId: null,
    };

    const utilisateur: MembreEquipe = {
      id: crypto.randomUUID(),
      prenom: this.compteTemporaire.prenom,
      nom: `${this.compteTemporaire.prenom} ${this.compteTemporaire.nom}`,
      email: this.compteTemporaire.email,
      telephone: this.compteTemporaire.telephone,
      typeUtilisateur: 'membre_equipe',
      role: 'admin_structure',
      structureId: structure.id,
      emailVerified: true,
      dateCreation: new Date().toISOString(),
    };

    // TODO backend réel : this.http.post('/api/structures/inscription', { utilisateur, structure })
    return of({ utilisateur, structure }).pipe(
      delay(500),
      // Connexion automatique — voir spec "création → connexion automatique"
      (obs) => {
        obs.subscribe(({ utilisateur: u }) => this.authService.setSession(u));
        return obs;
      },
    );
  }
}