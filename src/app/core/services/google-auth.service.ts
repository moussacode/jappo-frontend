import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

declare const google: any;

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  constructor(private readonly ngZone: NgZone) {}

  /**
   * Affiche le bouton officiel Google dans l'élément DOM fourni.
   * Émet l'idToken Google à chaque connexion réussie.
   */
  afficherBouton(element: HTMLElement): Observable<string> {
    return new Observable<string>((subscriber) => {
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: { credential: string }) => {
          this.ngZone.run(() => subscriber.next(response.credential));
        },
      });

      google.accounts.id.renderButton(element, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'continue_with',
        locale: 'fr',
      });
    });
  }
}