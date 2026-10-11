import { Component, input, output } from '@angular/core';

import { TemplateField } from '../../../core/models/parcours.model';
import { TranslatePipe } from '../../pipes/translate.pipe';

export const BMC_DEFAULT_FIELDS: TemplateField[] = [
  { id: 'keyPartners', label: 'Partenaires clés' },
  { id: 'keyActivities', label: 'Activités clés' },
  { id: 'keyResources', label: 'Ressources clés' },
  { id: 'valuePropositions', label: 'Propositions de valeur' },
  { id: 'customerRelationships', label: 'Relations clients' },
  { id: 'channels', label: 'Canaux' },
  { id: 'customerSegments', label: 'Segments de clientèle' },
  { id: 'costStructure', label: 'Structure des coûts' },
  { id: 'revenueStreams', label: 'Sources de revenus' },
];

interface BmcSection {
  id: string;
  labelKey: string;
  icon: string;
}

const BMC_SECTIONS: BmcSection[] = [
  { id: 'keyPartners', labelKey: 'bmc.section.keyPartners', icon: '01' },
  { id: 'keyActivities', labelKey: 'bmc.section.keyActivities', icon: '02' },
  { id: 'keyResources', labelKey: 'bmc.section.keyResources', icon: '03' },
  { id: 'valuePropositions', labelKey: 'bmc.section.valuePropositions', icon: '04' },
  { id: 'customerRelationships', labelKey: 'bmc.section.customerRelationships', icon: '05' },
  { id: 'channels', labelKey: 'bmc.section.channels', icon: '06' },
  { id: 'customerSegments', labelKey: 'bmc.section.customerSegments', icon: '07' },
  { id: 'costStructure', labelKey: 'bmc.section.costStructure', icon: '08' },
  { id: 'revenueStreams', labelKey: 'bmc.section.revenueStreams', icon: '09' },
];

const BMC_GRID_POSITION: Record<string, string> = {
  keyPartners: 'md:col-start-1 md:row-span-2',
  keyActivities: 'md:col-start-2 md:row-start-1',
  keyResources: 'md:col-start-2 md:row-start-2',
  valuePropositions: 'md:col-start-3 md:row-span-2',
  customerRelationships: 'md:col-start-4 md:row-start-1',
  channels: 'md:col-start-4 md:row-start-2',
  customerSegments: 'md:col-start-5 md:row-span-2',
  costStructure: 'md:col-span-2',
  revenueStreams: 'md:col-span-3',
};

