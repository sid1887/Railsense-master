/**
 * Signal Awareness Service
 * Fetches railway signal status from OpenRailwayMap or railway authority APIs
 * Used to detect signal holds and predict movement
 */

export interface SignalStatus {
  id: string;
  location: { latitude: number; longitude: number };
  status: 'red' | 'yellow' | 'green';
  type: 'stop' | 'caution' | 'proceed';
  lastUpdate: string;
  aspect: string; // e.g., "Stop", "Caution", "Clear"
}

export interface SignalAwareness {
  nearbySignals: SignalStatus[];
  nextSignal: SignalStatus | null;
  allClear: boolean;
  hazards: string[];
}

class SignalAwarenessService {
  // Mock signal database - in production, integrated with OpenRailwayMap
  private signals: Map<string, SignalStatus> = new Map([
    // Nagpur area signals
    ['NG_S1', {
      id: 'NG_S1',
      location: { latitude: 21.1458, longitude: 79.0882 },
      status: 'green',
      type: 'proceed',
      aspect: 'Clear',
      lastUpdate: new Date().toISOString(),
    }],
    ['NG_S2', {
      id: 'NG_S2',
      location: { latitude: 21.1480, longitude: 79.0900 },
      status: 'green',
      type: 'proceed',
      aspect: 'Clear',
      lastUpdate: new Date().toISOString(),
    }],
    // Hyderabad area signals
    ['HYB_S1', {
      id: 'HYB_S1',
      location: { latitude: 17.3714, longitude: 78.4729 },
      status: 'red',
      type: 'stop',
      aspect: 'Stop',
      lastUpdate: new Date().toISOString(),
    }],
    // Other major junctions
    ['SC_S1', {
      id: 'SC_S1',
      location: { latitude: 17.3667, longitude: 78.467 },
      status: 'yellow',
      type: 'caution',
      aspect: 'Caution',
      lastUpdate: new Date().toISOString(),
    }],
  ]);

  /**
   * Get nearby signals for a location
   */
  getNearbySignals(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): SignalAwareness {
    const nearbySignals: SignalStatus[] = [];

    for (const signal of this.signals.values()) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        signal.location.latitude,
        signal.location.longitude
      );

      if (distance <= radiusKm) {
        nearbySignals.push(signal);
      }
    }

    // Sort by distance
    nearbySignals.sort((a, b) => {
      const distA = this.calculateDistance(latitude, longitude, a.location.latitude, a.location.longitude);
      const distB = this.calculateDistance(latitude, longitude, b.location.latitude, b.location.longitude);
      return distA - distB;
    });

    // Check for hazards
    const hazards: string[] = [];
    for (const signal of nearbySignals) {
      if (signal.status === 'red') {
        hazards.push(`Stop signal ahead at ${signal.id}`);
      } else if (signal.status === 'yellow') {
        hazards.push(`Caution signal ahead at ${signal.id}`);
      }
    }

    return {
      nearbySignals,
      nextSignal: nearbySignals[0] || null,
      allClear: !hazards.some(h => h.includes('Stop')),
      hazards,
    };
  }

  /**
   * Check if signal is causing halt
   */
  isSignalCausingHalt(trainLatitude: number, trainLongitude: number): boolean {
    const awareness = this.getNearbySignals(trainLatitude, trainLongitude, 2);
    return awareness.nextSignal?.status === 'red' || false;
  }

  /**
   * Get signal status explanation
   */
  getSignalExplanation(signal: SignalStatus | null): string {
    if (!signal) return 'No signals ahead detected';

    const explanations: Record<string, string> = {
      red: '🔴 Stop signal - train must halt at this signal until cleared',
      yellow: '🟡 Caution signal - train must reduce speed and be prepared to stop',
      green: '🟢 Clear signal - train can proceed at full speed',
    };

    return explanations[signal.status] || 'Unknown signal status';
  }

  /**
   * Estimate time until signal clears
   */
  estimateSignalClearTime(signal: SignalStatus | null): number {
    if (!signal || signal.status !== 'red') return 0;

    // Mock estimate: red signals typically clear in 2-5 minutes at major junctions
    return Math.random() * 3 + 2; // 2-5 minutes
  }

  /**
   * Calculate distance between two points (Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get all signals (for map display)
   */
  getAllSignals(): SignalStatus[] {
    return Array.from(this.signals.values());
  }

  /**
   * Update signal status (for real-time integration)
   */
  updateSignalStatus(signalId: string, status: 'red' | 'yellow' | 'green'): void {
    const signal = this.signals.get(signalId);
    if (signal) {
      signal.status = status;
      signal.lastUpdate = new Date().toISOString();
      signal.type = status === 'red' ? 'stop' : status === 'yellow' ? 'caution' : 'proceed';
    }
  }
}

const signalAwareness = new SignalAwarenessService();
export default signalAwareness;
