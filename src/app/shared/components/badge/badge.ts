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
      neutral: 'bg-[#F1F1EF] text-[#37352F] border border-[#E3E2E0] dark:bg-white/8 dark:text-neutral-200 dark:border-white/10',   // Notion Gray
      primary: 'bg-[#E8F0FE] text-[#1A73E8] border border-[#D2E3FC] dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/20',   // Notion Soft Blue
      success: 'bg-[#EDF3EC] text-[#2E7D32] border border-[#D3E5D0] dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/20',   // Notion Green
      warning: 'bg-[#FBF3DB] text-[#9A6B00] border border-[#F4E3B8] dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-400/20',   // Notion Yellow / Amber
      danger:  'bg-[#FDEBEC] text-[#C4554D] border border-[#F7C9C9] dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-400/20',   // Notion Red
      info:    'bg-[#E7F3F8] text-[#0C6291] border border-[#CDE5F1] dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/20',   // Notion Blue / Cyan
      purple:  'bg-[#F6F3F9] text-[#6940A5] border border-[#E8DEEE] dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-400/20',   // Notion Purple
      pink:    'bg-[#FAF0F5] text-[#AD1A72] border border-[#F3D3E7] dark:bg-pink-500/15 dark:text-pink-300 dark:border-pink-400/20',   // Notion Pink
    };

    return `${base} ${sizes[this.size()]} ${variants[this.status()] ?? variants.neutral}`;
  });
}