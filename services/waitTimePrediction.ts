/**
 * Wait Time Prediction Engine
 * Breaks down wait time into component parts:
 * - Base scheduled stop duration
 * - Traffic delay component
 * - Weather impact
 * - Delay carryover from previous journey
 * - Human factor (ticketing, passenger loading)
 */

export interface WaitTimeBreakdown {
  totalWaitTime: number; // minutes
  baseStopDuration: number; // scheduled stop time
  trafficDelay: number; // due to congestion
  weatherDelay: number; // due to weather
  delayCarryover: number; // accumulated from earlier in journey
  operationalDelay: number; // ticketing, platform prep, etc.
  confidence: number; // 0-100
  explanation: string;
  formula: string; // User-readable formula
}

class WaitTimePredictor {
  /**
   * Calculate breakdown of waiting time
   */
  predictWaitTime(
    currentStation: any,
    trainData: any,
    nearbyTrains: any[] = [],
    weatherData?: any,
    sectionInsight?: any
  ): WaitTimeBreakdown {
    // Component 1: Base scheduled stop duration
    const baseStopDuration = this.calculateBaseStopTime(currentStation);

    // Component 2: Traffic delay (from nearby trains)
    const trafficDelay = this.calculateTrafficDelay(nearbyTrains, currentStation);

    // Component 3: Weather impact
    const weatherDelay = this.calculateWeatherDelay(weatherData);

    // Component 4: Delay carryover (existing delay on train)
    const delayCarryover = Math.max(0, trainData.delay || 0);

    // Component 5: Operational delay (platform prep, ticketing, etc)
    const operationalDelay = this.calculateOperationalDelay(currentStation);

    // Sum components
    const totalWaitTime = Math.round(
      baseStopDuration + trafficDelay + weatherDelay + delayCarryover + operationalDelay
    );

    // Confidence decreases with more uncertainty
    let confidence = 75;
    if (weatherData?.severe) confidence -= 15;
    if (nearbyTrains?.length > 3) confidence -= 10;
    confidence = Math.max(0, Math.min(100, confidence));

    // Build explanation
    const explanation = this.buildExplanation(
      baseStopDuration,
      trafficDelay,
      weatherDelay,
      delayCarryover,
      operationalDelay
    );

    // Build formula
    const formula = this.buildFormula(
      baseStopDuration,
      trafficDelay,
      weatherDelay,
      delayCarryover,
      operationalDelay
    );

    return {
      totalWaitTime,
      baseStopDuration,
      trafficDelay,
      weatherDelay,
      delayCarryover,
      operationalDelay,
      confidence,
      explanation,
      formula,
    };
  }

  /**
   * Calculate base scheduled stop time for station
   */
  private calculateBaseStopTime(station: any): number {
    if (!station) return 5; // Default 5 min

    // Major junctions have longer stops
    const majorJunctions: Record<string, number> = {
      SC: 15, // Secunderabad
      HYB: 20, // Hyderabad
      BZA: 12, // Vijayawada
      NG: 15, // Nagpur
      VT: 15, // Victoria Terminus
      CSTM: 18,
      NDLS: 12,
      JBP: 10,
    };

    return majorJunctions[station.code] || 5;
  }

  /**
   * Calculate delay from nearby trains (traffic)
   */
  private calculateTrafficDelay(nearbyTrains: any[], station: any): number {
    if (!nearbyTrains || nearbyTrains.length === 0) return 0;

    // Count trains within 20km converging on this station
    const convergingTrains = nearbyTrains.filter(t => {
      const distKm = t.distanceFromCurrent || 20;
      const isMovingTowardStation = t.speed > 0;
      return distKm < 20 && isMovingTowardStation;
    });

    // Each converging train adds 1-3 min delay
    return Math.min(convergingTrains.length * 2, 12); // Max 12 min from traffic
  }

  /**
   * Calculate weather-related delay
   */
  private calculateWeatherDelay(weather?: any): number {
    if (!weather) return 0;

    let delay = 0;

    // Rain: +3-5 min (affects platform operations)
    if (weather.rain || weather.precipitation) {
      delay += 4;
    }

    // Fog/low visibility: +2-5 min (affects signal operations)
    if (weather.visibility && weather.visibility < 1) {
      delay += 4;
    }

    // High wind: +1-2 min (minor delays)
    if (weather.windSpeed > 50) {
      delay += 1;
    }

    return Math.min(delay, 10); // Max 10 min from weather
  }

  /**
   * Calculate operational delay (platform prep, ticketing)
   */
  private calculateOperationalDelay(station: any): number {
    // Smaller stations have faster turnover
    const baseOperational = 3;

    // Major stations need more time for passenger handling
    const isMajor = ['SC', 'HYB', 'BZA', 'NG', 'CSTM', 'NDLS'].includes(station?.code);

    return isMajor ? 6 : baseOperational;
  }

  /**
   * Build human-readable explanation
   */
  private buildExplanation(
    base: number,
    traffic: number,
    weather: number,
    carryover: number,
    operational: number
  ): string {
    const parts: string[] = [];

    if (base > 0) parts.push(`${base}min scheduled stop`);
    if (traffic > 0) parts.push(`${traffic}min for traffic regulation`);
    if (weather > 0) parts.push(`${weather}min weather impact`);
    if (carryover > 0) parts.push(`${carryover}min accumulated delay from earlier`);
    if (operational > 0) parts.push(`${operational}min platform operations`);

    return `Expected wait: ${parts.join(' + ')} = ${Math.round(base + traffic + weather + carryover + operational)}min`;
  }

  /**
   * Build user-friendly formula
   */
  private buildFormula(
    base: number,
    traffic: number,
    weather: number,
    carryover: number,
    operational: number
  ): string {
    const components = [];

    if (base > 0) components.push(`${base}min schedule`);
    if (traffic > 0) components.push(`+${traffic}min traffic`);
    if (weather > 0) components.push(`+${weather}min weather`);
    if (carryover > 0) components.push(`+${carryover}min prior delay`);
    if (operational > 0) components.push(`+${operational}min ops`);

    if (components.length === 0) return '~5 minutes (normal conditions)';

    const total = base + traffic + weather + carryover + operational;
    components.push(`= ${Math.round(total)}min`);

    return components.join(' ');
  }

  /**
   * Get wait time range (min-max) with confidence bars
   */
  getWaitTimeRange(
    breakdown: WaitTimeBreakdown
  ): { min: number; max: number; mostLikely: number; range: string } {
    // Apply confidence-based variance
    const variance = Math.max(
      breakdown.trafficDelay + breakdown.weatherDelay,
      breakdown.totalWaitTime * 0.2
    );

    return {
      min: Math.max(0, breakdown.totalWaitTime - variance),
      max: breakdown.totalWaitTime + variance,
      mostLikely: breakdown.totalWaitTime,
      range: `${Math.round(breakdown.totalWaitTime - variance)}–${Math.round(breakdown.totalWaitTime + variance)} minutes`,
    };
  }

  /**
   * Check if wait time is unusually long
   */
  isUnusualWait(breakdown: WaitTimeBreakdown): boolean {
    // Unusual if > 20 min or confidence < 40%
    return breakdown.totalWaitTime > 20 || breakdown.confidence < 40;
  }
}

const waitTimePredictor = new WaitTimePredictor();
export default waitTimePredictor;
