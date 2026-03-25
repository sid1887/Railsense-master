'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Unified Train Data Contract
 * All pages read from this single source of truth
 */
export interface TrainData {
  // Identity
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;

  // Route and live state
  route: RouteStop[];
  currentStationCode: string;
  currentStationName: string;
  nextStationCode: string;
  nextStationName: string;

  // GPS and movement
  lat: number;
  lng: number;
  speedKmph: number;
  delayMinutes: number;
  timestamp: string;

  // Live availability
  liveAvailable: boolean;
  liveProvider?: string;

  // Confidence metrics
  predictionConfidence: number;
  mapConfidence: number;
  dataQuality: number;
  safetyConfidence: number;

  // Quality metadata
  quality?: {
    staticDataQuality: number;
    liveDataQuality: number;
    predictionConfidence: number;
    mapConfidence: number;
    liveAvailable: boolean;
  };

  // Intelligence modules
  intelligence?: {
    delayRisk?: number;
    networkImpact?: number;
    safetyRisk?: number;
    explainabilityScore?: number;
    activeAlertsCount?: number;
  };
}

export interface RouteStop {
  code: string;
  name: string;
  arrivalTime: string;
  departureTime: string;
  status: 'completed' | 'current' | 'upcoming';
  platformNumber?: string;
  distance?: number;
}

export interface TrackedTrain {
  number: string;
  name: string;
  status: 'moving' | 'halted' | 'delayed';
  delayMinutes: number;
  currentStation: string;
  nextStation: string;
  speedKmph: number;
  confidence: number;
}

export interface TrainContextType {
  // Current selected train
  selectedTrainNumber: string | null;
  trainData: TrainData | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  selectTrain: (trainNumber: string) => Promise<void>;
  refreshData: () => Promise<void>;
  clearSelection: () => void;

  // Tracked trains list
  trackedTrains: TrackedTrain[];
  refreshTrackedTrains: () => Promise<void>;
}

const TrainContext = createContext<TrainContextType | undefined>(undefined);

