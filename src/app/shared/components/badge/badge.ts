import { Component, ChangeDetectionStrategy, computed, input } from '@angular/core';

export type BadgeStatus = 'primary' | 'warning' | 'success' | 'danger' | 'info' | 'neutral' | 'purple' | 'pink';
export type BadgeSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge.html',
  styleUrl: './badge.css',
})
export class BadgeComponent {
  status = input<BadgeStatus>('neutral');
  size = input<BadgeSize>('md');

  protected classes = computed(() => {
    const base = 'inline-flex items-center justify-center rounded-md font-medium transition-all shrink-0 select-none';

    const sizes: Record<BadgeSize, string> = {
      sm: 'px-1.5 py-0.5 text-[11px] leading-tight',
      md: 'px-2 py-0.5 text-xs leading-normal',
      lg: 'px-2.5 py-1 text-xs leading-normal font-semibold',
    };

    // Palette pastel & sobre inspirée directement du Design System de Notion
    const variants: Record<BadgeStatus, string> = {
      neutral: 'bg-[#F1F1EF] text-[#37352F] border border-[#E3E2E0]',   // Notion Gray
      primary: 'bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC]',   // Notion Soft Blue
      success: 'bg-[#EDF3EC] text-[#2E7D32] border border-[#D3E5D0]',   // Notion Green
      warning: 'bg-[#FBF3DB] text-[#9A6B00] border border-[#F4E3B8]',   // Notion Yellow / Amber
      danger:  'bg-[#FDEBEC] text-[#C4554D] border border-[#F7C9C9]',   // Notion Red
      info:    'bg-[#E7F3F8] text-[#0C6291] border border-[#CDE5F1]',   // Notion Blue / Cyan
      purple:  'bg-[#F6F3F9] text-[#6940A5] border border-[#E8DEEE]',   // Notion Purple
      pink:    'bg-[#FAF0F5] text-[#AD1A72] border border-[#F3D3E7]',   // Notion Pink
    };

    return `${base} ${sizes[this.size()]} ${variants[this.status()] ?? variants.neutral}`;
  });
}