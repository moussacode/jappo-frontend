import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TokenStorageService } from '../services/token-storage.service';
import { StructureContextService } from '../services/structure-context.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorageService);
  const structureContext = inject(StructureContextService);

  const token = tokenStorage.getToken();

  // 1. Liste STRICTE des endpoints publics qui ne doivent recevoir NI token NI X-Structure-Id
  const publicAuthEndpoints = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/invitation-info',
    '/api/auth/accepter-invitation',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
  ];

  const isStrictlyPublic = publicAuthEndpoints.some((endpoint) =>
    req.url.endsWith(endpoint) || req.url.includes(`${endpoint}?`)
  );

  // Si c'est une route strictement publique, laisser passer sans toucher aux headers
  if (isStrictlyPublic) {
    return next(req);
  }

  // 2. Récupération dynamique du Tenant (Active Structure)
  const activeMembership = structureContext.activeMembership();
  const activeStructureId =
    activeMembership?.structure?.id ||
    localStorage.getItem('jappo_active_structure_id');

  // 3. Construction des en-têtes
  const headersToSet: Record<string, string> = {};

  // Injecter le token Bearer pour TOUTES les routes (y compris /api/auth/me)
  if (token) {
    headersToSet['Authorization'] = `Bearer ${token}`;
  }

  console.log(activeStructureId)

  // Injecter le Tenant ID sauf si la route est sous /api/auth/
  if (activeStructureId && !req.url.includes('/api/auth/')) {
    headersToSet['X-Structure-Id'] = activeStructureId;
    console.log('ffgg'+ headersToSet['X-Structure-Id'])
  }

  // 4. Cloner la requête si des en-têtes doivent être ajoutés
  if (Object.keys(headersToSet).length > 0) {
    console.log(headersToSet)
    return next(req.clone({ setHeaders: headersToSet }));
  }


  return next(req);
};