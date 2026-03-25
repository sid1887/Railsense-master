/**
 * Enhanced Halt Reason Detection Engine
 * Detects WHY a train has halted and assigns confidence score
 *
 * Possible reasons:
 * - Signal hold (waiting for signal clearance)
 * - Traffic crossing (another train crossing path)
 * - Platform unavailable (destination platform occupied)
 * - Weather (rain, fog affecting visibility)
 * - Track block (maintenance, accident)
 * - Scheduling (planned halt at junction)
 * - Unexpected stop (system failure, emergency)
 */

import { TrainData } from '@/types/train';

export interface HaltReason {
  primaryReason: string;
  secondaryReasons: string[];
  confidence: number; // 0-100
  factors: HaltFactor[];
  explanation: string;
  requiredAction?: string;
  estimatedResolution?: string;
}

export interface HaltFactor {
  factor: string;
  weight: number; // 0-1
  evidence: string;
}

class HaltReasonDetector {
  /**
   * Analyze why train halted with confidence scoring
   */
  detectHaltReason(
    trainData: TrainData,
    currentStation: any,
    nearbyTrains: TrainData[],
    weatherData?: any,
    signals?: any[]
  ): HaltReason {
    const factors: HaltFactor[] = [];
    let confidence = 50; // Base confidence

    // Factor 1: Signal Analysis
    if (signals && signals.length > 0) {
      const signalFactor = this.analyzeSignals(signals);
      factors.push(signalFactor);
      confidence += signalFactor.weight * 20;
    }

    // Factor 2: Nearby Train Analysis (Traffic/Crossing)
    if (nearbyTrains && nearbyTrains.length > 0) {
      const trafficFactor = this.analyzeNearbyTrains(trainData, nearbyTrains, currentStation);
      factors.push(trafficFactor);
      confidence += trafficFactor.weight * 25;
    }

    // Factor 3: Station Analysis (Platform availability)
    if (currentStation) {
      const platformFactor = this.analyzeStation(currentStation);
      factors.push(platformFactor);
      confidence += platformFactor.weight * 15;
    }

    // Factor 4: Weather Impact
    if (weatherData) {
      const weatherFactor = this.analyzeWeather(weatherData);
      factors.push(weatherFactor);
      confidence += weatherFactor.weight * 10;
    }

    // Factor 5: Schedule Analysis
    const scheduleFactor = this.analyzeSchedule(trainData, currentStation);
    factors.push(scheduleFactor);
    confidence += scheduleFactor.weight * 20;

    // Determine primary and secondary reasons
    const rankedFactors = factors.sort((a, b) => b.weight - a.weight);
    const primaryReason = this.interpretReason(rankedFactors[0]?.factor || 'Unknown');
    const secondaryReasons = rankedFactors.slice(1, 3).map(f => this.interpretReason(f.factor));

    // Build explanation
    const explanation = this.buildExplanation(rankedFactors, primaryReason);

    // Clamp confidence 0-100
    confidence = Math.max(0, Math.min(100, Math.round(confidence)));

    return {
      primaryReason,
      secondaryReasons: secondaryReasons.filter(r => r && r !== primaryReason),
      confidence,
      factors: rankedFactors,
      explanation,
      requiredAction: this.determineAction(primaryReason),
      estimatedResolution: this.estimateResolution(primaryReason),
    };
  }

  /**
   * Analyze signal presence and status
   */
  private analyzeSignals(signals: any[]): HaltFactor {
    const redSignals = signals.filter(s => s.status === 'red').length;
    const weight = Math.min(redSignals / signals.length, 1);

    return {
      factor: 'signal_hold',
      weight,
      evidence: `${redSignals}/${signals.length} signals showing red/stop`,
    };
  }

