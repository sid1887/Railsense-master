/**
 * Passenger Safety & Dwell Analysis Service
 * Analyzes safe connection windows and unusual dwell behaviors
 */

export interface SafetyWindow {
  startTime: number;
  endTime: number;
  trainNumber: string;
  minimumConnectionTime: number; // minutes required for safe transfer
  safetyMargin: number; // buffer in minutes
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  reasonsForRisk: string[];
  passengerImpact: number; // estimated passengers affected
}

export interface DwellAnalysis {
  stationId: string;
  stationName: string;
  trainNumber: string;
  actualDwellTime: number; // minutes
  expectedDwellTime: number;
  deviation: number; // positive = longer than expected
  deviationPercent: number;
  anomalyDetected: boolean;
  anomalyType?: 'extended' | 'shortened' | 'none';
  possibleCauses: string[];
  passengerImpact: 'none' | 'low' | 'medium' | 'high';
  cascadeRiskLevel: number; // 0-100
  recommendations: string[];
}

export interface PassengerSafetyAssessment {
  trainNumber: string;
  originStation: string;
  destinationStation: string;
  totalPassengers: number;
  connectionPassengers: number;
  safetyWindows: SafetyWindow[];
  dwellAnomalies: DwellAnalysis[];
  overallSafetyScore: number; // 0-100, higher = safer
  riskFactors: {
    factor: string;
    severity: 'low' | 'medium' | 'high';
    affectedPassengers: number;
  }[];
  alerts: string[];
  recommendations: string[];
}

/**
 * Passenger Safety & Dwell Analysis Service
 */
class PassengerSafetyService {
  private stationDwellProfiles: Map<string, { expected: number; stdDev: number }> = new Map();
  private connectionRequirements: Map<string, number> = new Map();
  private historicalAnomalies: Map<string, number> = new Map(); // anomaly rate per station
  private passengerLoading: Map<string, number> = new Map(); // typical passenger counts

  constructor() {
    this.initializeDwellProfiles();
    this.initializeConnectionRequirements();
    this.initializeAnomalyRates();
    this.initializePassengerLoading();
  }

  /**
   * Initialize expected dwell times per station
   */
  private initializeDwellProfiles() {
    // Format: [expected dwell time, standard deviation]
    this.stationDwellProfiles.set('HYD', { expected: 10, stdDev: 2 }); // Major hub
    this.stationDwellProfiles.set('SEC', { expected: 8, stdDev: 1.5 }); // Major hub
    this.stationDwellProfiles.set('KZP', { expected: 5, stdDev: 1 }); // Minor station
    this.stationDwellProfiles.set('WGL', { expected: 6, stdDev: 1.2 });
    this.stationDwellProfiles.set('VJA', { expected: 12, stdDev: 2.5 }); // Major hub
    this.stationDwellProfiles.set('VSP', { expected: 10, stdDev: 2 }); // Major hub
  }

  /**
   * Initialize connection time requirements
   */
  private initializeConnectionRequirements() {
    // Minimum time (minutes) needed for safe passenger transfer
    this.connectionRequirements.set('HYD', 25); // Major hub, complex
    this.connectionRequirements.set('SEC', 20); // Well-organized
    this.connectionRequirements.set('KZP', 15); // Simple layout
    this.connectionRequirements.set('WGL', 18);
    this.connectionRequirements.set('VJA', 30); // Very complex
    this.connectionRequirements.set('VSP', 25);
  }

  /**
   * Initialize historical anomaly rates
   */
  private initializeAnomalyRates() {
    this.historicalAnomalies.set('HYD', 0.12); // 12% dwell anomalies
    this.historicalAnomalies.set('SEC', 0.08);
    this.historicalAnomalies.set('KZP', 0.05);
    this.historicalAnomalies.set('WGL', 0.06);
    this.historicalAnomalies.set('VJA', 0.15); // Congested hub
    this.historicalAnomalies.set('VSP', 0.10);
  }

