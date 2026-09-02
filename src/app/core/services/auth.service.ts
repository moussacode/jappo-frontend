import { Injectable, signal, computed, inject } from '@angular/core';
import { Observable, of, delay, tap, throwError, switchMap } from 'rxjs';
import { Entrepreneur } from '../models/entrepreneur.model';
import { MOCK_ENTREPRENEURS } from '../mocks/utilisateurs.mock';
import { ProjetService } from './projet.service';

interface Credentials {
  email: string;
  motDePasse: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly projetService = inject(ProjetService);

  private readonly _currentUser = signal<Entrepreneur | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  login(credentials: Credentials): Observable<Entrepreneur> {
    const user = MOCK_ENTREPRENEURS.find((u) => u.email === credentials.email);
    if (!user) {
      return throwError(() => new Error('Identifiants invalides'));
    }
    return of(user).pipe(
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
      // Un projet par défaut est créé automatiquement — l'entrepreneur n'a
      // rien à choisir à l'inscription, conformément à la décision MVP.
      switchMap((u) => this.projetService.creerProjetParDefaut(u.id, 'Mon projet').pipe(switchMap(() => of(u)))),
    );
  }

  logout(): void {
    this._currentUser.set(null);
  }
}