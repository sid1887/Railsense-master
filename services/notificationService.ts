/**
 * Notification Service
 * Browser notifications, in-app toasts, and alert management
 */

interface NotificationOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number; // ms, 0 = persistent
  action?: () => void;
}

interface HaltNotification {
  trainNumber: string;
  station: string;
  expectedDuration: number;
  reason: string;
}

interface TrafficNotification {
  trainNumber: string;
  severity: 'low' | 'medium' | 'high';
  affectedTrains: number;
  location: string;
}

interface DelayNotification {
  trainNumber: string;
  currentDelay: number;
  estimatedDelay: number;
  reason: string;
}

class NotificationService {
  private toastQueue: Map<string, NotificationOptions> = new Map();
  private notificationSound: HTMLAudioElement | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Check for notification permission
    this.requestPermission();
  }

  /**
   * Request browser notification permission
   */
  private async requestPermission(): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    if (Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
      } catch (err) {
        console.error('Failed to request notification permission:', err);
      }
    }
  }

  /**
   * Send notification via browser
   */
  private sendBrowserNotification(
    title: string,
    options?: {
      message?: string;
      type?: 'success' | 'error' | 'warning' | 'info';
      icon?: string;
      duration?: number;
      action?: () => void;
    }
  ): void {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: options?.icon || '/train-icon.png',
        body: options?.message,
        badge: '/train-badge.png',
        tag: title, // Prevents duplicate notifications
      });

      // Auto-close after duration
      if (options?.duration !== 0) {
        setTimeout(() => notification.close(), options?.duration || 5000);
      }

      // Handle notification click
      notification.onclick = () => {
        window.focus();
        options?.action?.();
        notification.close();
      };
    } catch (err) {
      console.error('Failed to send browser notification:', err);
    }
  }

  /**
   * Add to-app toast notification
   */
  public addToast(options: NotificationOptions): string {
    const id = `toast-${Date.now()}-${Math.random()}`;
    this.toastQueue.set(id, options);

    // Dispatch custom event for UI to listen
    window.dispatchEvent(
      new CustomEvent('toast-added', {
        detail: { id, ...options },
      })
    );

    // Auto-remove after duration
    if (options.duration !== 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, options.duration || 5000);
    }

    return id;
  }

  /**
   * Remove toast notification
   */
  public removeToast(id: string): void {
    this.toastQueue.delete(id);
    window.dispatchEvent(
      new CustomEvent('toast-removed', {
        detail: { id },
      })
    );
  }

  /**
   * Notify on halt detection
   */
  public notifyHalt(info: HaltNotification): void {
    const title = `🛑 ${info.trainNumber} Halted`;
    const message = `${info.station} - Expected ${info.expectedDuration} mins. Reason: ${info.reason}`;

    // Browser notification
    this.sendBrowserNotification(title, {
      message,
      type: 'warning',
      icon: '/halt-icon.png',
    });

    // Toast
    this.addToast({
      title,
      message,
      type: 'warning',
      duration: 8000,
      action: () => {
        // Navigate to train details
        window.location.href = `/train/${info.trainNumber}`;
      },
    });

    this.playSound('halt');
  }

  /**
   * Notify on traffic detection
   */
  public notifyTraffic(info: TrafficNotification): void {
    const title = `⚠️ Traffic Detected`;
    const message = `${info.affectedTrains}+ trains affected near ${info.location} (${info.severity})`;

    // Browser notification
    this.sendBrowserNotification(title, {
      message,
      type: 'warning',
      icon: '/traffic-icon.png',
    });

    // Toast (only for high severity)
    if (info.severity === 'high') {
      this.addToast({
        title,
        message,
        type: 'warning',
        duration: 10000,
      });

      this.playSound('alert');
    }
  }

  /**
   * Notify on delay milestone
   */
  public notifyDelay(info: DelayNotification): void {
    const delayIncrease = info.estimatedDelay - info.currentDelay;

    const title = `⏱️ ${info.trainNumber} Delayed`;
    const message = `Current: ${info.currentDelay}m | Est: ${info.estimatedDelay}m (+${delayIncrease}m). Reason: ${info.reason}`;

    // Browser notification
    this.sendBrowserNotification(title, {
      message,
      type: 'info',
      icon: '/delay-icon.png',
    });

    // Toast (only if significant increase)
    if (delayIncrease > 10) {
      this.addToast({
        title,
        message,
        type: 'warning',
        duration: 7000,
        action: () => {
          window.location.href = `/train/${info.trainNumber}`;
        },
      });

      this.playSound('alert');
    }
  }

  /**
   * Notify on safe status
   */
  public notifySafe(trainNumber: string, status: string): void {
    const title = `✅ ${trainNumber} Safe`;
    const message = status;

    this.addToast({
      title,
      message,
      type: 'success',
      duration: 5000,
    });

    this.playSound('success');
  }

  /**
   * Play notification sound
   */
  private playSound(type: 'halt' | 'alert' | 'success' | 'info'): void {
    if (!this.soundEnabled) return;

    try {
      // Use Web Audio API for beeps
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      oscillator.connect(gain);
      gain.connect(audioCtx.destination);

      // Different frequencies for different types
      const frequencies: Record<string, number> = {
        halt: 800,
        alert: 600,
        success: 900,
        info: 500,
      };

      oscillator.frequency.value = frequencies[type];
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (err) {
      console.warn('Failed to play notification sound:', err);
    }
  }

  /**
   * Toggle sound
   */
  public toggleSound(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * Get active toasts
   */
  public getActiveToasts(): Array<NotificationOptions & { id: string }> {
    return Array.from(this.toastQueue.entries()).map(([id, options]) => ({
      id,
      ...options,
    }));
  }

  /**
   * Clear all toasts
   */
  public clearAll(): void {
    this.toastQueue.clear();
    window.dispatchEvent(new CustomEvent('toasts-cleared'));
  }
}

// Singleton instance
export const notificationService = new NotificationService();

export default NotificationService;
