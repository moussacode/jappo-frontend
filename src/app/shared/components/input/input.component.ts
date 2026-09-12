import { Component, input, forwardRef, signal, computed } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type InputType = 
  | 'text' 
  | 'email' 
  | 'password' 
  | 'number' 
  | 'tel' 
  | 'date' 
  | 'time' 
  | 'datetime-local' 
  | 'search' 
  | 'url';

@Component({
  selector: 'app-input',
  standalone: true,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true
    }
  ],
  template: `
    <input
      [id]="id()"
      [type]="type()"
      [placeholder]="placeholder()"
      [value]="value()"
      [disabled]="disabled()"
      (input)="onInput($event)"
      (blur)="onTouched()"
      [class]="classes()"
    />
  `
})
export class InputComponent implements ControlValueAccessor {
  id = input<string>();
  type = input<InputType>('text');
  placeholder = input<string>('');
  
  // Contrôle d'état d'erreur visuel
  invalid = input<boolean>(false);

  value = signal<string>('');
  disabled = signal<boolean>(false);

  onChange = (_value: string) => {};
  onTouched = () => {};

  protected classes = computed(() => {
    const base = 'w-full rounded-xl border bg-surface px-3.5 py-2.5 text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none transition-colors';
    const border = this.invalid() 
      ? 'border-rose-500 focus:border-rose-600' 
      : 'border-line focus:border-accent';
    const state = this.disabled() ? 'opacity-50 cursor-not-allowed bg-surface-muted/50' : '';

    return `${base} ${border} ${state}`;
  });

  onInput(event: Event): void {
    const val = (event.target as HTMLInputElement).value;
    this.value.set(val);
    this.onChange(val);
  }

  writeValue(val: string): void {
    this.value.set(val || '');
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}