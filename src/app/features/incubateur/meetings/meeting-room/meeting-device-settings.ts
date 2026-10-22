import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Icon, IconName } from '../../../../shared/components/icon/icon';
import { MeetingRoomService } from '../../../../core/services/meeting-room.service';

interface DeviceField {
  kind: MediaDeviceKind;
  label: string;
  icon: IconName;
  empty: string;
}

/** Sélecteurs micro / caméra / haut-parleur, utilisés en salle d'attente et en réunion. */
@Component({
  selector: 'app-meeting-device-settings',
  standalone: true,
  imports: [Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="grid gap-3" [class.sm:grid-cols-3]="layout() === 'row'">
      @for (field of fields(); track field.kind) {
        <label class="flex min-w-0 flex-col gap-1.5">
          <span class="flex items-center gap-1.5 text-xs font-medium text-ink-muted">
            <app-icon [name]="field.icon" class="size-3.5" />
            {{ field.label }}
          </span>
          <select
            class="w-full truncate rounded-[var(--radius-button)] border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-60"
            [disabled]="devices()[field.kind].length === 0"
            [value]="selected()[field.kind] ?? ''"
            (change)="select(field.kind, $any($event.target).value)"
          >
            @for (device of devices()[field.kind]; track device.deviceId; let i = $index) {
              <option [value]="device.deviceId" [selected]="device.deviceId === selected()[field.kind]">
                {{ device.label || field.label + ' ' + (i + 1) }}
              </option>
            } @empty {
              <option value="">{{ field.empty }}</option>
            }
          </select>
        </label>
      }
    </div>
  `,
})
export class MeetingDeviceSettings {
  private readonly meetingRoom = inject(MeetingRoomService);

  readonly layout = input<'row' | 'stack'>('stack');

  protected readonly devices = this.meetingRoom.devices;
  protected readonly selected = this.meetingRoom.selectedDevices;

  /** Le choix du haut-parleur n'est proposé que si le navigateur le permet (Chrome, Edge). */
  protected readonly fields = computed<DeviceField[]>(() => {
    const fields: DeviceField[] = [
      { kind: 'audioinput', label: 'Micro', icon: 'mic', empty: 'Aucun micro détecté' },
      { kind: 'videoinput', label: 'Caméra', icon: 'video', empty: 'Aucune caméra détectée' },
    ];
    if (this.devices().audiooutput.length > 0) {
      fields.push({ kind: 'audiooutput', label: 'Haut-parleur', icon: 'volume-2', empty: 'Sortie par défaut' });
    }
    return fields;
  });

  protected select(kind: MediaDeviceKind, deviceId: string): void {
    if (deviceId) void this.meetingRoom.selectDevice(kind, deviceId);
  }
}
