import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  // 1. Si déjà authentifié en mémoire dans le signal
  if (authService.isAuthenticated()) {
    return true;
  }

  // 2. Cas du F5 : Vérification physique immédiate du token dans localStorage
  const token = tokenStorage.getToken();
  if (token && token !== 'undefined' && token !== 'null') {
    return true;
  }

  // 3. Si aucun token n'existe réellement, rediriger vers la connexion
  return router.createUrlTree(['/connexion']);
};