  /**
   * Initialize typical passenger loading
   */
  private initializePassengerLoading() {
    this.passengerLoading.set('rajdhani', 750);
    this.passengerLoading.set('shatabdi', 400);
    this.passengerLoading.set('superfast', 900);
    this.passengerLoading.set('express', 600);
    this.passengerLoading.set('passenger', 1100);
    this.passengerLoading.set('freight', 0);
  }

  /**
   * Assess passenger safety for a journey
   */
  assessPassengerSafety(
    trainNumber: string,
    originStation: string,
    destinationStation: string,
    trainCategory: string = 'express',
    planningHorizon: number = 120 // minutes ahead
  ): PassengerSafetyAssessment {
    // Get passenger counts
    const totalPassengers = this.passengerLoading.get(trainCategory.toLowerCase()) || 700;
    const connectionPassengers = Math.round(totalPassengers * 0.25); // ~25% connecting

    // Analyze safety windows
    const safetyWindows = this.analyzeConnectionWindows(
      trainNumber,
      originStation,
      destinationStation,
      planningHorizon
    );

    // Analyze dwell patterns
    const dwellAnomalies = this.analyzeDwellPatterns(trainNumber, [
      originStation,
      destinationStation,
    ]);

    // Identify risk factors
    const riskFactors = this.identifyRiskFactors(
      safetyWindows,
      dwellAnomalies,
      connectionPassengers
    );

    // Calculate safety score
    const safetyScore = this.calculateSafetyScore(riskFactors, dwellAnomalies);

    // Generate alerts
    const alerts = this.generateSafetyAlerts(riskFactors, dwellAnomalies, safetyWindows);

    // Generate recommendations
    const recommendations = this.generateSafetyRecommendations(
      riskFactors,
      dwellAnomalies,
      safetyScore
    );

    return {
      trainNumber,
      originStation,
      destinationStation,
      totalPassengers,
      connectionPassengers,
      safetyWindows,
      dwellAnomalies,
      overallSafetyScore: safetyScore,
      riskFactors,
      alerts,
      recommendations,
    };
  }

  /**
   * Analyze connection safety windows
   */
  private analyzeConnectionWindows(
    trainNumber: string,
    fromStation: string,
    toStation: string,
    planningHorizon: number
  ): SafetyWindow[] {
    const windows: SafetyWindow[] = [];
    const minConnectionTime = this.connectionRequirements.get(fromStation) || 20;

    const now = Date.now();

    // Generate 3-4 potential connection windows
    for (let i = 0; i < 3; i++) {
      const startTime = now + (i + 1) * 30 * 60 * 1000; // 30, 60, 90 min windows
      const endTime = startTime + minConnectionTime * 60 * 1000;

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const reasonsForRisk: string[] = [];

      if (minConnectionTime > 25) {
        reasonsForRisk.push('Complex station Layout requires extended connection time');
        riskLevel = 'medium';
      }

      // Simulate actual delay variance
      const delayVariance = Math.random() * 8 - 4; // -4 to +4 min
      if (delayVariance > 5) {
        reasonsForRisk.push('Current delays may impact connection window');
        riskLevel = 'high';
      }

      const actualMinTime = minConnectionTime + delayVariance;

      windows.push({
        startTime,
        endTime,
        trainNumber: `Con-${i + 1}`,
        minimumConnectionTime: actualMinTime,
        safetyMargin: Math.max(0, minConnectionTime - actualMinTime),
        riskLevel,
        reasonsForRisk,
        passengerImpact: Math.round(100 + Math.random() * 200),
      });
    }

    return windows.slice(0, 2); // Return top 2 safe windows
  }

