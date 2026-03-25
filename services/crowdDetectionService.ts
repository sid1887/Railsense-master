/**
 * Crowd Detection Service (via Search Analytics)
 * 
 * Converts search activity patterns into crowd presence predictions.
 * Uses the principle: "people searching for train status 5-30 mins before arrival
 * are likely at/near the station, indicating passenger crowding"
 */

import { SearchAnalytics, searchAnalyticsTracker } from './searchAnalyticsTracker';

export interface CrowdEstimation {
  trainNumber: string;
  crowdLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  crowdScore: number; // 0-100
  confidence: number; // 0-1 (confidence in this estimate)
  estimatedPassengersAtStation: number; // rough estimate
  safetyRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  insights: string[];
  recommendations: string[];
  dataQuality: {
    searchDataAvailable: boolean;
    dataAge: number; // milliseconds since last search
    sampleSize: number; // number of searches in analysis window
  };
}

interface CrowdThresholds {
  lowThreshold: number; // max searches for LOW crowd
  moderateThreshold: number; // max searches for MODERATE
  highThreshold: number; // max searches for HIGH
  criticalThreshold: number; // searches for CRITICAL
}

class CrowdDetectionService {
  // Empirical thresholds (can be tuned based on actual platform capacity)
  // These assume average platform capacity and typical search patterns
  private thresholds: CrowdThresholds = {
    lowThreshold: 5, // <5 searches in last 30 min = few people
    moderateThreshold: 20, // 5-20 searches = moderate crowd
    highThreshold: 50, // 20-50 searches = high crowd
    criticalThreshold: 50, // >50 searches = critical/dangerous crowding
  };

