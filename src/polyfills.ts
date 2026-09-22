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
 * Polyfill pour 'process' (si nécessaire)
 *
 * Certaines librairies peuvent utiliser 'process.env'.
 */
(window as any).process = {
  env: {
    NODE_ENV: 'development'
  }
};

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