  /**
   * Analyze dwell pattern anomalies
   */
  private analyzeDwellPatterns(trainNumber: string, stations: string[]): DwellAnalysis[] {
    return stations.map((stationId) => {
      const profile = this.stationDwellProfiles.get(stationId) || { expected: 8, stdDev: 2 };
      const anomalyRate = this.historicalAnomalies.get(stationId) || 0.08;

      // Simulate actual dwell time
      let actualDwell = profile.expected + (Math.random() - 0.5) * profile.stdDev * 2;

      // 8-15% chance of anomaly
      let anomalyType: 'extended' | 'shortened' | 'none' = 'none';
      if (Math.random() < anomalyRate) {
        anomalyType = Math.random() > 0.5 ? 'extended' : 'shortened';
        if (anomalyType === 'extended') {
          actualDwell = profile.expected + (3 + Math.random() * 8); // +3 to +11 min
        } else {
          actualDwell = Math.max(1, profile.expected - (2 + Math.random() * 4)); // -2 to -6 min
        }
      }

      const deviation = actualDwell - profile.expected;
      const deviationPercent = (deviation / profile.expected) * 100;

      // Determine passenger impact
      let passengerImpact: 'none' | 'low' | 'medium' | 'high' = 'none';
      if (anomalyType === 'extended' && deviation > 5) {
        passengerImpact = 'high';
      } else if (deviation > 3) {
        passengerImpact = 'medium';
      } else if (deviation > 1) {
        passengerImpact = 'low';
      }

      // Cascade risk
      const cascadeRisk = Math.max(0, deviation * 5); // 5% per minute

      // Possible causes
      const possibleCauses: string[] = [];
      if (anomalyType === 'extended') {
        possibleCauses.push('Platform occupancy delay');
        if (deviation > 8) {
          possibleCauses.push('Unexpected maintenance activity');
          possibleCauses.push('Crossing train regulation');
        }
      } else if (anomalyType === 'shortened') {
        possibleCauses.push('Reduced passenger loading');
        possibleCauses.push('Efficient platform turnover');
      }

      // Recommendations
      const recommendations: string[] = [];
      if (passengerImpact === 'high') {
        recommendations.push('Alert passengers in connecting trains');
        recommendations.push('Prepare alternative routing where available');
      }
      if (deviation > 10) {
        recommendations.push('Review station operations for optimizations');
      }

      return {
        stationId,
        stationName: this.getStationName(stationId),
        trainNumber,
        actualDwellTime: actualDwell,
        expectedDwellTime: profile.expected,
        deviation,
        deviationPercent,
        anomalyDetected: anomalyType !== 'none',
        anomalyType: anomalyType !== 'none' ? anomalyType : undefined,
        possibleCauses,
        passengerImpact,
        cascadeRiskLevel: Math.min(100, cascadeRisk),
        recommendations,
      };
    });
  }

  /**
   * Identify risk factors
   */
  private identifyRiskFactors(
    safetyWindows: SafetyWindow[],
    dwellAnomalies: DwellAnalysis[],
    connectionPassengers: number
  ): Array<{ factor: string; severity: 'low' | 'medium' | 'high'; affectedPassengers: number }> {
    const factors: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; affectedPassengers: number }> = [];

    // Check safety windows
    const criticalWindows = safetyWindows.filter((w) => w.riskLevel === 'critical').length;
    if (criticalWindows > 0) {
      factors.push({
        factor: `Critical connection windows detected (${criticalWindows})`,
        severity: 'high',
        affectedPassengers: Math.round(connectionPassengers * 0.3),
      });
    }

    // Check dwell anomalies
    const highImpactDwells = dwellAnomalies.filter((d) => d.passengerImpact === 'high').length;
    if (highImpactDwells > 0) {
      factors.push({
        factor: `High-impact dwell anomalies (${highImpactDwells} stations)`,
        severity: 'high',
        affectedPassengers: Math.round(connectionPassengers * 0.4),
      });
    }

    // Cascade risk
    const cascadeRisk = dwellAnomalies.reduce((sum, d) => sum + d.cascadeRiskLevel, 0) / dwellAnomalies.length;
    if (cascadeRisk > 30) {
      factors.push({
        factor: `High cascade risk potential (${cascadeRisk.toFixed(0)}%)`,
        severity: cascadeRisk > 60 ? 'high' : 'medium',
        affectedPassengers: Math.round(connectionPassengers * cascadeRisk * 0.01),
      });
    }

    if (factors.length === 0) {
      factors.push({
        factor: 'Normal operations - No significant risks detected',
        severity: 'low',
        affectedPassengers: 0,
      });
    }

