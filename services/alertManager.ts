/**
 * Alert Manager Service
 * Central system for managing all notifications and alerts
 * Handles deduplication, persistence, and prioritization
 */

export type AlertType = 'info' | 'success' | 'warning' | 'error' | 'critical';
export type AlertCategory = 'delay' | 'halt' | 'congestion' | 'prediction' | 'system';

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  title: string;
  message: string;
  timestamp: number;
  trainNumber?: string;
  sectionCode?: string;
  dismissible: boolean;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  expiresIn?: number; // milliseconds
  sound?: boolean;
}

export interface AlertFilter {
  types?: AlertType[];
  categories?: AlertCategory[];
  trainNumber?: string;
  unreadOnly?: boolean;
}

class AlertManager {
  private alerts: Map<string, Alert> = new Map();
  private listeners: Set<(alerts: Alert[]) => void> = new Set();
  private history: Alert[] = [];
  private maxHistory = 100;
  private deduplicationMap: Map<string, number> = new Map();
  private deduplicationWindow = 5000; // 5 seconds

  /**
   * Create unique key for deduplication
   */
  private createKey(alert: Omit<Alert, 'id' | 'timestamp'>): string {
    return `${alert.category}:${alert.trainNumber || ''}:${alert.sectionCode || ''}:${alert.title}`;
  }

  /**
   * Add or update an alert
   */
  addAlert(alertData: Omit<Alert, 'id' | 'timestamp'>): string {
    const key = this.createKey(alertData);
    const now = Date.now();

    // Check deduplication window
    const lastTime = this.deduplicationMap.get(key);
    if (lastTime && now - lastTime < this.deduplicationWindow) {
      console.log('[AlertManager] Alert deduplicated:', key);
      return Array.from(this.alerts.values()).find((a) => {
        const aKey = this.createKey(a);
        return aKey === key;
      })?.id || '';
    }

    // Create new alert
    const alert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: now,
    };

    // Play sound if critical
    if (alert.type === 'critical' && alert.sound !== false) {
      this.playAlertSound();
    }

    // Add to alerts
    this.alerts.set(alert.id, alert);
    this.deduplicationMap.set(key, now);

    // Add to history
    this.history.unshift(alert);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    // Auto-dismiss if expiry set
    if (alert.expiresIn) {
      setTimeout(() => this.removeAlert(alert.id), alert.expiresIn);
    }

    // Notify listeners
    this.notifyListeners();

    console.log('[AlertManager] Alert added:', alert.id, alert.title);
    return alert.id;
  }

  /**
   * Remove an alert
   */
  removeAlert(alertId: string): boolean {
    if (this.alerts.delete(alertId)) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Get all active alerts
   */
  getAlerts(filter?: AlertFilter): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filter) {
      if (filter.types) {
        alerts = alerts.filter((a) => filter.types!.includes(a.type));
      }
      if (filter.categories) {
        alerts = alerts.filter((a) => filter.categories!.includes(a.category));
      }
      if (filter.trainNumber) {
        alerts = alerts.filter((a) => a.trainNumber === filter.trainNumber);
      }
    }

    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get alert history
   */
  getHistory(limit = 50): Alert[] {
    return this.history.slice(0, limit);
  }

  /**
   * Subscribe to alert changes
   */
  subscribe(callback: (alerts: Alert[]) => void): () => void {
    this.listeners.add(callback);
    // Call immediately with current state
    callback(this.getAlerts());
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const alerts = this.getAlerts();
    this.listeners.forEach((listener) => listener(alerts));
  }

  /**
   * Play alert sound
   */
  private playAlertSound(): void {
    try {
      // Create a simple beep sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();

      oscillator.connect(gain);
      gain.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.3, audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.warn('Could not play alert sound:', err);
    }
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    this.alerts.clear();
    this.notifyListeners();
  }

  /**
   * Get alert count by type
   */
  getCountByType(): Record<AlertType, number> {
    const counts: Record<AlertType, number> = {
      info: 0,
      success: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    Array.from(this.alerts.values()).forEach((alert) => {
      counts[alert.type]++;
    });

    return counts;
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

/**
 * Helper functions for creating common alerts
 */

export const AlertHelpers = {
  delayAlert: (trainNumber: string, delay: number, prediction: number) =>
    alertManager.addAlert({
      type: prediction > 30 ? 'critical' : 'warning',
      category: 'delay',
      title: `Train ${trainNumber} Delay Alert`,
      message: `Current delay: ${delay}m. Predicted: ${prediction}m`,
      trainNumber,
      dismissible: true,
      expiresIn: 300000, // 5 minutes
      sound: true,
    }),

  haltAlert: (trainNumber: string, section: string, duration: number) =>
    alertManager.addAlert({
      type: 'warning',
      category: 'halt',
      title: `Train ${trainNumber} Halted`,
      message: `Halt detected in ${section} (${duration}m)`,
      trainNumber,
      sectionCode: section,
      dismissible: true,
      sound: true,
    }),

  congestionAlert: (sectionCode: string, sectionName: string, severity: string) =>
    alertManager.addAlert({
      type: severity === 'critical' ? 'critical' : 'warning',
      category: 'congestion',
      title: `Congestion Alert: ${sectionName}`,
      message: `Traffic density: ${severity.toUpperCase()}`,
      sectionCode,
      dismissible: true,
      expiresIn: 600000, // 10 minutes
    }),

  predictionAlert: (trainNumber: string, riskLevel: string, eta: string) =>
    alertManager.addAlert({
      type: riskLevel === 'critical' ? 'critical' : riskLevel === 'high' ? 'error' : 'warning',
      category: 'prediction',
      title: `Prediction Update: Train ${trainNumber}`,
      message: `Risk: ${riskLevel.toUpperCase()}. ETA: ${eta}`,
      trainNumber,
      dismissible: true,
    }),

  systemAlert: (title: string, message: string) =>
    alertManager.addAlert({
      type: 'info',
      category: 'system',
      title,
      message,
      dismissible: true,
      expiresIn: 300000, // 5 minutes
    }),
};
