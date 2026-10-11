/**
 * Polyfills pour JAPPO
 *
 * Ce fichier contient les polyfills nécessaires pour les librairies qui
 * utilisent des API Node.js dans le navigateur.
 *
 * IMPORTANT : Ce fichier est chargé AVANT tous les autres modules.
 */

/**
 * Polyfill pour 'global' utilisé par sockjs-client
 *
 * sockjs-client est une librairie CommonJS qui utilise 'global' au lieu de 'window'.
 * Dans le navigateur, 'global' n'existe pas, donc nous devons le définir.
 */
(window as any).global = window;

/**
 * Polyfill minimal pour 'process' lorsque le navigateur ne le fournit pas.
 * Préserve l'objet Node des tests, notamment process.stderr utilisé par debug.
 */
const processLike = (globalThis as any).process ?? (window as any).process ?? {
  env: {},
  stderr: { fd: 2 },
  stdout: { fd: 1 },
};
processLike.env ??= {};
processLike.env.NODE_ENV ??= 'development';
(window as any).process = processLike;

/**
 * Polyfill pour 'Buffer' (si nécessaire)
 *
 * Certaines librairies peuvent nécessiter Buffer.
 */
if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = {
    from: function (data: any) {
      return new Uint8Array(data);
    }
  };
}
