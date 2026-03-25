/**
 * Passenger Alert Service
 * Manages alerts specific to passenger journeys and connections
 */

export type PassengerAlertType =
  | 'connection-miss'
  | 'platform-change'
  | 'service-disruption'
  | 'delay-warning'
  | 'connection-tight'
  | 'alternate-route'
  | 'cancellation';

export interface PassengerJourney {
  boardingStation: string;
  boardingStationCode: string;
  alightingStation: string;
  alightingStationCode: string;
  boardingTime: number;
  expectedArrival: number;
  trainNumber: string;
}

export interface PassengerAlert {
  id: string;
  type: PassengerAlertType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  suggestedActions: Array<{
    label: string;
    action: 'view-alternatives' | 'change-boarding' | 'contact-support' | 'acknowledge';
  }>;
  affectedConnection?: {
    trainNumber: string;
    boardingStation: string;
    boardingTime: number;
  };
  timestamp: number;
  expiresAt: number;
  read: boolean;
}

class PassengerAlertService {
  private alerts: Map<string, PassengerAlert> = new Map();
  private journeys: Map<string, PassengerJourney> = new Map();
  private listeners: Set<(alerts: PassengerAlert[]) => void> = new Set();

  /**
   * Register a passenger journey
   */
  registerJourney(
    journeyId: string,
    journey: PassengerJourney
  ): void {
    this.journeys.set(journeyId, journey);
    console.log('[PassengerAlertService] Journey registered:', journeyId);
  }

  /**
   * Get journey details
   */
  getJourney(journeyId: string): PassengerJourney | undefined {
    return this.journeys.get(journeyId);
  }

