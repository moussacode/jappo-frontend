import { Component, computed, input } from '@angular/core';

export type IconName =
  | 'dashboard'
  | 'route'
  | 'missions'
  | 'documents'
  | 'ai'
  | 'profile'
  | 'search'
  | 'bell'
  | 'menu'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'logout'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'arrow-left'
  | 'calendar'
  | 'clock'
  | 'document-text'
  | 'chart'
  | 'users'
  | 'briefcase'
  | 'sparkles'
  | 'sidebar-left'
  | 'arrow-right'
  | 'File-Text-Add'
  | 'File-Text'
  | 'cohortes'
  | 'entrepreneurs'
  | 'settings'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'bar-chart'
  | 'link'
  | 'x';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;

@Component({
  selector: 'app-icon',
  standalone: true,
  templateUrl: './icon.html',
  host: {
    '[class]': 'hostClasses()',
  },
})
export class Icon {
  name = input.required<IconName>();
  
  /**
   * Taille optionnelle : prédéfinie ('xs', 'sm', 'md', 'lg', 'xl')
   * ou classe Tailwind personnalisée ('size-3.5', 'w-6 h-6')
   */
  size = input<IconSize>();

  private readonly predefinedSizes: Record<string, string> = {
    xs: 'size-3',   // 12px
    sm: 'size-4',   // 16px
    md: 'size-5',   // 20px
    lg: 'size-6',   // 24px
    xl: 'size-8',   // 32px
  };

  protected hostClasses = computed(() => {
    const base = 'inline-flex items-center justify-center shrink-0 fill-current text-current';
    const customSize = this.size();

    if (!customSize) {
      return base;
    }

    const sizeClass = this.predefinedSizes[customSize] ?? customSize;
    return `${base} ${sizeClass}`;
  });
}