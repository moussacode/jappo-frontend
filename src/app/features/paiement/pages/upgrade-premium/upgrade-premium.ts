import {
  ChangeDetectionStrategy,
  Component,
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/components/icon/icon';
import { UpgradePremiumButton } from '../../components/upgrade-premium/upgrade-premium';

@Component({
  selector: 'app-upgrade-premium-page',
  standalone: true,
  imports: [
    RouterLink,
    Icon,
   
    UpgradePremiumButton
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './upgrade-premium.html',
  styleUrl: './upgrade-premium.css',
})
export class UpgradePremium {
}