  /**
   * Create a passenger alert
   */
  createAlert(
    journeyId: string,
    type: PassengerAlertType,
    severity: 'info' | 'warning' | 'critical',
    title: string,
    message: string,
    options?: {
      actionRequired?: boolean;
      suggestedActions?: PassengerAlert['suggestedActions'];
      affectedConnection?: PassengerAlert['affectedConnection'];
      expiresIn?: number;
    }
  ): PassengerAlert {
    const alert: PassengerAlert = {
      id: `palert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      title,
      message,
      actionRequired: options?.actionRequired ?? severity === 'critical',
      suggestedActions: options?.suggestedActions ?? [],
      affectedConnection: options?.affectedConnection,
      timestamp: Date.now(),
      expiresAt: Date.now() + (options?.expiresIn ?? 3600000), // Default 1 hour
      read: false,
    };

    this.alerts.set(alert.id, alert);
    this.notifyListeners();

    console.log('[PassengerAlertService] Alert created:', alert.id, type);
    return alert;
  }

  /**
   * Create connection miss alert
   */
  createConnectionMissAlert(
    journeyId: string,
    connectingTrain: string,
    boardingStation: string,
    boardingTime: number,
    estimatedArrival: number
  ): PassengerAlert {
    const shortfall = estimatedArrival - boardingTime;

    return this.createAlert(
      journeyId,
      'connection-miss',
      'critical',
      `Connection Alert: ${connectingTrain}`,
      `You may miss your connection. Arrival: ${new Date(estimatedArrival).toLocaleTimeString()}, Departure: ${new Date(boardingTime).toLocaleTimeString()}. Shortfall: ${Math.abs(shortfall)}m`,
      {
        actionRequired: true,
        suggestedActions: [
          { label: 'View alternative trains', action: 'view-alternatives' },
          { label: 'Change boarding station', action: 'change-boarding' },
          { label: 'Contact support', action: 'contact-support' },
        ],
        affectedConnection: {
          trainNumber: connectingTrain,
          boardingStation,
          boardingTime,
        },
        expiresIn: 1800000, // 30 minutes
      }
    );
  }

  /**
   * Create platform change alert
   */
  createPlatformChangeAlert(
    journeyId: string,
    trainNumber: string,
    oldPlatform: string,
    newPlatform: string
  ): PassengerAlert {
    return this.createAlert(
      journeyId,
      'platform-change',
      'warning',
      `Platform Change: ${trainNumber}`,
      `Train ${trainNumber} platform changed from ${oldPlatform} to ${newPlatform}. Check departure updates.`,
      {
        actionRequired: true,
        suggestedActions: [
          { label: 'Go to new platform', action: 'acknowledge' },
          { label: 'Show map', action: 'view-alternatives' },
        ],
      }
    );
  }

  /**
   * Create delay warning alert
   */
  createDelayWarningAlert(
    journeyId: string,
    trainNumber: string,
    currentDelay: number,
    predictedDelay: number,
    riskLevel: 'low' | 'medium' | 'high'
  ): PassengerAlert {
    const severity = riskLevel === 'high' ? 'critical' : riskLevel === 'medium' ? 'warning' : 'info';

    return this.createAlert(
      journeyId,
      'delay-warning',
      severity,
      `Delay Alert: ${trainNumber}`,
      `Current delay: ${currentDelay}m. Predicted: ${predictedDelay}m. Risk of missing connections: ${riskLevel.toUpperCase()}`,
      {
        actionRequired: riskLevel === 'high',
        expiresIn: 600000, // 10 minutes
      }
    );
  }

  /**
   * Create connection tight alert
   */
  createConnectionTightAlert(
    journeyId: string,
    connectingTrain: string,
    bufferTime: number
  ): PassengerAlert {
    return this.createAlert(
      journeyId,
      'connection-tight',
      'warning',
      `Tight Connection: ${connectingTrain}`,
      `Only ${bufferTime}m buffer between arrival and your connection. This is risky.`,
      {
        actionRequired: false,
        suggestedActions: [
          { label: 'See alternatives', action: 'view-alternatives' },
        ],
      }
    );
  }

  /**
   * Create service disruption alert
   */
  createServiceDisruptionAlert(
    journeyId: string,
    affectedSection: string,
    reason: string,
    estimatedDuration: number
  ): PassengerAlert {
    return this.createAlert(
      journeyId,
      'service-disruption',
      'critical',
      `Service Disruption: ${affectedSection}`,
      `${reason}. Estimated duration: ${estimatedDuration} minutes. Your journey may be affected.`,
      {
        actionRequired: true,
        suggestedActions: [
          { label: 'View alternative routes', action: 'view-alternatives' },
          { label: 'Check latest updates', action: 'acknowledge' },
        ],
      }
    );
  }

  /**
   * Get alerts for journey
   */
  getAlerts(journeyId?: string): PassengerAlert[] {
    const alerts = Array.from(this.alerts.values());

    // Filter out expired alerts
    const now = Date.now();
    const activeAlerts = alerts.filter((a) => a.expiresAt > now);

    // Remove expired from map
    Array.from(this.alerts.keys()).forEach((id) => {
      const alert = this.alerts.get(id);
      if (alert && alert.expiresAt <= now) {
        this.alerts.delete(id);
      }
    });

    return activeAlerts.sort((a, b) => {
      // Critical first, then warning, then info
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
      return severityDiff !== 0 ? severityDiff : b.timestamp - a.timestamp;
    });
  }

  /**
   * Mark alert as read
   */
  markAsRead(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.read = true;
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId: string): boolean {
    if (this.alerts.delete(alertId)) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Subscribe to alert changes
   */
  subscribe(callback: (alerts: PassengerAlert[]) => void): () => void {
    this.listeners.add(callback);
    // Call immediately with current state
    callback(this.getAlerts());
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.getAlerts()));
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.getAlerts().filter((a) => !a.read).length;
  }

  /**
   * Clear all alerts
   */
  clearAll(): void {
    this.alerts.clear();
    this.notifyListeners();
  }
}

// Export singleton
export const passengerAlertService = new PassengerAlertService();
