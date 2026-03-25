/**
 * Delay Cascade & Priority Detection Service
 * Models and predicts ripple effects of delays through the network
 */

export interface DelayPropagation {
  affectedTrain: string;
  originalDelay: number; // minutes
  cascadedDelay: number; // additional delay from cascade
  totalDelay: number;
  propagationPath: string[]; // sections affected
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface PriorityConflict {
  highPriorityTrain: string;
  lowPriorityTrain: string;
  conflictLocation: string;
  estimatedWaitTime: number; // minutes
  delayFromConflict: number; // minutes
  severityScore: number; // 0-100
  isOnCriticalPath: boolean;
}

export interface CascadeAnalysis {
  sourceTrain: string;
  sourceDelay: number; // initial delay in minutes
  cascadeLevel: number; // 0-100, how severe cascade is
  affectedTrains: DelayPropagation[];
  priorityConflicts: PriorityConflict[];
  networkImpactScore: number; // 0-100
  cascadePeakTime: number; // when cascade reaches peak (timestamp)
  cascadeResolutionTime: number; // when system recovers (minutes)
  uncertaintyScore: number; // 0-100, how confident in prediction
  recommendations: string[];
}

/**
 * Delay Cascade & Priority Detection Service
 */
class CascadeService {
  private trainPriorities: Map<string, number> = new Map();
  private sectionConnectionGraph: Map<string, string[]> = new Map();
  private historicalCascadeRates: Map<string, number> = new Map();
  private trafficFlows: Map<string, number> = new Map(); // trains per hour per section

  constructor() {
    this.initializeTrainPriorities();
    this.initializeSectionGraph();
    this.initializeHistoricalRates();
    this.initializeTrafficFlows();
  }

  /**
   * Initialize train priority ordering
   */
  private initializeTrainPriorities() {
    // Higher number = higher priority
    this.trainPriorities.set('12723-RAJ', 95); // Rajdhani
    this.trainPriorities.set('12659-SHAB', 90); // Shatabdi
    this.trainPriorities.set('12809-SF', 80); // Superfast
    this.trainPriorities.set('12709-EXP', 60); // Express
    this.trainPriorities.set('11010-PASS', 40); // Passenger
    this.trainPriorities.set('12234-FRT', 20); // Freight

    // Generic priorities
    this.trainPriorities.set('rajdhani', 95);
    this.trainPriorities.set('shatabdi', 90);
    this.trainPriorities.set('superfast', 80);
    this.trainPriorities.set('express', 60);
    this.trainPriorities.set('passenger', 40);
    this.trainPriorities.set('freight', 20);
  }

  /**
   * Initialize section connection graph
   */
  private initializeSectionGraph() {
    // Define how sections connect (direction of propagation)
    this.sectionConnectionGraph.set('SEC-001', ['SEC-002']); // Hyderabad-Sec -> Sec-Kaz
    this.sectionConnectionGraph.set('SEC-002', ['SEC-003']); // Sec-Kaz -> Kaz-Wgl
    this.sectionConnectionGraph.set('SEC-003', ['SEC-002']); // Backward connection
    this.sectionConnectionGraph.set('SEC-004', ['SEC-005']); // Hyd-Vja -> Vja-Vsp
    this.sectionConnectionGraph.set('SEC-005', ['SEC-004']); // Backward
    this.sectionConnectionGraph.set('SEC-006', ['SEC-004']); // Hub connection
  }

  /**
   * Initialize historical cascade rates
   */
  private initializeHistoricalRates() {
    // Percentage of delay that propagates to next train
    this.historicalCascadeRates.set('SEC-001', 0.65); // 65% propagation
    this.historicalCascadeRates.set('SEC-002', 0.78); // High propagation (congested)
    this.historicalCascadeRates.set('SEC-003', 0.55);
    this.historicalCascadeRates.set('SEC-004', 0.72); // High propagation
    this.historicalCascadeRates.set('SEC-005', 0.60);
    this.historicalCascadeRates.set('SEC-006', 0.50);
  }

