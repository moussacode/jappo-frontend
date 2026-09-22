import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(
    (localStorage.getItem('jappo-theme') as Theme) ?? 'system'
  );

  private readonly systemIsDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  /** Le thème réellement appliqué (résout 'system' en light/dark) Avoir*/
  readonly appliedTheme = computed(() =>
    this.theme() === 'system'
      ? this.systemIsDark() ? 'dark' : 'light'
      : this.theme()
  );

  constructor() {
    // Réagit si l'utilisateur change le thème de son OS pendant que l'app est ouverte
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => this.systemIsDark.set(e.matches));

    effect(() => {
      document.documentElement.classList.toggle('dark', this.appliedTheme() === 'dark');
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem('jappo-theme', theme);
  }

  toggle(): void {
    this.setTheme(this.appliedTheme() === 'light' ? 'dark' : 'light');
  }
}