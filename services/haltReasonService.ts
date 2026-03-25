/**
 * Halt Reason Analysis Service
 * Analyzes why trains halt using multiple intelligent signals
 */

export interface HaltReason {
  reason: string;
  category: 'infrastructure' | 'traffic' | 'maintenance' | 'operational' | 'safety';
  confidence: number; // 0-100
  evidence: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HaltAnalysis {
  trainNumber: string;
  location: string;
  haltDuration: number; // minutes
  primaryReason: HaltReason;
  secondaryReasons: HaltReason[];
  platformOccupancy: boolean;
  nearbyOppositeDirection: boolean;
  sectionCapacityBreached: boolean;
  maintenanceBlock: boolean;
  signalHold: boolean;
  priorityTrain: string | null;
  estimatedResumeTime: number; // timestamp
  riskFactors: string[];
}

export interface PlatformStatus {
  stationId: string;
  stationName: string;
  totalPlatforms: number;
  occupiedPlatforms: number;
  availablePlatforms: number;
  avgOccupancyTime: number; // minutes
}

/**
 * Halt Reason Analysis Service
 * Provides intelligent reasoning for train halts
 */
class HaltReasonService {
  private stationPlatforms: Map<string, PlatformStatus> = new Map();
  private historicalDelayPatterns: Map<string, number[]> = new Map(); // section -> delays
  private maintenanceBlocks: Map<string, { startDate: number; endDate: number }> = new Map();
  private signalDensity: Map<string, number> = new Map(); // section -> signal count per km

  constructor() {
    this.initializePlatforms();
    this.initializeHistoricalPatterns();
    this.initializeMaintenanceBlocks();
    this.initializeSignalDensity();
  }

  /**
   * Initialize platform occupancy data
   */
  private initializePlatforms() {
    const stations = [
      { id: 'HYD', name: 'Hyderabad', platforms: 12, occupied: 8, avgTime: 8 },
      { id: 'SEC', name: 'Secunderabad', platforms: 14, occupied: 10, avgTime: 10 },
      { id: 'KZP', name: 'Kazipet', platforms: 8, occupied: 5, avgTime: 6 },
      { id: 'WGL', name: 'Warangal', platforms: 10, occupied: 6, avgTime: 9 },
      { id: 'VJA', name: 'Vijayawada', platforms: 16, occupied: 11, avgTime: 12 },
      { id: 'VSP', name: 'Visakhapatnam', platforms: 12, occupied: 7, avgTime: 11 },
    ];

    stations.forEach((s) => {
      this.stationPlatforms.set(s.id, {
        stationId: s.id,
        stationName: s.name,
        totalPlatforms: s.platforms,
        occupiedPlatforms: s.occupied,
        availablePlatforms: s.platforms - s.occupied,
        avgOccupancyTime: s.avgTime,
      });
    });
  }

  /**
   * Initialize historical delay patterns for each section
   */
  private initializeHistoricalPatterns() {
    const patterns = {
      'SEC-001': [3, 5, 2, 4, 6, 3, 5], // Hyderabad-Secunderabad
      'SEC-002': [8, 12, 15, 10, 13, 9, 11], // Secunderabad-Kazipet (high delay)
      'SEC-003': [6, 8, 10, 7, 9, 8, 11], // Kazipet-Warangal
      'SEC-004': [12, 15, 18, 14, 20, 16, 17], // Hyderabad-Vijayawada (very high)
      'SEC-005': [9, 11, 13, 10, 12, 14, 11], // Vijayawada-Visakhapatnam
      'SEC-006': [8, 10, 12, 9, 11, 10, 13], // Hyderabad-Bengaluru
    };

    Object.entries(patterns).forEach(([section, delays]) => {
      this.historicalDelayPatterns.set(section, delays);
    });
  }