  /**
   * Estimate crowd level based on search analytics
   */
  estimateCrowd(trainNumber: string): CrowdEstimation {
    const analytics = searchAnalyticsTracker.getSearchAnalytics(trainNumber);
    const now = Date.now();

    // Calculate crowd score (0-100)
    const crowdScore = this.calculateCrowdScore(analytics);

    // Determine crowd level
    const crowdLevel = this.determineCrowdLevel(crowdScore);

    // Estimate actual passenger count (rough proxy)
    const estimatedPassengers = this.estimatePassengerCount(analytics, crowdScore);

    // Determine safety risk
    const safetyRisk = this.assessSafetyRisk(crowdLevel, crowdScore, analytics);

    // Generate insights
    const insights = this.generateInsights(analytics, crowdLevel, crowdScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(crowdLevel, safetyRisk, estimatedPassengers);

    // Calculate data quality
    const mostRecentSearch = analytics.peakSearchTime || 0;
    const dataAge = mostRecentSearch > 0 ? now - mostRecentSearch : Infinity;

    return {
      trainNumber,
      crowdLevel,
      crowdScore,
      confidence: this.calculateConfidence(analytics),
      estimatedPassengersAtStation: estimatedPassengers,
      safetyRisk,
      insights,
      recommendations,
      dataQuality: {
        searchDataAvailable: analytics.searchesLast30Min > 0,
        dataAge,
        sampleSize: analytics.searchesLast30Min,
      },
    };
  }

  /**
   * Calculate a 0-100 crowd score from search analytics
   */
  private calculateCrowdScore(analytics: SearchAnalytics): number {
    const searches = analytics.searchesLast30Min;
    const recentSearches = analytics.searchesLast5Min;
    const trend = analytics.searchTrendDirection;

    // Base score from absolute search count
    let score = Math.min(100, (searches / this.thresholds.criticalThreshold) * 100);

    // Boost score if trend is increasing (more people joining)
    if (trend === 'increasing') {
      score = Math.min(100, score * 1.2);
    } else if (trend === 'decreasing') {
      score = Math.max(0, score * 0.8);
    }

    // Extra boost if searches are concentrated recently (people coming NOW)
    const recentConcentration = recentSearches / Math.max(1, searches);
    if (recentConcentration > 0.5) {
      score = Math.min(100, score + 10);
    }

    // Accuracy bonus for exact train number matches (reduces noise)
    const exactMatchRatio = analytics.uniqueSearchPatterns.exactMatches / Math.max(1, searches);
    if (exactMatchRatio > 0.8) {
      score = Math.min(100, score * 1.1); // 10% confidence boost
    }

    return Math.round(score);
  }

  /**
   * Map crowd score to categorical level
   */
  private determineCrowdLevel(score: number): CrowdEstimation['crowdLevel'] {
    if (score >= 75) return 'CRITICAL';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  }

  /**
   * Rough estimate of passengers based on search activity
   * Assumption: ~30-40% of passengers search for train before boarding
   */
  private estimatePassengerCount(analytics: SearchAnalytics, crowdScore: number): number {
    // Base estimate: assume 30-40% search rate
    const searchUserCount = analytics.searchesLast30Min / 0.35; // reverse engineer from search %

    // Cap at reasonable platform capacity (typical platform: 500-2000 passengers)
    return Math.min(2000, Math.round(searchUserCount));
  }

  /**
   * Assess safety risk from crowding
   */
  private assessSafetyRisk(crowdLevel: CrowdEstimation['crowdLevel'], score: number, analytics: SearchAnalytics): CrowdEstimation['safetyRisk'] {
    if (crowdLevel === 'CRITICAL') return 'CRITICAL';
    if (crowdLevel === 'HIGH') return 'HIGH';
    if (crowdLevel === 'MODERATE') return 'MEDIUM';

    // Even at LOW crowds, check for anomalies that might indicate risk
    if (analytics.searchTrendDirection === 'increasing' && score > 15) {
      return 'MEDIUM';
    }

    return 'LOW';
  }

  /**
   * Calculate confidence in the crowd estimate (0-1)
   */
  private calculateConfidence(analytics: SearchAnalytics): number {
    let confidence = 0.5; // baseline

    // More searches = higher confidence, up to a point
    const searchConfidence = Math.min(1, analytics.searchesLast30Min / 50);
    confidence += searchConfidence * 0.3;

    // Higher exact match ratio = higher confidence (less noise)
    const totalSearches = analytics.uniqueSearchPatterns.exactMatches +
      analytics.uniqueSearchPatterns.partialMatches +
      analytics.uniqueSearchPatterns.stationBased;
    if (totalSearches > 0) {
      const exactRatio = analytics.uniqueSearchPatterns.exactMatches / totalSearches;
      confidence += exactRatio * 0.2;
    }

    // Recent data = higher confidence
    if (analytics.searchesLast5Min > 0) {
      confidence += 0.1;
    }

    return Math.min(1, confidence);
  }

  /**
   * Generate human-readable insights about crowd
   */
  private generateInsights(analytics: SearchAnalytics, crowdLevel: CrowdEstimation['crowdLevel'], score: number): string[] {
    const insights: string[] = [];

    if (analytics.searchesLast30Min === 0) {
      insights.push('No recent search activity detected for this train.');
      return insights;
    }

    // Trend insights
    if (analytics.searchTrendDirection === 'increasing') {
      insights.push('📈 Search activity is increasing - more passengers arriving at station');
    } else if (analytics.searchTrendDirection === 'decreasing') {
      insights.push('📉 Search activity is decreasing - passenger inflow stabilizing');
    } else {
      insights.push('➡️ Search activity remains stable');
    }

    // Crowd level insights
    if (crowdLevel === 'CRITICAL') {
      insights.push('⚠️ CRITICAL: Extremely high search volume indicates severe crowding');
      insights.push('🚨 Platform safety may be at risk due to excessive passenger density');
    } else if (crowdLevel === 'HIGH') {
      insights.push('🔴 HIGH: Significant crowd presence detected at station');
      insights.push('⚠️ Expect congested boarding conditions');
    } else if (crowdLevel === 'MODERATE') {
      insights.push('🟡 MODERATE: Typical passenger presence for this train');
      insights.push('Boarding may take slightly longer');
    } else {
      insights.push('🟢 LOW: Minimal crowd detected - platform conditions good');
      insights.push('Smooth boarding expected');
    }

    // Time-based insights
    const recentConcentration = analytics.searchesLast5Min / Math.max(1, analytics.searchesLast30Min);
    if (recentConcentration > 0.6) {
      insights.push(`📱 ${Math.round(recentConcentration * 100)}% of searches were in the last 5 minutes - crowd arriving NOW`);
    }

    // Data quality insights
    const exactRatio = analytics.uniqueSearchPatterns.exactMatches / Math.max(1, analytics.searchesLast30Min);
    if (exactRatio < 0.7) {
      insights.push('ℹ️ Note: Contains ~' + Math.round((1 - exactRatio) * 100) + '% noise (partial matches/typos) - confidence slightly lower');
    }

    return insights;
  }

  /**
   * Generate actionable recommendations for passengers
   */
  private generateRecommendations(crowdLevel: CrowdEstimation['crowdLevel'], safetyRisk: CrowdEstimation['safetyRisk'], passengers: number): string[] {
    const recommendations: string[] = [];

    if (crowdLevel === 'CRITICAL' || safetyRisk === 'CRITICAL') {
      recommendations.push('🚨 AVOID boarding if possible - wait for next service');
      recommendations.push('If boarding: Avoid extreme ends of platform, stay near exit');
      recommendations.push('Keep valuables secure - increased pickpocketing risk in crowds');
      recommendations.push('Ensure good grip on handholds - risk of being jostled');
      recommendations.push('Contact platform staff if you feel unsafe');
      return recommendations;
    }

    if (crowdLevel === 'HIGH' || safetyRisk === 'HIGH') {
      recommendations.push('⚠️ Expect tight boarding conditions');
      recommendations.push('Arrive early and position yourself strategically');
      recommendations.push('Keep belongings close and secure');
      recommendations.push('Be prepared for slower movement through coaches');
    } else if (crowdLevel === 'MODERATE') {
      recommendations.push('✅ Standard boarding - typical comfort levels');
      recommendations.push('Arrive 5 minutes early for relaxed boarding');
    } else {
      recommendations.push('✅ Platform conditions are excellent');
      recommendations.push('Take your time - no rush for boarding');
      recommendations.push('Comfortable journey expected');
    }

    return recommendations;
  }
}

export const crowdDetectionService = new CrowdDetectionService();