  /**
   * Analyze nearby trains for potential crossings/traffic
   */
  private analyzeNearbyTrains(
    trainData: TrainData,
    nearbyTrains: TrainData[],
    currentStation: any
  ): HaltFactor {
    // Check for trains heading towards same station
    const incomingTrains = nearbyTrains.filter(t => {
      const dist = this.distance(
        t.currentLocation.latitude,
        t.currentLocation.longitude,
        currentStation?.lat,
        currentStation?.lng
      );
      return dist < 5 && t.speed > 0; // Within 5km and moving towards same station
    });

    const weight = Math.min(incomingTrains.length / 3, 1);

    return {
      factor: 'traffic_crossing',
      weight,
      evidence: `${incomingTrains.length} trains converging on current station`,
    };
  }

  /**
   * Analyze station conditions
   */
  private analyzeStation(currentStation: any): HaltFactor {
    // Check if station is a major junction (high traffic)
    const isMajorJunction = ['SC', 'HYB', 'BZA', 'NDLS', 'CSTM'].includes(currentStation.code);
    const weight = isMajorJunction ? 0.7 : 0.3;

    return {
      factor: 'platform_unavailable',
      weight,
      evidence: `Station: ${currentStation.name}${isMajorJunction ? ' (major junction)' : ''}`,
    };
  }

  /**
   * Analyze weather impact
   */
  private analyzeWeather(weather: any): HaltFactor {
    let weight = 0;
    let evidence = '';

    if (weather.precipitation) {
      weight += 0.4;
      evidence += 'Heavy rain/fog. ';
    }
    if (weather.windSpeed > 50) {
      weight += 0.3;
      evidence += 'High wind speed. ';
    }
    if (weather.visibility < 2) {
      weight += 0.3;
      evidence += 'Low visibility. ';
    }

    return {
      factor: 'weather_impact',
      weight: Math.min(weight, 1),
      evidence: evidence || 'Normal weather conditions',
    };
  }

  /**
   * Analyze against schedule
   */
  private analyzeSchedule(trainData: TrainData, currentStation: any): HaltFactor {
    // If train is at a scheduled major stop, this is expected
    const isMajorStop = ['SC', 'HYB', 'BZA', 'NDLS', 'CSTM', 'NG', 'VT'].includes(
      currentStation?.code
    );

    const weight = isMajorStop ? 0.8 : 0.2;

    return {
      factor: 'scheduled_halt',
      weight,
      evidence: isMajorStop ? 'Major junction - scheduled curfew' : 'Minor station stop',
    };
  }

  /**
   * Interpret technical factor into user-friendly reason
   */
  private interpretReason(factor: string): string {
    const reasons: Record<string, string> = {
      signal_hold: 'Waiting for signal clearance',
      traffic_crossing: 'Traffic regulation (trains crossing)',
      platform_unavailable: 'Platform unavailable',
      weather_impact: 'Weather-related disruption',
      scheduled_halt: 'Scheduled stop at junction',
      unexpected_stop: 'Unexpected mechanical stop',
      track_block: 'Track maintenance/blockage',
    };
    return reasons[factor] || 'Unknown reason';
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(factors: HaltFactor[], primaryReason: string): string {
    const topFactor = factors[0];
    const evidence = topFactor?.evidence || 'analyzing conditions';

    return `Train halted due to traffic regulation. Most likely: ${primaryReason}. Evidence: ${evidence}`;
  }

  /**
   * Determine required action
   */
  private determineAction(reason: string): string {
    if (reason.includes('signal')) return 'Wait for signal to turn green';
    if (reason.includes('Traffic')) return 'Wait for crossing train to pass';
    if (reason.includes('Platform')) return 'Wait for platform to become available';
    if (reason.includes('Weather')) return 'Wait for weather to improve';
    return 'Wait for clearance';
  }

  /**
   * Estimate resolution time
   */
  private estimateResolution(reason: string): string {
    if (reason.includes('signal')) return '2-5 minutes';
    if (reason.includes('Traffic')) return '3-8 minutes';
    if (reason.includes('Platform')) return '5-12 minutes';
    if (reason.includes('Weather')) return '10-30 minutes';
    if (reason.includes('scheduled')) return 'Scheduled stop';
    return '5-10 minutes';
  }

  /**
   * Haversine distance calculation
   */
  private distance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
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
}

const haltReasonDetector = new HaltReasonDetector();
export default haltReasonDetector;
