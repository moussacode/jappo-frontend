import { Component, input } from '@angular/core';

@Component({
  selector: 'app-form-field',
  standalone: true,
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label [for]="inputId()" class="text-xs font-semibold text-ink">
          {{ label() }}
          @if (required()) { <span class="text-rose-500">*</span> }
        </label>
      }
      <ng-content />
      @if (error()) {
        <span class="text-[11px] font-medium text-rose-600 animate-in fade-in duration-150">
          {{ error() }}
        </span>
      } @else if (hint()) {
        <span class="text-[11px] text-ink-muted">{{ hint() }}</span>
      }
    </div>
  `
})
export class FormFieldComponent {
  label = input<string>();
  inputId = input<string>();
  error = input<string>();
  hint = input<string>();
  required = input<boolean>(false);
}