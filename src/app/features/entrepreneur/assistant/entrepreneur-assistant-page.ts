import { Component } from '@angular/core';
import { EntrepreneurAssistantPanel } from './entrepreneur-assistant-panel';

@Component({
  selector: 'app-entrepreneur-assistant-page',
  standalone: true,
  imports: [EntrepreneurAssistantPanel],
  template: `
    <main class="h-full min-h-[32rem] p-3 sm:p-6">
      <app-entrepreneur-assistant-panel mode="page" />
    </main>
  `,
})
export class EntrepreneurAssistantPage {}
