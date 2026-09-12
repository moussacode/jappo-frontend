import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from './../../environments/environment';
import { AuthResponse, AuthService, RegisterRequest } from './auth.service';


@Injectable({ providedIn: 'root' })
export class InscriptionIncubateurService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly structureApiUrl = `${environment.apiUrl}/structures`;

  /**
   * Envoi des informations d'inscription -> POST /api/auth/register
   */
  registerAccount(data: RegisterRequest): Observable<AuthResponse> {
    return this.authService.register(data);
  }

  /**
   * Alias pour les composants qui appellent sendOtp -> POST /api/auth/register
   */
  sendOtp(email: string): Observable<string> {
    return this.authService.resendVerificationCode();
  }

  /**
   * Renvoi du code -> POST /api/auth/resend-verification-code
   */
  resendOtp(): Observable<string> {
    return this.authService.resendVerificationCode();
  }

  /**
   * Vérification du code OTP -> POST /api/auth/verify-email
   */
  verifyOtp(code: string): Observable<string> {
    return this.authService.verifyEmail(code);
  }

  /**
   * Finalisation de l'inscription
   */
  completeRegistration(structureData: any): Observable<any> {
    return this.http.post<any>(this.structureApiUrl, structureData);
  }
}