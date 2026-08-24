import { Component, input } from '@angular/core';

export type IconName =
  | 'dashboard'
  | 'route'
  | 'missions'
  | 'documents'
  | 'ai'
  | 'profile'
  | 'cohortes'
  | 'entrepreneurs'
  | 'settings'
  | 'search'
  | 'bell'
  | 'menu'
  | 'close'
  | 'chevron-left'
  | 'chevron-right'
  | 'logout'
  | 'plus'
  | 'edit'
  | 'trash'
  | 'check'
  | 'arrow-right'
  | 'arrow-left'
  | 'calendar'
  | 'clock'
  | 'document-text'
  | 'chart'
  | 'users'
  | 'briefcase'
  | 'sparkles';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.html',
})
export class Icon {
  name = input.required<IconName>();
}