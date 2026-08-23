import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  template: `
    <div class="flex flex-col items-center justify-center gap-3 rounded-[var(--radius-token-md)] border border-neutral-200 bg-white px-6 py-10 text-center">
      <span class="animate-pulse text-3xl">⏳</span>
      <p class="text-base font-semibold text-neutral-900">{{ title() }}</p>
      <p class="max-w-sm text-sm text-neutral-700">{{ description() }}</p>
      <div class="mt-2 flex w-full max-w-xs flex-col gap-2">
        @for (bar of skeletonBars(); track $index) {
          <div class="h-2.5 rounded-full bg-neutral-100" [style.width.%]="bar"></div>
        }
      </div>
    </div>
  `,
})
export class LoadingState {
  title = input('Chargement en cours…');
  description = input('Nous récupérons tes données. Cela ne prend généralement que quelques secondes.');
  skeletonBars = input<number[]>([100, 80, 60]);
}