  /**
   * Initialize maintenance blocks
   */
  private initializeMaintenanceBlocks() {
    const fromNow = Date.now();

    this.maintenanceBlocks.set('SEC-002', {
      startDate: fromNow - 30 * 24 * 60 * 60 * 1000,
      endDate: fromNow + 10 * 24 * 60 * 60 * 1000,
    });

    this.maintenanceBlocks.set('SEC-006', {
      startDate: fromNow - 14 * 24 * 60 * 60 * 1000,
      endDate: fromNow + 20 * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Initialize signal density (signals per km)
   */
  private initializeSignalDensity() {
    this.signalDensity.set('SEC-001', 8 / 15); // High density
    this.signalDensity.set('SEC-002', 45 / 142); // Medium-high
    this.signalDensity.set('SEC-003', 38 / 118); // Medium
    this.signalDensity.set('SEC-004', 110 / 385); // Medium
    this.signalDensity.set('SEC-005', 95 / 352); // Medium
    this.signalDensity.set('SEC-006', 150 / 568); // Low-medium
  }

  /**
   * Analyze halt reasons for a train
   */
  analyzeHalt(
    trainNumber: string,
    location: string,
    haltDuration: number,
    nearbyTrains: Array<{ number: string; direction: string; priority: string }> = []
  ): HaltAnalysis {
    const reasons: HaltReason[] = [];

    // 1. Platform Occupancy Detection
    const platformIssue = this.detectPlatformOccupancy(location);
    if (platformIssue) {
      reasons.push(platformIssue);
    }

    // 2. Crossing Train Detection
    const crossingIssue = this.detectCrossingTrain(nearbyTrains);
    if (crossingIssue) {
      reasons.push(crossingIssue);
    }

    // 3. Signal Density Awareness
    const signalIssue = this.detectSignalHold(location);
    if (signalIssue) {
      reasons.push(signalIssue);
    }

    // 4. Maintenance Block Detection
    const maintenanceIssue = this.detectMaintenanceBlock(location);
    if (maintenanceIssue) {
      reasons.push(maintenanceIssue);
    }

    // 5. Historical Delay Patterns
    const historicalIssue = this.detectHistoricalPattern(location, haltDuration);
    if (historicalIssue) {
      reasons.push(historicalIssue);
    }

    // 6. Train Priority Conflict
    const priorityIssue = this.detectPriorityConflict(nearbyTrains);
    if (priorityIssue) {
      reasons.push(priorityIssue);
    }

    // Sort by confidence
    reasons.sort((a, b) => b.confidence - a.confidence);

    const primaryReason = reasons[0] || {
      reason: 'Unknown delay cause',
      category: 'operational',
      confidence: 50,
      evidence: ['Insufficient data'],
      severity: 'medium',
    };

    const secondaryReasons = reasons.slice(1, 3);

    return {
      trainNumber,
      location,
      haltDuration,
      primaryReason,
      secondaryReasons,
      platformOccupancy: platformIssue ? true : false,
      nearbyOppositeDirection: crossingIssue ? true : false,
      sectionCapacityBreached: historicalIssue ? true : false,
      maintenanceBlock: maintenanceIssue ? true : false,
      signalHold: signalIssue ? true : false,
      priorityTrain: this.extractPriorityTrain(nearbyTrains),
      estimatedResumeTime: Date.now() + (haltDuration + 3) * 60000, // Add 3 min buffer
      riskFactors: this.identifyRiskFactors(
        primaryReason,
        platformIssue ? true : false,
        haltDuration
      ),
    };
  }

  /**
   * Detect platform occupancy (another train blocking)
   */
  private detectPlatformOccupancy(location: string): HaltReason | null {
    const station = this.stationPlatforms.get(location);
    if (!station) return null;

    const occupancyRate = (station.occupiedPlatforms / station.totalPlatforms) * 100;

    if (occupancyRate > 80) {
      return {
        reason: `Platform unavailable - station at ${occupancyRate.toFixed(0)}% capacity`,
        category: 'infrastructure',
        confidence: 85,
        evidence: [
          `${station.occupiedPlatforms}/${station.totalPlatforms} platforms occupied`,
          `Average dwell time: ${station.avgOccupancyTime} minutes`,
          `Only ${station.availablePlatforms} platforms available`,
        ],
        severity: occupancyRate > 90 ? 'high' : 'medium',
      };
    }

    return null;
  }

  /**
   * Detect crossing train (opposite direction blocking)
   */
  private detectCrossingTrain(
    nearbyTrains: Array<{ number: string; direction: string; priority: string }>
  ): HaltReason | null {
    if (nearbyTrains.length === 0) return null;

    const oppositeTrains = nearbyTrains.filter(
      (t) => t.direction !== nearbyTrains[0]?.direction && t.number !== nearbyTrains[0]?.number
    );

    if (oppositeTrains.length > 0) {
      return {
        reason: `Crossing train regulation - opposite direction train detected`,
        category: 'safety',
        confidence: 88,
        evidence: oppositeTrains.map((t) => `${t.number} approaching from opposite direction`),
        severity: 'high',
      };
    }

    return null;
  }

  /**
   * Detect signal hold
   */
  private detectSignalHold(location: string): HaltReason | null {
    const density = this.signalDensity.get(location);
    if (!density) return null;

    // High density signals indicate more frequent holds
    if (density > 0.25) {
      return {
        reason: 'Signal hold - high signal density in area',
        category: 'infrastructure',
        confidence: 72,
        evidence: [
          `Signal cluster detected (${(density * 100).toFixed(1)} signals/km)`,
          'Train holding at signal for traffic regulation',
        ],
        severity: 'medium',
      };
    }

    return null;
  }

  /**
   * Detect maintenance block
   */
  private detectMaintenanceBlock(location: string): HaltReason | null {
    const block = this.maintenanceBlocks.get(location);
    if (!block) return null;

    const now = Date.now();
    if (now >= block.startDate && now <= block.endDate) {
      const daysRemaining = Math.ceil((block.endDate - now) / (24 * 60 * 60 * 1000));

      return {
        reason: `Maintenance block active in section`,
        category: 'maintenance',
        confidence: 95,
        evidence: [
          `Section closed for maintenance/inspection/repair`,
          `Block ends in ${daysRemaining} days`,
          'Single line operation or speed restrictions in effect',
        ],
        severity: 'critical',
      };
    }

    return null;
  }

  /**
   * Detect historical delay pattern (frequent congestion zone)
   */
  private detectHistoricalPattern(location: string, currentDelay: number): HaltReason | null {
    const pattern = this.historicalDelayPatterns.get(location);
    if (!pattern) return null;

    const avgHistorical = pattern.reduce((a, b) => a + b) / pattern.length;
    const maxHistorical = Math.max(...pattern);

    if (currentDelay > avgHistorical * 1.5) {
      const confidence = Math.min(90, 50 + (currentDelay / maxHistorical) * 40);

      return {
        reason: `Frequent congestion zone - section historically delayed`,
        category: 'traffic',
        confidence,
        evidence: [
          `Historical average delay: ${avgHistorical.toFixed(1)} minutes`,
          `Current delay: ${currentDelay.toFixed(1)} minutes (${((currentDelay / avgHistorical - 1) * 100).toFixed(0)}% above average)`,
          `Max recorded: ${maxHistorical} minutes`,
        ],
        severity: currentDelay > 15 ? 'high' : 'medium',
      };
    }

    return null;
  }

  /**
   * Detect train priority conflict
   */
  private detectPriorityConflict(
    nearbyTrains: Array<{ number: string; direction: string; priority: string }>
  ): HaltReason | null {
    const priorityOrder = ['rajdhani', 'shatabdi', 'superfast', 'express', 'passenger', 'freight'];

    if (nearbyTrains.length < 2) return null;

    const train1Priority = priorityOrder.indexOf(
      nearbyTrains[0]?.priority?.toLowerCase() || 'freight'
    );
    const blockingTrain = nearbyTrains.find((t) => {
      const tPriority = priorityOrder.indexOf(t.priority?.toLowerCase() || 'freight');
      return tPriority < train1Priority; // Higher priority (lower index) train ahead
    });

    if (blockingTrain) {
      return {
        reason: `Higher priority train ahead - waiting for ${blockingTrain.number}`,
        category: 'operational',
        confidence: 82,
        evidence: [
          `${blockingTrain.number} (${blockingTrain.priority}) has right of way`,
          'Train scheduled to wait until higher priority train passes',
        ],
        severity: 'medium',
      };
    }

    return null;
  }

  /**
   * Extract high-priority train if present
   */
  private extractPriorityTrain(
    nearbyTrains: Array<{ number: string; direction: string; priority: string }>
  ): string | null {
    const priorityOrder = ['rajdhani', 'shatabdi', 'superfast', 'express', 'passenger', 'freight'];

    const sortedTrains = [...nearbyTrains].sort((a, b) => {
      const aPriority = priorityOrder.indexOf(a.priority?.toLowerCase() || 'freight');
      const bPriority = priorityOrder.indexOf(b.priority?.toLowerCase() || 'freight');
      return aPriority - bPriority;
    });

    return sortedTrains[0]?.number || null;
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    primaryReason: HaltReason,
    platformIssue: boolean,
    haltDuration: number
  ): string[] {
    const factors: string[] = [];

    if (primaryReason.severity === 'critical') {
      factors.push('Critical halt - intervention recommended');
    }

    if (platformIssue) {
      factors.push('Platform conflict may cascade to next station');
    }

    if (haltDuration > 30) {
      factors.push('Extended halt - passenger impact significant');
    }

    if (primaryReason.category === 'maintenance') {
      factors.push('Maintenance block - cannot pass through');
    }

    return factors;
  }

  /**
   * Get platform status for a station
   */
  getPlatformStatus(stationId: string): PlatformStatus | null {
    return this.stationPlatforms.get(stationId) || null;
  }

  /**
   * Get all stations with platform data
   */
  getAllPlatformStatus(): PlatformStatus[] {
    return Array.from(this.stationPlatforms.values());
  }
}

// Export singleton instance
export const haltReasonService = new HaltReasonService();