  /**
   * Initialize traffic flows
   */
  private initializeTrafficFlows() {
    this.trafficFlows.set('SEC-001', 12); // trains/hour
    this.trafficFlows.set('SEC-002', 8); // high congestion
    this.trafficFlows.set('SEC-003', 6);
    this.trafficFlows.set('SEC-004', 4); // lower traffic
    this.trafficFlows.set('SEC-005', 4);
    this.trafficFlows.set('SEC-006', 3);
  }

  /**
   * Analyze cascade effect from initial delay
   */
  analyzeCascade(
    sourceTrain: string,
    initialDelay: number,
    currentSection: string,
    affectedSectionCount: number = 3
  ): CascadeAnalysis {
    // Simulate trains in subsequent sections
    const affectedTrains = this.propagateDelay(
      sourceTrain,
      initialDelay,
      currentSection,
      affectedSectionCount
    );

    // Identify priority conflicts
    const conflicts = this.identifyPriorityConflicts(sourceTrain, affectedTrains);

    // Calculate cascade metrics
    const cascadeLevel = this.calculateCascadeLevel(affectedTrains, initialDelay);
    const networkImpact = this.calculateNetworkImpact(affectedTrains, conflicts);
    const peakTime = this.estimatePeakTime(affectedTrains);
    const resolutionTime = this.estimateResolutionTime(initialDelay, cascadeLevel);
    const uncertainty = this.estimateUncertainty(affectedTrains.length);

    // Generate recommendations
    const recommendations = this.generateCascadeRecommendations(
      cascadeLevel,
      conflicts,
      networkImpact
    );

    return {
      sourceTrain,
      sourceDelay: initialDelay,
      cascadeLevel,
      affectedTrains,
      priorityConflicts: conflicts,
      networkImpactScore: networkImpact,
      cascadePeakTime: peakTime,
      cascadeResolutionTime: resolutionTime,
      uncertaintyScore: uncertainty,
      recommendations,
    };
  }

  /**
   * Propagate delay to subsequent sections
   */
  private propagateDelay(
    sourceTrain: string,
    initialDelay: number,
    currentSection: string,
    steps: number
  ): DelayPropagation[] {
    const propagations: DelayPropagation[] = [];
    let currentDelay = initialDelay;
    let section = currentSection;
    const path = [section];

    for (let i = 0; i < steps; i++) {
      const nextSections = this.sectionConnectionGraph.get(section) || [];
      if (nextSections.length === 0) break;

      section = nextSections[0];
      path.push(section);

      // Calculate propagated delay
      const cascadeRate = this.historicalCascadeRates.get(section) || 0.6;
      const cascadedDelay = currentDelay * cascadeRate;
      const totalDelay = initialDelay + cascadedDelay;

      // Determine risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (totalDelay > 30) riskLevel = 'critical';
      else if (totalDelay > 20) riskLevel = 'high';
      else if (totalDelay > 10) riskLevel = 'medium';

      // Generate affected train name
      const affectedTrain = `Cascaded-${i + 1}`;

      propagations.push({
        affectedTrain,
        originalDelay: initialDelay,
        cascadedDelay: Math.round(cascadedDelay),
        totalDelay: Math.round(totalDelay),
        propagationPath: [...path],
        riskLevel,
      });

      currentDelay = cascadedDelay;
    }

    return propagations;
  }

  /**
   * Identify priority-based conflicts
   */
  private identifyPriorityConflicts(
    sourceTrain: string,
    affectedTrains: DelayPropagation[]
  ): PriorityConflict[] {
    const conflicts: PriorityConflict[] = [];

    const sourcePriority = this.trainPriorities.get(sourceTrain) || 60;

    // Simulate lower priority trains being delayed
    const priorities = Array.from(this.trainPriorities.entries()).filter(
      ([_, priority]) => priority < sourcePriority
    );

    for (let i = 0; i < Math.min(2, priorities.length); i++) {
      const [lowPriorityTrain, lowPriority] = priorities[i];
      const delayFromConflict = affectedTrains[0]?.totalDelay || 0;

      conflicts.push({
        highPriorityTrain: sourceTrain,
        lowPriorityTrain,
        conflictLocation: affectedTrains[0]?.propagationPath[0] || 'SEC-002',
        estimatedWaitTime: Math.round(10 + (delayFromConflict * (100 - lowPriority)) / 100),
        delayFromConflict,
        severityScore: Math.min(100, 50 + (sourcePriority - lowPriority) * 0.2),
        isOnCriticalPath: affectedTrains[0]?.riskLevel === 'critical',
      });
    }

    return conflicts;
  }