@Component({
  selector: 'app-bmc-canvas',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <section
      class="overflow-hidden rounded-2xl border border-line bg-surface shadow-xs"
      [attr.aria-label]="'bmc.title' | translate"
    >
      <header class="flex flex-col gap-1 border-b border-line bg-accent-soft/30 px-4 py-3 sm:px-5">
        <h3 class="text-sm font-bold text-ink">{{ 'bmc.title' | translate }}</h3>
        <p class="text-[11px] leading-relaxed text-ink-muted">
          {{ editable() ? ('bmc.editHint' | translate) : ('bmc.readHint' | translate) }}
        </p>
      </header>

      <div class="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 md:grid-cols-5 md:grid-rows-[minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(7rem,auto)]">
        @for (section of mainSections; track section.id) {
          <article
            class="flex min-h-36 min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface-muted/30"
            [class]="gridPosition(section.id)"
          >
            <h4 class="flex items-start gap-2 border-b border-line/70 px-3 py-2.5 text-[11px] font-bold leading-snug text-ink">
              <span class="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[9px] font-extrabold text-accent">
                {{ section.icon }}
              </span>
              <span>{{ section.labelKey | translate }}</span>
            </h4>
            @if (fieldFor(section.id); as field) {
              @if (editable()) {
                <textarea
                  class="min-h-28 flex-1 resize-y border-0 bg-transparent px-3 py-2.5 text-xs leading-relaxed text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/40"
                  [attr.aria-label]="section.labelKey | translate"
                  [placeholder]="'bmc.answerPlaceholder' | translate"
                  [value]="values()[field.id] ?? ''"
                  maxlength="10000"
                  (input)="emitValue(field.id, $event)"
                ></textarea>
              } @else {
                <p class="min-h-20 flex-1 whitespace-pre-wrap break-words px-3 py-2.5 text-xs leading-relaxed text-ink">
                  {{ values()[field.id] || ('bmc.emptyAnswer' | translate) }}
                </p>
              }
            } @else {
              <p class="min-h-20 flex-1 px-3 py-2.5 text-xs italic text-ink-muted">
                {{ 'bmc.notConfigured' | translate }}
              </p>
            }
          </article>
        }

        @for (section of financialSections; track section.id) {
          <article class="flex min-h-28 min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-surface-muted/30" [class]="gridPosition(section.id)">
            <h4 class="flex items-center gap-2 border-b border-line/70 px-3 py-2.5 text-[11px] font-bold text-ink">
              <span class="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-accent-soft text-[9px] font-extrabold text-accent">
                {{ section.icon }}
              </span>
              <span>{{ section.labelKey | translate }}</span>
            </h4>
            @if (fieldFor(section.id); as field) {
              @if (editable()) {
                <textarea
                  class="min-h-20 flex-1 resize-y border-0 bg-transparent px-3 py-2.5 text-xs leading-relaxed text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/40"
                  [attr.aria-label]="section.labelKey | translate"
                  [placeholder]="'bmc.answerPlaceholder' | translate"
                  [value]="values()[field.id] ?? ''"
                  maxlength="10000"
                  (input)="emitValue(field.id, $event)"
                ></textarea>
              } @else {
                <p class="min-h-16 flex-1 whitespace-pre-wrap break-words px-3 py-2.5 text-xs leading-relaxed text-ink">
                  {{ values()[field.id] || ('bmc.emptyAnswer' | translate) }}
                </p>
              }
            } @else {
              <p class="min-h-16 flex-1 px-3 py-2.5 text-xs italic text-ink-muted">
                {{ 'bmc.notConfigured' | translate }}
              </p>
            }
          </article>
        }
      </div>

      @if (additionalFields().length > 0) {
        <div class="border-t border-line px-3 py-4 sm:px-4">
          <h4 class="mb-2 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
            {{ 'bmc.additionalSections' | translate }}
          </h4>
          <div class="grid gap-2 sm:grid-cols-2">
            @for (field of additionalFields(); track field.id) {
              <article class="overflow-hidden rounded-xl border border-line bg-surface-muted/30">
                <h5 class="border-b border-line/70 px-3 py-2 text-[11px] font-bold text-ink">{{ field.label }}</h5>
                @if (editable()) {
                  <textarea
                    class="min-h-20 w-full resize-y border-0 bg-transparent px-3 py-2.5 text-xs leading-relaxed text-ink placeholder:text-ink-muted/70 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/40"
                    [attr.aria-label]="field.label"
                    [placeholder]="'bmc.answerPlaceholder' | translate"
                    [value]="values()[field.id] ?? ''"
                    maxlength="10000"
                    (input)="emitValue(field.id, $event)"
                  ></textarea>
                } @else {
                  <p class="min-h-16 whitespace-pre-wrap break-words px-3 py-2.5 text-xs leading-relaxed text-ink">
                    {{ values()[field.id] || ('bmc.emptyAnswer' | translate) }}
                  </p>
                }
              </article>
            }
          </div>
        </div>
      }
    </section>
  `,
})
export class BmcCanvasComponent {
  readonly fields = input<TemplateField[]>(BMC_DEFAULT_FIELDS);
  readonly values = input<Record<string, string>>({});
  readonly editable = input(false);
  readonly valueChange = output<{ fieldId: string; value: string }>();

  protected readonly mainSections = BMC_SECTIONS.slice(0, 7);
  protected readonly financialSections = BMC_SECTIONS.slice(7);

  protected gridPosition(sectionId: string): string {
    return BMC_GRID_POSITION[sectionId] ?? '';
  }

  protected fieldFor(sectionId: string): TemplateField | undefined {
    const expectedIds = [sectionId, ...this.aliases(sectionId)];
    const byId = this.fields().find((field) => expectedIds.includes(field.id));
    if (byId) return byId;

    const matchingLabels = this.labelAliases(sectionId);
    return this.fields().find((field) =>
      matchingLabels.some((label) => this.normalize(field.label).includes(label)),
    );
  }

  protected additionalFields(): TemplateField[] {
    const used = new Set(
      BMC_SECTIONS.map((section) => this.fieldFor(section.id)?.id).filter(Boolean),
    );
    return this.fields().filter((field) => !used.has(field.id));
  }

  protected emitValue(fieldId: string, event: Event): void {
    this.valueChange.emit({
      fieldId,
      value: (event.target as HTMLTextAreaElement).value,
    });
  }

  private aliases(sectionId: string): string[] {
    const legacyIds: Record<string, string[]> = {
      keyPartners: ['partners'],
      keyActivities: ['activities'],
      keyResources: ['resources'],
      valuePropositions: ['value-proposition'],
      customerRelationships: ['customer-relationships'],
      customerSegments: ['segments'],
      revenueStreams: ['revenue-streams'],
      costStructure: ['costs'],
    };
    return legacyIds[sectionId] ?? [];
  }

  private labelAliases(sectionId: string): string[] {
    const labels: Record<string, string[]> = {
      keyPartners: ['partenaires clés', 'key partners'],
      keyActivities: ['activités clés', 'key activities'],
      keyResources: ['ressources clés', 'key resources'],
      valuePropositions: ['propositions de valeur', 'value propositions'],
      customerRelationships: ['relations clients', 'customer relationships'],
      channels: ['canaux', 'channels'],
      customerSegments: ['segments de clientèle', 'customer segments'],
      costStructure: ['structure des coûts', 'cost structure'],
      revenueStreams: ['sources de revenus', 'revenue streams'],
    };
    return (labels[sectionId] ?? []).map((label) => this.normalize(label));
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  }
}
