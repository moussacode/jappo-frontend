import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError, catchError } from 'rxjs';
import { TokenStorageService } from '../services/token-storage.service';
import { StructureContextService } from '../services/structure-context.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const structureContext = inject(StructureContextService);
  const router = inject(Router);

  // Endpoints publics (ni token ni X-Structure-Id)
  const publicEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/invitation-info',
    '/api/auth/accepter-invitation',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  
    '/api/auth/google',
  ];
  const isPublic = publicEndpoints.some(e => req.url.includes(e));
  if (isPublic) return next(req);

  // Ne pas envoyer JWT ni X-Structure-Id à des URL hors apiUrl
  const isApiUrl = req.url.startsWith(environment.apiUrl) || req.url.startsWith(environment.serverUrl);
  if (!isApiUrl) return next(req);

  const token = tokenStorage.getToken();
  const activeMembership = structureContext.activeMembership();
  const activeStructureId =
    activeMembership?.structure?.id ??
    localStorage.getItem('jappo_active_structure_id');

  const headersToSet: Record<string, string> = {};
  if (token) headersToSet['Authorization'] = `Bearer ${token}`;
  const isSuperAdminEndpoint = req.url.includes('/api/super-admin/');

if (
  activeStructureId &&
  !req.url.includes('/api/auth/') &&
  !isSuperAdminEndpoint
) {
  headersToSet['X-Structure-Id'] = activeStructureId;
}

  const cloned = Object.keys(headersToSet).length > 0
    ? req.clone({ setHeaders: headersToSet })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401) {
        tokenStorage.removeToken();
        structureContext.clear();
        router.navigate(['/connexion']);
      }
      return throwError(() => err);
    }),
  );
};
