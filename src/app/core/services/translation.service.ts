import { Injectable, signal, computed } from '@angular/core';

import FR from '../i18n/fr.json';
import EN from '../i18n/en.json';

export type Locale = 'fr' | 'en';

const DICTIONARIES: Record<
  Locale,
  Record<string, string>
> = {
  fr: FR,
  en: EN,
};

@Injectable({ providedIn: 'root' })
export class TranslationService {

  readonly locale = signal<Locale>(
    this.getInitialLocale()
  );

  private readonly dictionnaire = computed(
    () => DICTIONARIES[this.locale()]
  );

t(
  cle: string,
  params?: Record<string, string | number>
): string {
  let texte = this.dictionnaire()[cle] ?? cle;

  if (!params) {
    return texte;
  }

  for (const [key, value] of Object.entries(params)) {
    texte = texte.replace(
      new RegExp(`{{\\s*${key}\\s*}}`, 'g'),
      String(value)
    );
  }

  return texte;
}

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    localStorage.setItem('jappo-locale', locale);
  }

  private getInitialLocale(): Locale {
    const savedLocale = localStorage.getItem('jappo-locale');

    return savedLocale === 'en' ? 'en' : 'fr';
  }
}