    return factors;
  }

  /**
   * Calculate overall safety score
   */
  private calculateSafetyScore(
    riskFactors: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; affectedPassengers: number }>,
    dwellAnomalies: DwellAnalysis[]
  ): number {
    let score = 100;

    // Deduct for each risk factor
    riskFactors.forEach((rf) => {
      const deduction = rf.severity === 'high' ? 15 : rf.severity === 'medium' ? 10 : 2;
      score -= deduction;
    });

    // Deduct for dwell anomalies
    const avgCascadeRisk = dwellAnomalies.reduce((sum, d) => sum + d.cascadeRiskLevel, 0) / dwellAnomalies.length;
    score -= Math.min(20, avgCascadeRisk * 0.2);

    return Math.max(20, Math.round(score));
  }

  /**
   * Generate safety alerts
   */
  private generateSafetyAlerts(
    riskFactors: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; affectedPassengers: number }>,
    dwellAnomalies: DwellAnalysis[],
    safetyWindows: SafetyWindow[]
  ): string[] {
    const alerts: string[] = [];

    // High severity risks
    const highRisks = riskFactors.filter((r) => r.severity === 'high');
    if (highRisks.length > 0) {
      alerts.push(`⚠️ HIGH ALERT: ${highRisks.length} critical risk factor(s) detected`);
    }

    // Dwell anomalies affecting passengers
    const problematicDwells = dwellAnomalies.filter((d) => d.passengerImpact === 'high');
    if (problematicDwells.length > 0) {
      alerts.push(`⚠️ DWELL ANOMALY: ${problematicDwells.length} station(s) with significant delays`);
    }

    // Tight connection windows
    const tightWindows = safetyWindows.filter((w) => w.safetyMargin < 3);
    if (tightWindows.length > 0) {
      alerts.push(`⚠️ TIGHT CONNECTIONS: Limited safety margin in ${tightWindows.length} window(s)`);
    }

    if (alerts.length === 0) {
      alerts.push('✓ No critical alerts - Operations within normal parameters');
    }

    return alerts;
  }

  /**
   * Generate safety recommendations
   */
  private generateSafetyRecommendations(
    riskFactors: Array<{ factor: string; severity: 'low' | 'medium' | 'high'; affectedPassengers: number }>,
    dwellAnomalies: DwellAnalysis[],
    safetyScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (safetyScore < 40) {
      recommendations.push('Consider alternative routing for connecting passengers');
      recommendations.push('Increase staff deployment at connection stations');
      recommendations.push('Pre-board notifications recommended');
    } else if (safetyScore < 60) {
      recommendations.push('Monitor connection success rates closely');
      recommendations.push('Have contingency plans ready');
      recommendations.push('Alert operations to potential issues');
    }

    // Specific anomaly recommendations
    dwellAnomalies.forEach((d) => {
      if (d.recommendations.length > 0) {
        recommendations.push(...d.recommendations);
      }
    });

    // Cascade prevention
    const avgCascade = dwellAnomalies.reduce((sum, d) => sum + d.cascadeRiskLevel, 0) / dwellAnomalies.length;
    if (avgCascade > 40) {
      recommendations.push('Implement cascade prevention protocols');
      recommendations.push('Coordinate with downstream stations');
    }

    return [...new Set(recommendations)].slice(0, 5); // Deduplicate and limit to 5
  }

  /**
   * Get station name from ID
   */
  private getStationName(stationId: string): string {
    const names: Record<string, string> = {
      HYD: 'Hyderabad',
      SEC: 'Secunderabad',
      KZP: 'Kazipet',
      WGL: 'Warangal',
      VJA: 'Vijayawada',
      VSP: 'Visakhapatnam',
    };
    return names[stationId] || stationId;
  }

  /**
   * Get dwell profile for station
   */
  getDwellProfile(stationId: string) {
    return this.stationDwellProfiles.get(stationId) || { expected: 8, stdDev: 2 };
  }

  /**
   * Get connection requirement for station
   */
  getConnectionRequirement(stationId: string): number {
    return this.connectionRequirements.get(stationId) || 20;
  }
}

// Export singleton instance
export const passengerSafetyService = new PassengerSafetyService();
