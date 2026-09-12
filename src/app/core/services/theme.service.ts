import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>((localStorage.getItem('jappo-theme') as Theme) ?? 'light');

  constructor() {
    effect(() => {
      const value = this.theme();
      document.documentElement.classList.toggle('dark', value === 'dark');
      localStorage.setItem('jappo-theme', value);
    });
  }

  toggle(): void {
    this.theme.update((t) => (t === 'light' ? 'dark' : 'light'));
  }
}