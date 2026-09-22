import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
export type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'app-button',
  standalone: true,
  template: `
    <button
      [type]="type()"
      [disabled]="disabled()"
      [class]="classes()"
    >
      <ng-content></ng-content>
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  size = input<ButtonSize>('md');
  disabled = input(false);
  type = input<ButtonType>('button');
  fullWidth = input(false);
  fullWidthMobile = input(false);

  protected classes = computed(() => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-[var(--radius-button)] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

    const width = this.fullWidth() ? ' w-full' : '';
    const widthMobile = this.fullWidthMobile() ? ' sm:w-auto w-full' : '';

    const sizes: Record<ButtonSize, string> = {
      xs: 'px-3 py-1.5 text-xs',
      sm: 'px-3.5 py-2 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-sm',
    };

    const variants: Record<ButtonVariant, string> = {
      primary: 'bg-accent text-white hover:bg-accent-strong shadow-sm',
      secondary: 'bg-surface text-ink border border-line hover:bg-surface-muted shadow-xs',
      ghost: 'bg-surface-muted text-ink hover:bg-line',
    };

    return `${base} ${sizes[this.size()]} ${variants[this.variant()]}${width}${widthMobile}`;
  });
}