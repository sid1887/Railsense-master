/**
 * Railway Section Intelligence Engine
 * Analyzes patterns across railway sections for delay prediction
 *
 * Indian Railways sections: Kazipet, South Central, Western, Central, etc.
 * Tracks: Historical delays, congestion patterns, peak hours
 */

export interface RailwaySection {
  code: string;
  name: string;
  startStation: string;
  endStation: string;
  distance: number; // in km
  trainsPerDay: number; // average daily traffic
  peakHours: number[]; // hours when congestion likely
  historicalDelay: number; // average delay in minutes
}

export interface SectionInsight {
  section: RailwaySection;
  delayTrend: 'improving' | 'stable' | 'worsening';
  currentCongestion: number; // 0-100
  expectedAdditionalDelay: number; // minutes
  peakHourMultiplier: number; // 1-3x
  explanation: string;
}

class RailwaySectionIntelligence {
  private sections: RailwaySection[] = [
    {
      code: 'SC',
      name: 'South Central Railway (Main)',
      startStation: 'Secunderabad',
      endStation: 'Hyderabad',
      distance: 15,
      trainsPerDay: 120,
      peakHours: [6, 7, 8, 9, 17, 18, 19, 20],
      historicalDelay: 3.2,
    },
    {
      code: 'BZA',
      name: 'Bezawada Section',
      startStation: 'Vijayawada',
      endStation: 'Kazipet',
      distance: 165,
      trainsPerDay: 45,
      peakHours: [8, 9, 10, 18, 19, 20],
      historicalDelay: 2.8,
    },
    {
      code: 'KZJ',
      name: 'Kazipet Junction Area',
      startStation: 'Kazipet',
      endStation: 'Warangal',
      distance: 85,
      trainsPerDay: 65,
      peakHours: [6, 7, 8, 9, 15, 16, 17, 18, 19, 20],
      historicalDelay: 4.5,
    },
    {
      code: 'NGPL',
      name: 'Nagpur Junction Area',
      startStation: 'Nagpur',
      endStation: 'Jabalpur',
      distance: 425,
      trainsPerDay: 35,
      peakHours: [6, 7, 8, 17, 18, 19],
      historicalDelay: 2.3,
    },
    {
      code: 'HYB',
      name: 'Hyderabad Junction Area',
      startStation: 'Hyderabad',
      endStation: 'Secunderabad',
      distance: 20,
      trainsPerDay: 180, // Most congested
      peakHours: [5, 6, 7, 8, 9, 10, 14, 15, 16, 17, 18, 19, 20, 21],
      historicalDelay: 5.7,
    },
  ];

  /**
   * Get section for current station
   */
  getSectionForStation(stationCode: string): RailwaySection | null {
    const stationUpper = stationCode.toUpperCase();

    // Map stations to sections
    const sectionMap: Record<string, string> = {
      HYB: 'HYB',
      SC: 'SC',
      VT: 'SC',
      CSTM: 'SC',
      KZJ: 'KZJ',
      BZA: 'BZA',
      NG: 'NGPL',
      JBP: 'NGPL',
      NDLS: 'SC', // Approximate
    };

    const sectionCode = sectionMap[stationUpper];
    return sectionCode ? this.sections.find(s => s.code === sectionCode) || null : null;
  }

  /**
   * Get detailed section insight for planning purposes
   */
  getSectionInsight(currentTime: Date, section: RailwaySection): SectionInsight {
    const hour = currentTime.getHours();
    const isPeakHour = section.peakHours.includes(hour);

    // Calculate congestion (0-100)
    let currentCongestion = 40; // Base line
    if (isPeakHour) {
      currentCongestion = 75;
    }

    // Historical pattern
    const dayOfWeek = currentTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (isWeekend) {
      currentCongestion -= 10; // Slightly less congestion on weekends
    }

    // Clamp
    currentCongestion = Math.max(0, Math.min(100, currentCongestion));

    // Peak hour multiplier
    const peakHourMultiplier = isPeakHour ? 2.5 : 1.0;

    // Expected additional delay
    const expectedAdditionalDelay = Math.round(section.historicalDelay * peakHourMultiplier);

    // Delay trend (simulated - in production would use real historical data)
    let delayTrend: 'improving' | 'stable' | 'worsening' = 'stable';
    if (currentCongestion > 70) {
      delayTrend = 'worsening';
    }

    const explanation =
      currentCongestion > 70
        ? `⚠️ High congestion on ${section.name}. Peak traffic hour with ${currentCongestion}% congestion. Expect ${expectedAdditionalDelay}min additional delay.`
        : `Normal traffic on ${section.name}. Current congestion: ${currentCongestion}%. Expected delay: ~${expectedAdditionalDelay}min.`;

    return {
      section,
      delayTrend,
      currentCongestion,
      expectedAdditionalDelay,
      peakHourMultiplier,
      explanation,
    };
  }

  /**
   * Predict delay for entire remaining journey
   */
  predictRemainingJourneyDelay(
    currentStation: any,
    destinationStation: any,
    remainingStations: any[],
    currentTime: Date
  ): { totalExpectedDelay: number; breakdown: SectionInsight[] } {
    const insights: SectionInsight[] = [];
    let totalDelay = 0;

    // For each remaining station segment, get section insight
    for (let i = 0; i < remainingStations.length - 1; i++) {
      const fromStation = remainingStations[i];
      const section = this.getSectionForStation(fromStation.code);

      if (section) {
        const insight = this.getSectionInsight(currentTime, section);
        insights.push(insight);
        totalDelay += insight.expectedAdditionalDelay;
      }
    }

    return {
      totalExpectedDelay: Math.round(totalDelay),
      breakdown: insights,
    };
  }

  /**
   * Get all sections (for UI dashboard)
   */
  getAllSections(): RailwaySection[] {
    return this.sections;
  }

  /**
   * Get congestion heatmap for entire network
   */
  getNetworkHeatmap(currentTime: Date): Record<string, number> {
    const heatmap: Record<string, number> = {};

    for (const section of this.sections) {
      const insight = this.getSectionInsight(currentTime, section);
      heatmap[section.code] = insight.currentCongestion;
    }

    return heatmap;
  }
}

const railwaySectionIntelligence = new RailwaySectionIntelligence();
export default railwaySectionIntelligence;
