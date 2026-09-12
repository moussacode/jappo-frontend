import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { StructureContextService } from './core/services/structure-context.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('jappo-frontend');
  private readonly authService = inject(AuthService);
  private readonly structureContext = inject(StructureContextService);

  constructor() {
    // 1. Restaure la session utilisateur à partir du token JWT
    this.authService.restoreSession().subscribe();

    // 2. Restaure la structure active enregistrée dans le localStorage
    this.structureContext.restore();
  }
}