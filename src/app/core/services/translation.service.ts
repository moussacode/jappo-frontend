import { Injectable, signal, computed } from '@angular/core';
import { FR } from '../i18n/fr';
import { EN } from '../i18n/en';

export type Locale = 'fr' | 'en';

const DICTIONARIES: Record<Locale, Record<string, string>> = { fr: FR, en: EN };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  readonly locale = signal<Locale>((localStorage.getItem('jappo-locale') as Locale) ?? 'fr');
  private readonly dictionnaire = computed(() => DICTIONARIES[this.locale()]);

  t(cle: string): string {
    return this.dictionnaire()[cle] ?? cle;
  }

  setLocale(locale: Locale): void {
    this.locale.set(locale);
    localStorage.setItem('jappo-locale', locale);
  }
}