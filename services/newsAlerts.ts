/**
 * News & Alerts Integration Service
 * Fetches railway alerts, disruptions, and contextual news
 * Provides context for delays and movement changes
 */

export interface RailwayAlert {
  id: string;
  type: 'delay' | 'disruption' | 'accident' | 'weather' | 'maintenance' | 'incident';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedRoutes: string[]; // Station codes
  affectedTrains?: string[];
  startTime: string;
  endTime?: string;
  impact: string; // How it affects trains
  source: string; // IRCTC, Ministry of Railways, etc.
}

class NewsAlertsService {
  // Mock alerts database - in production integrated with real sources
  private alerts: Map<string, RailwayAlert> = new Map([
    ['ALERT_001', {
      id: 'ALERT_001',
      type: 'maintenance',
      severity: 'medium',
      title: 'Track maintenance at Kazipet Junction',
      description: 'Single line operation due to track maintenance work',
      affectedRoutes: ['KZJ', 'BZA', 'SC'],
      affectedTrains: ['12955', '13345'],
      startTime: '2026-03-01T00:00:00Z',
      endTime: '2026-03-25T23:59:59Z',
      impact: '10-15 minute delay expected on affected routes',
      source: 'South Central Railways',
    }],
    ['ALERT_002', {
      id: 'ALERT_002',
      type: 'weather',
      severity: 'high',
      title: 'Heavy monsoon rains forecast',
      description: 'Severe weather warning: Heavy rains expected in Hyderabad region',
      affectedRoutes: ['HYB', 'SC', 'BZA'],
      startTime: '2026-03-12T06:00:00Z',
      endTime: '2026-03-13T18:00:00Z',
      impact: '20-30 minute additional delays due to reduced visibility and track conditions',
      source: 'India Meteorological Department',
    }],
    ['ALERT_003', {
      id: 'ALERT_003',
      type: 'incident',
      severity: 'critical',
      title: 'Cattle on track at Warangal section',
      description: 'Reported cattle crossing at KZJ-WL section, causing traffic block',
      affectedRoutes: ['KZJ'],
      affectedTrains: ['14645', '15906'],
      startTime: '2026-03-12T14:30:00Z',
      endTime: '2026-03-12T15:45:00Z',
      impact: 'Trains held for safety; 15-20 minute delay expected',
      source: 'Warangal Railway Station',
    }],
  ]);

  /**
   * Get active alerts for a route
   */
  getActiveAlertsForRoute(stationCode: string): RailwayAlert[] {
    const now = new Date();
    const activeAlerts: RailwayAlert[] = [];

    for (const alert of this.alerts.values()) {
      const startTime = new Date(alert.startTime);
      const endTime = alert.endTime ? new Date(alert.endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (alert.affectedRoutes.includes(stationCode) && startTime <= now && now <= endTime) {
        activeAlerts.push(alert);
      }
    }

    // Sort by severity
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return activeAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Get alerts affecting a train
   */
  getAlertsForTrain(trainNumber: string): RailwayAlert[] {
    const now = new Date();
    const affectingAlerts: RailwayAlert[] = [];

    for (const alert of this.alerts.values()) {
      const startTime = new Date(alert.startTime);
      const endTime = alert.endTime ? new Date(alert.endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (
        alert.affectedTrains?.includes(trainNumber) &&
        startTime <= now &&
        now <= endTime
      ) {
        affectingAlerts.push(alert);
      }
    }

    return affectingAlerts.sort(
      (a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] -
        { critical: 0, high: 1, medium: 2, low: 3 }[b.severity])
    );
  }

  /**
   * Get all active alerts
   */
  getAllActiveAlerts(): RailwayAlert[] {
    const now = new Date();
    const activeAlerts: RailwayAlert[] = [];

    for (const alert of this.alerts.values()) {
      const startTime = new Date(alert.startTime);
      const endTime = alert.endTime ? new Date(alert.endTime) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (startTime <= now && now <= endTime) {
        activeAlerts.push(alert);
      }
    }

    return activeAlerts;
  }

  /**
   * Estimate delay impact from alerts
   */
  getAlertDelayImpact(alerts: RailwayAlert[]): number {
    let totalDelay = 0;

    for (const alert of alerts) {
      if (alert.severity === 'critical') totalDelay += 20;
      else if (alert.severity === 'high') totalDelay += 15;
      else if (alert.severity === 'medium') totalDelay += 8;
      else totalDelay += 2;
    }

    return totalDelay;
  }

  /**
   * Get alert description for users
   */
  getAlertSummary(alert: RailwayAlert): string {
    const severityIcon: Record<string, string> = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️',
    };

    return `${severityIcon[alert.severity]} ${alert.title}\n${alert.impact}`;
  }

  /**
   * Add new alert (for testing/updates)
   */
  addAlert(alert: RailwayAlert): void {
    this.alerts.set(alert.id, alert);
  }

  /**
   * Clear all alerts (for testing)
   */
  clearAlerts(): void {
    this.alerts.clear();
  }

  /**
   * Get alerts by type
   */
  getAlertsByType(type: string): RailwayAlert[] {
    return Array.from(this.alerts.values()).filter(a => a.type === type);
  }
}

const newsAlerts = new NewsAlertsService();
export default newsAlerts;
