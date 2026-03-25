/**
 * usePassengerAlerts Hook
 * Automatically generates alerts based on train predictions and journey data
 */

import { useEffect, useCallback } from 'react';
import { passengerAlertService } from '@/services/passengerAlertService';

export interface PassengerJourneyData {
  journeyId: string;
  trainNumber: string;
  boardingStation: string;
  boardingStationCode: string;
  alightingStation: string;
  alightingStationCode: string;
  boardingTime: number;
  expectedArrival: number;
}

export interface PredictionData {
  trainNumber: string;
  forecastDelay: number;
  eta: string;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
}

export function usePassengerAlerts(journey: PassengerJourneyData | null) {
  // Register journey
  useEffect(() => {
    if (!journey) return;

    passengerAlertService.registerJourney(journey.journeyId, {
      trainNumber: journey.trainNumber,
      boardingStation: journey.boardingStation,
      boardingStationCode: journey.boardingStationCode,
      alightingStation: journey.alightingStation,
      alightingStationCode: journey.alightingStationCode,
      boardingTime: journey.boardingTime,
      expectedArrival: journey.expectedArrival,
    });
  }, [journey?.journeyId]);

  /**
   * Check for connection miss based on prediction
   */
  const checkConnectionMiss = useCallback(
    (
      connectingTrain: string,
      boardingStation: string,
      boardingTime: number,
      estimatedArrival: number
    ) => {
      if (!journey) return;

      const buffer = boardingTime - estimatedArrival;
      if (buffer < 0) {
        // Will miss connection
        passengerAlertService.createConnectionMissAlert(
          journey.journeyId,
          connectingTrain,
          boardingStation,
          boardingTime,
          estimatedArrival
        );
      } else if (buffer < 300000) {
        // 5 minutes or less (tight connection)
        passengerAlertService.createConnectionTightAlert(
          journey.journeyId,
          connectingTrain,
          Math.floor(buffer / 60000) // Convert to minutes
        );
      }
    },
    [journey]
  );

  /**
   * Check delay warning
   */
  const checkDelayWarning = useCallback(
    (currentDelay: number, predictedDelay: number) => {
      if (!journey) return;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      if (predictedDelay > 30) {
        riskLevel = 'high';
      } else if (predictedDelay > 15) {
        riskLevel = 'medium';
      }

      if (riskLevel !== 'low') {
        passengerAlertService.createDelayWarningAlert(
          journey.journeyId,
          journey.trainNumber,
          currentDelay,
          predictedDelay,
          riskLevel
        );
      }
    },
    [journey]
  );

  /**
   * Check platform change
   */
  const checkPlatformChange = useCallback(
    (oldPlatform: string, newPlatform: string) => {
      if (!journey) return;

      passengerAlertService.createPlatformChangeAlert(
        journey.journeyId,
        journey.trainNumber,
        oldPlatform,
        newPlatform
      );
    },
    [journey]
  );

  /**
   * Check service disruption
   */
  const checkServiceDisruption = useCallback(
    (affectedSection: string, reason: string, estimatedDuration: number) => {
      if (!journey) return;

      passengerAlertService.createServiceDisruptionAlert(
        journey.journeyId,
        affectedSection,
        reason,
        estimatedDuration
      );
    },
    [journey]
  );

  return {
    checkConnectionMiss,
    checkDelayWarning,
    checkPlatformChange,
    checkServiceDisruption,
    getAlerts: () => passengerAlertService.getAlerts(),
  };
}

/**
 * Hook to evaluate journey based on prediction data
 * Automatically triggers appropriate alerts
 */
export function useJourneyEvaluation(
  journey: PassengerJourneyData | null,
  prediction: PredictionData | null,
  connections: Array<{
    trainNumber: string;
    boardingStation: string;
    boardingTime: number;
  }> = []
) {
  const { checkConnectionMiss, checkDelayWarning } = usePassengerAlerts(journey);

  useEffect(() => {
    if (!journey || !prediction) return;

    // Check for delay warnings
    checkDelayWarning(0, prediction.forecastDelay);

    // Check connection impact
    const estimatedArrival = journey.expectedArrival + prediction.forecastDelay * 60000;
    connections.forEach((conn) => {
      checkConnectionMiss(conn.trainNumber, conn.boardingStation, conn.boardingTime, estimatedArrival);
    });
  }, [journey, prediction, connections, checkDelayWarning, checkConnectionMiss]);
}