  /**
   * Calculate cascade level (0-100)
   */
  private calculateCascadeLevel(propagations: DelayPropagation[], initialDelay: number): number {
    if (propagations.length === 0) return 0;

    const avgCascadedDelay =
      propagations.reduce((sum, p) => sum + p.cascadedDelay, 0) / propagations.length;
    const cascadeRatio = avgCascadedDelay / initialDelay;
    const numHighRisk = propagations.filter((p) => p.riskLevel === 'critical' || p.riskLevel === 'high').length;

    // Combine factors
    const level = Math.min(
      100,
      cascadeRatio * 30 + numHighRisk * 20 + propagations.length * 5
    );

    return Math.round(level);
  }

  /**
   * Calculate network-wide impact
   */
  private calculateNetworkImpact(
    propagations: DelayPropagation[],
    conflicts: PriorityConflict[]
  ): number {
    let impact = 0;

    // Impact from propagated delays
    propagations.forEach((p) => {
      impact += p.riskLevel === 'critical' ? 20 : p.riskLevel === 'high' ? 15 : 5;
    });

    // Impact from priority conflicts
    impact += conflicts.length * 10;

    return Math.min(100, impact);
  }

  /**
   * Estimate when cascade reaches peak
   */
  private estimatePeakTime(propagations: DelayPropagation[]): number {
    // Peak occurs at longest propagation path
    const now = Date.now();
    const pathDepth = propagations.length;
    const minPerSection = 25; // typical section takes 25 minutes
    return now + pathDepth * minPerSection * 60000;
  }

  /**
   * Estimate resolution time
   */
  private estimateResolutionTime(initialDelay: number, cascadeLevel: number): number {
    // Base resolution = 1.5x initial delay
    const baseResolution = initialDelay * 1.5;

    // Add cascade factor (higher cascade = longer recovery)
    const cascadeFactor = (cascadeLevel / 100) * 30;

    return Math.round(baseResolution + cascadeFactor);
  }

  /**
   * Estimate prediction uncertainty
   */
  private estimateUncertainty(affectedTrainCount: number): number {
    // More trains affected = more uncertainty
    let uncertainty = 30; // Base 30%

    if (affectedTrainCount > 3) uncertainty += 20;
    if (affectedTrainCount > 5) uncertainty += 15;

    // Network complexity factor
    uncertainty += 10; // Always 10% extra for unknowns

    return Math.min(100, uncertainty);
  }

  /**
   * Generate cascade recommendations
   */
  private generateCascadeRecommendations(
    cascadeLevel: number,
    conflicts: PriorityConflict[],
    networkImpact: number
  ): string[] {
    const recommendations: string[] = [];

    if (cascadeLevel > 70) {
      recommendations.push('🚨 CRITICAL: Activate cascade mitigation protocols');
      recommendations.push('Adjust lineup to prevent further delays');
      recommendations.push('Consider emergency route diversions for low-priority trains');
    } else if (cascadeLevel > 50) {
      recommendations.push('⚠️ Alert network operations to potential cascade');
      recommendations.push('Pre-position recovery resources at affected stations');
      recommendations.push('Monitor for secondary cascades');
    } else if (cascadeLevel > 30) {
      recommendations.push('Monitor cascade development closely');
      recommendations.push('Have contingency plans ready');
    }

    if (conflicts.length > 0) {
      recommendations.push(
        `Manage ${conflicts.length} priority conflict(s) with intelligent scheduling`
      );
    }

    if (networkImpact > 60) {
      recommendations.push('Coordinate with passenger services for notifications');
      recommendations.push('Review connection impacts across the network');
    }

    return recommendations;
  }

  /**
   * Get train priority score
   */
  getTrainPriority(train: string): number {
    return this.trainPriorities.get(train) || 50;
  }

  /**
   * Compare train priorities
   */
  comparePriorities(train1: string, train2: string): number {
    const p1 = this.getTrainPriority(train1);
    const p2 = this.getTrainPriority(train2);
    return p1 - p2; // Positive = train1 higher priority
  }
}

// Export singleton instance
export const cascadeService = new CascadeService();
