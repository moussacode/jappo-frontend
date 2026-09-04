import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  disabled = input(false);
  type = input<ButtonType>('button');
  fullWidth = input(false);

  protected classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const width = this.fullWidth() ? ' w-full' : '';
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent text-white hover:bg-accent-strong',
      secondary: 'bg-surface text-ink border border-line hover:bg-surface-muted',
      ghost: 'bg-surface-muted text-ink hover:bg-line',
    };
    return `${base}${width} ${variants[this.variant()]}`;
  });
}