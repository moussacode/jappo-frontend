import {
  Injectable,
  signal,
  computed,
  inject,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { WebSocketService } from './websocket.service';
import {
  Observable,
  tap,
  catchError,
  of,
  switchMap,
  map,
  finalize,
} from 'rxjs';

import { environment } from './../../environments/environment';
import { TokenStorageService } from './token-storage.service';
import { StructureContextService } from './structure-context.service';

// --- INTERFACES & DTOs ---

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterRequest {
  prenom: string;
  nom: string;
  email: string;
  password: string;
  telephone?: string;
}

export interface AuthResponse {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  emailVerified: boolean;
  token: string;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  nouveauMotDePasse: string;
}

export interface ChangePasswordRequest {
  ancienMotDePasse: string;
  nouveauMotDePasse: string;
}

export interface Structure {
  id: string;
  nom: string;
  type: string;
  pays: string;
  description: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  siteWeb: string;
  logo: string | null;
  dateCreation: string;
}

export type RoleMembreStructure =
  | 'ADMIN_STRUCTURE'
  | 'COACH'
  | 'ENTREPRENEUR';

export interface StructureMembership {
  structure: Structure;
  role: RoleMembreStructure;
}

export interface AuthUser {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  emailVerified: boolean;
}

export interface InvitationInfoResponse {
  nomUser: string;
  email: string;
  nomStructure: string;
  logoStructure?: string;
  compteExiste: boolean; // 
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly webSocketService = inject(WebSocketService);
  private readonly http = inject(HttpClient);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly structureContext = inject(StructureContextService);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  // --- SIGNALS DE GESTION D'ÉTAT ---
  private readonly _currentUser = signal<AuthUser | null>(null);
  readonly currentUser = this._currentUser.asReadonly();

  private readonly _memberships = signal<StructureMembership[]>([]);
  readonly memberships = this._memberships.asReadonly();

  private readonly _authReady = signal(false);
  readonly authReady = this._authReady.asReadonly();

  readonly isAuthenticated = computed(
    () => this.tokenStorage.hasToken() && this._currentUser() !== null,
  );

  // --- AUTHENTIFICATION DE BASE ---

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, {
        email: credentials.email,
        password: credentials.password,
      })
      .pipe(
        tap((response) => this.handleAuthSuccess(response))
      );
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/register`, {
        prenom: request.prenom,
        nom: request.nom,
        email: request.email,
        password: request.password,
        telephone: request.telephone,
      })
      .pipe(
        tap((response) => this.handleAuthSuccess(response))
      );
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`).pipe(
      tap((user) => this._currentUser.set(user))
    );
  }

  updateProfile(prenom: string, nom: string): Observable<AuthUser> {
    return this.http
      .patch<AuthUser>(`${environment.apiUrl}/users/me`, { prenom, nom })
      .pipe(
        tap((updatedUser) => {
          const current = this._currentUser();
          if (current) {
            this._currentUser.set({
              ...current,
              prenom: updatedUser.prenom,
              nom: updatedUser.nom,
            });
          }
        })
      );
  }

  // --- VÉRIFICATION ET SÉCURITÉ EMAIL / OTP ---

  verifyEmail(code: string): Observable<string> {
    return this.http
      .post(`${this.apiUrl}/verify-email`, { code }, { responseType: 'text' })
      .pipe(
        tap(() => {
          const user = this._currentUser();
          if (user) {
            this._currentUser.set({ ...user, emailVerified: true });
          }
        })
      );
  }

  resendVerificationCode(): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/resend-verification-code`,
      {},
      { responseType: 'text' }
    );
  }

  forgotPassword(email: string): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/forgot-password`,
      { email },
      { responseType: 'text' }
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/reset-password`,
      request,
      { responseType: 'text' }
    );
  }

  changePassword(request: ChangePasswordRequest): Observable<string> {
    return this.http.post(
      `${this.apiUrl}/change-password`,
      request,
      { responseType: 'text' }
    );
  }

  // --- RESTRUCTURATION DE SESSION & INCUBATEURS ---

  getMyStructures(): Observable<StructureMembership[]> {
    return this.http
      .get<StructureMembership[]>(`${environment.apiUrl}/structures/me`)
      .pipe(
        tap((memberships) => {
          this._memberships.set(memberships);
          this.structureContext.setMemberships(memberships);
        })
      );
  }

  restoreSession(): Observable<AuthUser | null> {

  if (!this.tokenStorage.hasToken()) {
    this._authReady.set(true);
    return of(null);
  }

  return this.me().pipe(

    switchMap((user) =>
      this.getMyStructures().pipe(
        tap(() => {
          this.initializeWebSocket();
        }),
        map(() => user)
      )
    ),

    catchError((error) => {
      console.error(
        'Erreur restauration session :',
        error
      );

      this.logout();

      return of(null);
    }),

    finalize(() => {
      this._authReady.set(true);
    })
  );
}

private initializeWebSocket(): void {

  const user = this._currentUser();

  const structureId =
    this.structureContext.getActiveStructureId();

  if (!user) {
    console.warn(
      '[WebSocket] Utilisateur absent, abonnement impossible.'
    );
    return;
  }

  /**
   * Abonnement aux événements privés
   * de l'utilisateur connecté.
   */
  this.webSocketService.subscribeToUser(
    user.id
  );

  /**
   * Abonnement aux événements
   * de la structure active.
   */
  if (structureId) {

    this.webSocketService.subscribeToStructure(
      structureId
    );

  } else {

    console.warn(
      '[WebSocket] Aucune structure active.'
    );
  }

  console.log(
    '[WebSocket] Initialisé pour :',
    {
      userId: user.id,
      structureId
    }
  );
}

  logout(): void {
    this.tokenStorage.removeToken();
    this._currentUser.set(null);
    this._memberships.set([]);
    this.structureContext.clear();
  }

  getToken(): string | null {
    return this.tokenStorage.getToken();
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.tokenStorage.setToken(response.token);
    const user: AuthUser = {
      id: response.id,
      prenom: response.prenom,
      nom: response.nom,
      email: response.email,
      emailVerified: response.emailVerified,
    };
    this._currentUser.set(user);
  }

  /**
   * Récupère les détails de l'invitation à partir du token
   * GET /api/auth/invitation-info?token=...
   */
  getInvitationInfo(token: string): Observable<InvitationInfoResponse> {
    return this.http.get<InvitationInfoResponse>(
      `${this.apiUrl}/invitation-info`,
      { params: { token } }
    );
  }

  /**
   * Valide l'invitation et connecte l'utilisateur
   * POST /api/auth/accepter-invitation
   */
  accepterInvitation(token: string, nouveauMotDePasse?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/accepter-invitation`, {
        token,
        nouveauMotDePasse: nouveauMotDePasse || null,
      })
      .pipe(
        tap((response) => this.handleAuthSuccess(response)),
        switchMap((response) =>
          this.getMyStructures().pipe(map(() => response))
        )
      );
  }



  loginGoogle(idToken: string): Observable<AuthResponse> {
  return this.http
    .post<AuthResponse>(`${this.apiUrl}/google`, { idToken })
    .pipe(tap((response) => this.handleAuthSuccess(response)));
}

inscriptionGoogle(idToken: string): Observable<AuthResponse> {
  return this.http
    .post<AuthResponse>(`${this.apiUrl}/google/inscription`, { idToken })
    .pipe(tap((response) => this.handleAuthSuccess(response)));
}
}