export function TrainProvider({ children }: { children: React.ReactNode }) {
  const [selectedTrainNumber, setSelectedTrainNumber] = useState<string | null>(null);
  const [trainData, setTrainData] = useState<TrainData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackedTrains, setTrackedTrains] = useState<TrackedTrain[]>([]);

  const mapUnifiedToTrainData = (data: any): TrainData => {
    const stations = data?.route?.allStations || [];
    const currentIndex = Math.max(0, data?.route?.currentStationIndex || 0);

    const route: RouteStop[] = stations.map((station: any, index: number) => {
      let status: RouteStop['status'] = 'upcoming';
      if (index < currentIndex) status = 'completed';
      if (index === currentIndex) status = 'current';

      return {
        code: station.code || 'UNKNOWN',
        name: station.name || 'Unknown Station',
        arrivalTime: station.scheduledArrival || '--:--',
        departureTime: station.scheduledDeparture || '--:--',
        status,
      };
    });

    return {
      trainNumber: data?.trainNumber || '',
      trainName: data?.trainName || 'Unknown Train',
      source: data?.route?.source || 'Unknown',
      destination: data?.route?.destination || 'Unknown',
      route,
      currentStationCode: data?.currentLocation?.stationCode || 'UNKNOWN',
      currentStationName: data?.currentLocation?.station || 'Unknown',
      nextStationCode: data?.nextStation?.stationCode || 'UNKNOWN',
      nextStationName: data?.nextStation?.station || 'Unknown',
      lat: data?.currentLocation?.latitude || 0,
      lng: data?.currentLocation?.longitude || 0,
      speedKmph: data?.liveMetrics?.speed || 0,
      delayMinutes: data?.liveMetrics?.delay || 0,
      timestamp: new Date(data?.lastUpdated || Date.now()).toISOString(),
      liveAvailable: !data?.dataQuality?.liveUnavailable,
      liveProvider: Array.isArray(data?.dataQuality?.sources) ? data.dataQuality.sources[0] : undefined,
      predictionConfidence: data?.prediction?.confidence || 0,
      mapConfidence: data?.dataQuality?.liveGPS ? 0.9 : 0.5,
      dataQuality: data?.dataQuality?.stationMapping ? 0.9 : 0.6,
      safetyConfidence: data?.platformOccupancy?.waitingProbability
        ? Math.max(0.4, 1 - data.platformOccupancy.waitingProbability)
        : 0.7,
      quality: {
        staticDataQuality: data?.dataQuality?.stationMapping ? 0.9 : 0.6,
        liveDataQuality: data?.dataQuality?.liveGPS ? 0.9 : 0.45,
        predictionConfidence: data?.prediction?.confidence || 0,
        mapConfidence: data?.dataQuality?.liveGPS ? 0.9 : 0.5,
        liveAvailable: !data?.dataQuality?.liveUnavailable,
      },
      intelligence: {
        delayRisk: data?.liveMetrics?.delay || 0,
        networkImpact: data?.networkIntelligence?.congestionScore || 0,
        safetyRisk: data?.crossingRisk?.riskLevel === 'critical' ? 90 : data?.crossingRisk?.riskLevel === 'high' ? 70 : data?.crossingRisk?.riskLevel === 'medium' ? 45 : 20,
        explainabilityScore: data?.prediction?.confidence || 0,
        activeAlertsCount: (data?.crossingRisk?.riskLevel === 'high' || data?.crossingRisk?.riskLevel === 'critical') ? 1 : 0,
      },
    };
  };

  // Fetch train data from unified endpoint
  const selectTrain = async (trainNumber: string) => {
    if (!trainNumber.trim()) {
      setError('Invalid train number');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/train-details?trainNumber=${encodeURIComponent(trainNumber)}`);

      if (!response.ok) {
        throw new Error(`Train ${trainNumber} not found`);
      }

      const data = await response.json();
      setSelectedTrainNumber(trainNumber);
      setTrainData(mapUnifiedToTrainData(data));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch train data');
      setTrainData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh current train data
  const refreshData = async () => {
    if (!selectedTrainNumber) return;
    await selectTrain(selectedTrainNumber);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedTrainNumber(null);
    setTrainData(null);
    setError(null);
  };

  // Load tracked trains from backend
  const refreshTrackedTrains = async () => {
    try {
      const recentRaw = typeof window !== 'undefined' ? localStorage.getItem('recentTrainSearches') : null;
      const recent: Array<{ number?: string }> = recentRaw ? JSON.parse(recentRaw) : [];
      const trainNumbers: string[] = Array.from(
        new Set(
          recent
            .map((item: { number?: string }) => item?.number)
            .filter((value: string | undefined): value is string => Boolean(value))
        )
      ).slice(0, 6);

      if (trainNumbers.length === 0) {
        setTrackedTrains([]);
        return;
      }

      const results = await Promise.all(
        trainNumbers.map(async (number: string) => {
          try {
            const response = await fetch(`/api/train-details?trainNumber=${encodeURIComponent(number)}`);
            if (!response.ok) return null;
            const data = await response.json();
            return {
              number: data?.trainNumber || number,
              name: data?.trainName || `Train ${number}`,
              status: (data?.liveMetrics?.status === 'halted' ? 'halted' : data?.liveMetrics?.status === 'delayed' ? 'delayed' : 'moving') as TrackedTrain['status'],
              delayMinutes: data?.liveMetrics?.delay || 0,
              currentStation: data?.currentLocation?.station || 'Unknown',
              nextStation: data?.nextStation?.station || 'Unknown',
              speedKmph: data?.liveMetrics?.speed || 0,
              confidence: data?.prediction?.confidence || 0,
            } as TrackedTrain;
          } catch {
            return null;
          }
        })
      );

      setTrackedTrains(results.filter((item): item is TrackedTrain => item !== null));
    } catch (err) {
      console.error('Failed to fetch tracked trains:', err);
    }
  };

  // Load tracked trains on mount - DISABLED to prevent automatic polling loops
  // useEffect(() => {
  //   refreshTrackedTrains();
  // }, []);

  const value: TrainContextType = {
    selectedTrainNumber,
    trainData,
    isLoading,
    error,
    selectTrain,
    refreshData,
    clearSelection,
    trackedTrains,
    refreshTrackedTrains,
  };

  return <TrainContext.Provider value={value}>{children}</TrainContext.Provider>;
}

export function useTrainContext() {
  const context = useContext(TrainContext);
  if (!context) {
    throw new Error('useTrainContext must be used within a TrainProvider');
  }
  return context;
}
