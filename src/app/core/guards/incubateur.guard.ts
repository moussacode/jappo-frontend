import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs';

export const incubateurGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const verifierAcces = (): boolean | UrlTree => {
    if (!authService.isAuthenticated()) {
      return router.createUrlTree(['/connexion']);
    }

    const memberships = authService.memberships();
    const isIncubateurUser = memberships.some(
      (m) => m.role === 'ADMIN_STRUCTURE' || m.role === 'COACH'
    );

    if (isIncubateurUser) {
      return true;
    }

    return router.createUrlTree(['/entrepreneur/dashboard']);
  };

  // Si l'utilisateur est déjà connecté en mémoire
  if (authService.isAuthenticated() || authService.authReady()) {
    return verifierAcces();
  }

  // En cas de rafraîchissement F5
  return authService.restoreSession().pipe(
    map(() => verifierAcces())
  );
};