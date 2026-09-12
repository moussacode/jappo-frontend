import { Component, input, computed } from '@angular/core';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'app-avatar',
  standalone: true,
  template: `
    <div [class]="classes()">
      @if (imageUrl()) {
        <img [src]="imageUrl()" [alt]="initials()" class="size-full rounded-[inherit] object-cover" />
      } @else {
        <span>{{ formattedInitials() }}</span>
      }
    </div>
  `
})
export class AvatarComponent {
  initials = input<string>('');
  imageUrl = input<string>();
  size = input<AvatarSize>('md');

  protected formattedInitials = computed(() => {
    return (this.initials() || 'U').substring(0, 2).toUpperCase();
  });

  protected classes = computed(() => {
    const base = 'relative flex shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 font-bold text-accent uppercase select-none overflow-hidden';
    
    const sizes: Record<AvatarSize, string> = {
      sm: 'size-8 text-[11px]',
      md: 'size-10 text-xs',
      lg: 'size-14 text-base',
      xl: 'size-20 text-xl rounded-2xl'
    };

    return `${base} ${sizes[this.size()]}`;
  });
}