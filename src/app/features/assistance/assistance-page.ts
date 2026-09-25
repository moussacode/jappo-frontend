
import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AssistanceService, SupportResponse } from '../../core/services/assistance.service';
import { ButtonComponent } from '../../shared/components/button/button.component';
import { Icon } from '../../shared/components/icon/icon';
import { CardComponent } from '../../shared/components/card/card.component';



@Component({
  selector: 'app-assistance-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, Icon, CardComponent],
  templateUrl: './assistance-page.html',
})
export class AssistancePage {
  private readonly assistanceService = inject(AssistanceService);

  protected email = '';
  protected message = '';

  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly response = signal<SupportResponse | null>(null);

  protected submit(): void {
    this.error.set(null);
    this.response.set(null);

    const email = this.email.trim();
    const message = this.message.trim();

    if (!email || !message) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }

    this.loading.set(true);

    this.assistanceService
      .sendRequest({
        email,
        message,
      })
      .subscribe({
        next: (response) => {
          this.response.set(response);
          this.loading.set(false);
          this.message = '';
        },

        error: () => {
          this.error.set(
            'Impossible d’envoyer votre demande. Veuillez réessayer.'
          );
          this.loading.set(false);
        },
      });
  }
}
