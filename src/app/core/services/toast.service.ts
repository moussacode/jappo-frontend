import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toasts = signal<Toast[]>([]);

  showSuccess(message: string, duration = 3000): void {
    this.add({ type: 'success', message, duration });
  }

  showError(message: string, duration = 5000): void {
    this.add({ type: 'error', message, duration });
  }

  showWarning(message: string, duration = 4000): void {
    this.add({ type: 'warning', message, duration });
  }

  showInfo(message: string, duration = 3000): void {
    this.add({ type: 'info', message, duration });
  }

  private add(toast: Omit<Toast, 'id'>): void {
    const id = crypto.randomUUID();
    this.toasts.update(current => [...current, { ...toast, id }]);

    // Auto-remove after duration
    setTimeout(() => {
      this.remove(id);
    }, toast.duration || 3000);
  }

  remove(id: string): void {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }

  getToasts() {
    return this.toasts;
  }
}
