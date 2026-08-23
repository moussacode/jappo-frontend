import { Injectable, signal, computed } from '@angular/core';
import { Observable, of, delay, tap, throwError } from 'rxjs';
import { Entrepreneur } from '../models/entrepreneur.model';
import { MOCK_ENTREPRENEURS } from '../mocks/utilisateurs.mock';

interface Credentials {
  email: string;
  motDePasse: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<Entrepreneur | null>(null);
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => this._currentUser() !== null);

  login(credentials: Credentials): Observable<Entrepreneur> {
    // TODO backend réel : this.http.post<Entrepreneur>('/api/auth/login', credentials)
    const user = MOCK_ENTREPRENEURS.find((u) => u.email === credentials.email);
    if (!user) {
      return throwError(() => new Error('Identifiants invalides'));
    }
    return of(user).pipe(
      delay(400), // simule la latence réseau
      tap((u) => this._currentUser.set(u)),
    );
  }

  register(nom: string, email: string, motDePasse: string): Observable<Entrepreneur> {
    // TODO backend réel : this.http.post<Entrepreneur>('/api/auth/inscription', { nom, email, motDePasse })
    const newUser: Entrepreneur = {
      id: crypto.randomUUID(),
      nom,
      email,
      typeUtilisateur: 'entrepreneur',
      dateCreation: new Date().toISOString(),
      scoreMaturite: 0,
      etapeActuelle: 'ideation',
      cohorteId: null,
      abonnementId: null,
    };
    return of(newUser).pipe(
      delay(400),
      tap((u) => this._currentUser.set(u)),
    );
  }

  logout(): void {
    this._currentUser.set(null);
  }
}