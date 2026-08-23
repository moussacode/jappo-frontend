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
  type = input<'button' | 'submit'>('button');
  fullWidth = input(false);

  protected classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-[var(--radius-token-sm)] px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
    const width = this.fullWidth() ? ' w-full' : '';
    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-brand-500 text-white hover:bg-brand-600',
      secondary: 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50',
      ghost: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200',
    };
    return `${base}${width} ${variants[this.variant()]}`;
  });
}