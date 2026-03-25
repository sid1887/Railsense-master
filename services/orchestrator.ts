/**
 * Orchestrator Service
 * Coordinates all analytical services
 * Main entry point for getting complete train insights
 */

import { TrainInsightData } from '@/types/train';
import { getTrainData, getNearbyTrainsData, getMockConfig } from './trainDataService';
import { detectUnexpectedHalt, analyzeHalt } from './haltDetection';
import { analyzeTrafficAround } from './trafficAnalyzer';
import { predictNextWaitTime } from './predictionEngine';
import { calculateUncertaintyIndex, generatePassengerInsight } from './insightGenerator';

/**
 * Get complete insight data for a train
 * Runs all analyses and returns comprehensive results
 *
 * This function:
 * 1. Fetches train data
 * 2. Detects unusual halts
 * 3. Analyzes nearby traffic
 * 4. Predicts wait times
 * 5. Calculates uncertainty
 * 6. Generates passenger insights
 */
export async function getCompleteTrainInsight(trainNumber: string): Promise<TrainInsightData> {
  try {
    // Step 1: Fetch train data
    console.log(`[Orchestrator] Fetching data for train ${trainNumber}...`);
    const trainData = await getTrainData(trainNumber);

    if (!trainData) {
      throw new Error(`Train ${trainNumber} not found`);
    }

    // Step 2: Detect halt
    console.log('[Orchestrator] Analyzing halt status...');
    const haltDetection = detectUnexpectedHalt(trainData);

    // Step 3: Analyze traffic
    console.log('[Orchestrator] Analyzing nearby traffic...');
    const allTrains = await getNearbyTrainsData();
    const trafficAnalysis = await analyzeTrafficAround(trainData, allTrains);

    // Step 4: Get mock configuration (for weather and default factors)
    const config = await getMockConfig();
    const defaultWeather = config.defaultWeather;

    // Step 5: Predict wait time
    console.log('[Orchestrator] Predicting wait times...');
    const prediction = predictNextWaitTime(trainData, trafficAnalysis, defaultWeather);

    // Step 6: Calculate uncertainty
    console.log('[Orchestrator] Calculating uncertainty index...');
    const weatherRisk = defaultWeather.precipitation ? 40 : 20;
    const uncertainty = calculateUncertaintyIndex(haltDetection, trafficAnalysis, weatherRisk);

    // Step 7: Generate insight
    console.log('[Orchestrator] Generating passenger insight...');
    const insight = generatePassengerInsight(
      trainData,
      haltDetection,
      trafficAnalysis,
      prediction,
      uncertainty
    );

    const result: TrainInsightData = {
      trainData,
      haltDetection,
      trafficAnalysis,
      prediction,
      uncertainty,
      insight,
    };

    console.log('[Orchestrator] Complete insight generated successfully');
    return result;
  } catch (error) {
    console.error('[Orchestrator] Error generating insight:', error);
    throw error;
  }
}

/**
 * Get quickly (partial) insight data
 * Doesn't include traffic analysis - faster response
 */
export async function getQuickTrainInsight(trainNumber: string): Promise<Partial<TrainInsightData>> {
  try {
    const trainData = await getTrainData(trainNumber);

    if (!trainData) {
      throw new Error(`Train ${trainNumber} not found`);
    }

    const haltDetection = detectUnexpectedHalt(trainData);
    const config = await getMockConfig();

    // Create empty traffic for quick response
    const trafficAnalysis = {
      congestionLevel: 'LOW' as const,
      nearbyTrainsCount: 0,
      nearbyTrains: [],
      radiusKm: 5,
    };

    const prediction = predictNextWaitTime(trainData, trafficAnalysis, config.defaultWeather);
    const weatherRisk = config.defaultWeather.precipitation ? 40 : 20;
    const uncertainty = calculateUncertaintyIndex(haltDetection, trafficAnalysis, weatherRisk);
    const insight = generatePassengerInsight(
      trainData,
      haltDetection,
      trafficAnalysis,
      prediction,
      uncertainty
    );

    return {
      trainData,
      haltDetection,
      prediction,
      uncertainty,
      insight,
    };
  } catch (error) {
    console.error('[Orchestrator] Error in quick insight:', error);
    throw error;
  }
}

/**
 * Validate train data structure
 */
function validateTrainData(data: any): boolean {
  return (
    data &&
    data.trainNumber &&
    data.currentLocation &&
    Array.isArray(data.scheduledStations)
  );
}

/**
 * Get multiple train insights (for comparison/monitoring)
 */
export async function getMultipleTrainInsights(trainNumbers: string[]): Promise<TrainInsightData[]> {
  const insights: TrainInsightData[] = [];

  for (const trainNumber of trainNumbers) {
    try {
      const insight = await getCompleteTrainInsight(trainNumber);
      insights.push(insight);
    } catch (error) {
      console.warn(`Failed to get insight for train ${trainNumber}:`, error);
      // Continue with next train
    }
  }

  return insights;
}
