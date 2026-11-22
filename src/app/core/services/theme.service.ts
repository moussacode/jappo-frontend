import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme =
  | 'light'
  | 'dark'
  | 'system'
  | 'ocean'
  | 'forest'
   | 'glass';

@Injectable({ providedIn: 'root' })
export class ThemeService {

  readonly theme = signal<Theme>(
    this.getInitialTheme()
  );

  private readonly systemIsDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  readonly appliedTheme = computed(() => {
    const theme = this.theme();

    if (theme === 'system') {
      return this.systemIsDark() ? 'dark' : 'light';
    }

    return theme;
  });

  constructor() {
    const mediaQuery = window.matchMedia(
      '(prefers-color-scheme: dark)'
    );

    mediaQuery.addEventListener('change', (event) => {
      this.systemIsDark.set(event.matches);
    });

    effect(() => {
      const theme = this.theme();
      const appliedTheme = this.appliedTheme();

      // Pour Tailwind dark:
      document.documentElement.classList.toggle(
        'dark',
        appliedTheme === 'dark'
      );

      // Pour nos thèmes personnalisés:
      document.documentElement.setAttribute(
        'data-theme',
        theme
      );
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    localStorage.setItem('jappo-theme', theme);
  }

  toggle(): void {
    this.setTheme(
      this.appliedTheme() === 'light'
        ? 'dark'
        : 'light'
    );
  }

  private getInitialTheme(): Theme {
    const savedTheme = localStorage.getItem('jappo-theme');

    if (
      savedTheme === 'light' ||
      savedTheme === 'dark' ||
      savedTheme === 'system' ||
      savedTheme === 'ocean' ||
      savedTheme === 'forest'||
  savedTheme === 'glass'
    ) {
      return savedTheme;
    }

    return 'system';
  }
}