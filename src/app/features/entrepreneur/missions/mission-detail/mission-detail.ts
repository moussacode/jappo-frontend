
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { AuthService } from '../../../../core/services/auth.service';
import { MissionService } from '../../../../core/services/mission.service';

import {  BadgeComponent } from '../../../../shared/components/badge/badge';

import { STATUT_MISSION_BADGE } from '../../../../core/constants/statut-mission.constant';
import { ButtonComponent } from '../../../../shared/components/button/button.component';
import { LivrableService } from '../../../../core/services/livrable.service';
import { Icon } from "../../../../shared/components/icon/icon";

@Component({
  selector: 'app-mission-detail',
  imports: [RouterLink, BadgeComponent, ButtonComponent, Icon],
   templateUrl: './mission-detail.html',
  styleUrl: './mission-detail.css',
})
export class MissionDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly missionService = inject(MissionService);
  private readonly livrableService = inject(LivrableService);

  private readonly missionId = this.route.snapshot.paramMap.get('id') ?? '';

  protected readonly mission = toSignal(this.missionService.getById(this.missionId), { initialValue: undefined });
  protected readonly statutBadge = STATUT_MISSION_BADGE;

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);

  protected soumettre(): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.submitting.set(true);
    this.livrableService.submit(this.missionId, user.id, 'document-simule.pdf').subscribe(() => {
      this.submitting.set(false);
      this.submitted.set(true);
    });
  }
}