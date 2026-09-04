import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, delay, tap, throwError, switchMap } from 'rxjs';
import { Entrepreneur } from '../models/entrepreneur.model';
import { MembreEquipe } from '../models/membre-equipe.model';
import { MOCK_ENTREPRENEURS, MOCK_MEMBRES_EQUIPE } from '../mocks/utilisateurs.mock';
import { ProjetService } from './projet.service';

type UtilisateurConnecte = Entrepreneur | MembreEquipe;

interface Credentials {
  email: string;
  motDePasse: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly projetService = inject(ProjetService);

  private readonly _currentUser = signal<UtilisateurConnecte | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  login(credentials: Credentials): Observable<UtilisateurConnecte> {
    // TODO backend réel : this.http.post<UtilisateurConnecte>('/api/auth/login', credentials)
    const utilisateur =
      MOCK_ENTREPRENEURS.find((u) => u.email === credentials.email) ??
      MOCK_MEMBRES_EQUIPE.find((u) => u.email === credentials.email);

    if (!utilisateur) {
      return throwError(() => new Error('Identifiants invalides'));
    }
    return of(utilisateur).pipe(
      delay(400),
      tap((u) => this._currentUser.set(u)),
    );
  }

  register(nom: string, email: string, motDePasse: string): Observable<Entrepreneur> {
    const newUser: Entrepreneur = {
      id: crypto.randomUUID(),
      nom,
      email,
      typeUtilisateur: 'entrepreneur',
      dateCreation: new Date().toISOString(),
      abonnementId: null,
    };

    return of(newUser).pipe(
      delay(400),
      tap((u) => this._currentUser.set(u)),
      switchMap((u) => this.projetService.creerProjetParDefaut(u.id, 'Mon projet').pipe(switchMap(() => of(u)))),
    );
  }

  logout(): void {
    this._currentUser.set(null);
  }

  /** Narrowing utilitaire — à utiliser dans les écrans Incubateur avant d'accéder à `role`/`structureId`. */
  isMembreEquipe(u: UtilisateurConnecte | null): u is MembreEquipe {
    return u?.typeUtilisateur === 'membre_equipe';
  }
}