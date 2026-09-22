import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from '../../core/services/translation.service';

@Pipe({ name: 'translate', pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly translation = inject(TranslationService);
  transform(cle: string): string {
    return this.translation.t(cle);
  }
}