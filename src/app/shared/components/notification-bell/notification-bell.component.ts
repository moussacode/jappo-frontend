import {
  Component,
  inject,
  signal,
  ElementRef,
  ViewChild,
  TemplateRef,
  ViewContainerRef,
  OnDestroy,
} from '@angular/core';
import { Overlay, OverlayRef, ConnectedPosition } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Icon } from '../icon/icon';

@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [CommonModule, Icon],
  template: `
    <button
      #trigger
      type="button"
      (click)="toggleDropdown()"
      class="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition-all hover:bg-surface-muted hover:text-ink cursor-pointer"
      [class.bg-surface-muted]="isDropdownOpen()"
      [class.!text-ink]="isDropdownOpen()"
      aria-haspopup="true"
      [attr.aria-expanded]="isDropdownOpen()"
      aria-label="Notifications"
    >
      <svg class="size-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      @if (unreadCount() > 0) {
        <span class="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface">
          {{ unreadCount() > 9 ? '9+' : unreadCount() }}
        </span>
      }
    </button>

    <!-- Template du panneau : projeté dans le CDK Overlay, plus soumis aux overflow parents -->
    <ng-template #panel>
      <div class="flex w-80 flex-col rounded-xl border border-line bg-surface p-1.5 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div class="flex items-center justify-between px-2 py-1.5 border-b border-line mb-1">
          <span class="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Notifications
          </span>
          @if (unreadCount() > 0) {
            <button
              type="button"
              (click)="markAllAsRead()"
              class="text-[11px] font-medium text-accent-strong hover:underline cursor-pointer"
            >
              Tout marquer comme lu
            </button>
          }
        </div>

        <div class="custom-scrollbar flex max-h-80 flex-col gap-0.5 overflow-y-auto">
          @if (notifications().length === 0) {
            <div class="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <div class="flex size-9 items-center justify-center rounded-full bg-surface-muted text-ink-muted">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <p class="text-xs text-ink-muted">Aucune notification</p>
            </div>
          } @else {
            @for (notification of notifications(); track notification.id) {
              <div
                (click)="handleNotificationClick(notification)"
                class="group relative flex items-start gap-2.5 rounded-lg px-2.5 py-2.5 transition-colors cursor-pointer hover:bg-surface-muted"
                [class.bg-accent-soft]="!notification.lu"
              >
                @if (!notification.lu) {
                  <span class="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-strong"></span>
                } @else {
                  <span class="mt-1.5 size-1.5 shrink-0"></span>
                }

                <div class="min-w-0 flex-1">
                  <p class="truncate text-xs font-semibold text-ink">
                    {{ notification.titre }}
                  </p>
                  <p class="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                    {{ notification.message }}
                  </p>
                  <p class="mt-1 text-[10px] text-ink-muted">
                    {{ formatDate(notification.dateCreation) }}
                  </p>
                </div>

                <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  @if (!notification.lu) {
                    <button
                      type="button"
                      (click)="markAsRead(notification.id); $event.stopPropagation()"
                      class="flex size-6 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-accent-strong cursor-pointer"
                      title="Marquer comme lu"
                    >
                      <svg class="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </button>
                  }
                  <button
                    type="button"
                    (click)="deleteNotification(notification.id); $event.stopPropagation()"
                    class="flex size-6 items-center justify-center rounded-md text-ink-muted hover:bg-surface hover:text-rose-600 cursor-pointer"
                    title="Supprimer"
                  >
                    <svg class="size-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            }
          }
        </div>
      </div>
    </ng-template>
  `,
})
export class NotificationBellComponent implements OnDestroy {
  @ViewChild('trigger') trigger!: ElementRef<HTMLButtonElement>;
  @ViewChild('panel') panelTemplate!: TemplateRef<unknown>;

  private notificationService = inject(NotificationService);
  private router = inject(Router);
  private overlay = inject(Overlay);
  private viewContainerRef = inject(ViewContainerRef);

  private overlayRef: OverlayRef | null = null;

  isDropdownOpen = signal(false);

  notifications = this.notificationService.getNotifications();
  unreadCount = this.notificationService.getUnreadCount();

  toggleDropdown(): void {
    if (this.isDropdownOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private open(): void {
    // Panneau ancré au bouton, sorti au-dessus (bottom -> top), aligné à droite
    const positions: ConnectedPosition[] = [
      { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 },
      // Position de secours : si pas de place au-dessus, ouvre en dessous
      { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    ];

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.trigger)
      .withPositions(positions)
      .withPush(true);

    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-transparent-backdrop',
    });

    this.overlayRef.attach(new TemplatePortal(this.panelTemplate, this.viewContainerRef));
    this.overlayRef.backdropClick().subscribe(() => this.close());

    this.isDropdownOpen.set(true);
  }

  close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.isDropdownOpen.set(false);
  }

  handleNotificationClick(notification: Notification): void {
    this.notificationService.handleNotificationClick(notification);
    this.close();
  }

  markAsRead(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead();
  }

  deleteNotification(notificationId: string): void {
    this.notificationService.deleteNotification(notificationId);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return date.toLocaleDateString('fr-FR');
  }

  ngOnDestroy(): void {
    this.overlayRef?.dispose();
  }
}