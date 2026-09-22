import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TokenStorageService } from '../services/token-storage.service';

/**
 * Guard qui empêche les utilisateurs connectés d'accéder aux pages publiques (login, register).
 * Redirige selon le rôle de l'utilisateur.
 */
export const publicGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const tokenStorage = inject(TokenStorageService);
  const router = inject(Router);

  // 1. Vérifier si l'utilisateur est authentifié
  const token = tokenStorage.getToken();
  if (!token || token === 'undefined' || token === 'null') {
    // Non authentifié → autoriser l'accès à la page publique
    return true;
  }

  // 2. Si authentifié, rediriger selon le rôle
  if (!authService.authReady()) {
    // Si la session n'est pas encore chargée, laisser passer
    // L'authGuard se chargera de la redirection
    return true;
  }

  const memberships = authService.memberships();

  if (memberships.length === 0) {
    // Aucune structure → rediriger vers choisir structure
    return router.createUrlTree(['/choisir-structure']);
  }

  // Déterminer le rôle principal
  const hasAdminOrCoach = memberships.some(m =>
    m.role === 'ADMIN_STRUCTURE' || m.role === 'COACH'
  );

  if (hasAdminOrCoach) {
    // Incubateur → rediriger vers dashboard incubateur
    return router.createUrlTree(['/incubateur/dashboard']);
  } else {
    // Entrepreneur → rediriger vers dashboard entrepreneur
    return router.createUrlTree(['/entrepreneur/dashboard']);
  }
};
