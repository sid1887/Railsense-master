/**
 * Core type definitions for RailSense
 * Defines all data structures used throughout the application
 */

export interface TrainLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  // Track snapping metadata (optional)
  snappingDistance?: number; // km from original position
  trackSegmentId?: string; // ID of snapped track segment
  trackSegmentName?: string; // Name of snapped track segment
}

export type TrainDataSource = 'ntes' | 'railyatri' | 'schedule' | 'synthetic' | 'merged';

export interface TrainData {
  trainNumber: string;
  trainName: string;
  source: TrainDataSource;
  dataQuality: number; // 0-100 score
  isSynthetic: boolean;
  destination: string;
  currentLocation: TrainLocation;
  speed: number; // km/h, 0 if halted
  scheduledStations: Station[];
  currentStationIndex: number;
  currentStationCode: string; // Station code at current location
  delay: number; // minutes
  status?: string; // 'Running', 'On Time', 'Delayed', etc. from NTES
  lastUpdated: number; // timestamp of last update
}

export interface Station {
  name: string;
  code?: string; // Station code (added for timeline identification)
  scheduledArrival: string;
  estimatedArrival?: string;
  scheduledDeparture: string;
  estimatedDeparture?: string;
  latitude: number;
  longitude: number;
  isHalted?: boolean;
}

export interface HaltDetection {
  halted: boolean;
  haltDuration?: number; // minutes
  haltStartTime?: number;
  detectedAt?: TrainLocation;
  reason?: string;
}

export interface TrafficAnalysis {
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  nearbyTrainsCount: number;
  nearbyTrains: TrainInfo[];
  radiusKm: number;
}

export interface TrainInfo {
  trainNumber: string;
  trainName: string;
  distance: number; // km from reference train
  location: TrainLocation;
}

export interface PredictionResult {
  minWait: number; // minutes
  maxWait: number; // minutes
  confidence: number; // 0-100
  baseWait: number;
  trafficFactor: number;
  weatherFactor: number;
}

export type UncertaintyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UncertaintyIndex {
  level: UncertaintyLevel;
  score: number; // 0-100
  factors: {
    haltDuration: number;
    trafficDensity: number;
    weatherRisk: number;
  };
}

export interface PassengerInsight {
  headline: string;
  details: string;
  estimatedWait: string;
  uncertainty: UncertaintyLevel;
  recommendations: string[];
  timestamp: number;
}

export interface TrainInsightData {
  trainData: TrainData;
  haltDetection: HaltDetection;
  trafficAnalysis: TrafficAnalysis;
  prediction: PredictionResult;
  uncertainty: UncertaintyIndex;
  insight: PassengerInsight;
}

export interface WeatherData {
  temperature: number;
  condition: string;
  visibility: number;
  windSpeed: number;
  precipitation: boolean;
  code: string; // weather condition code
}

export interface RouteSection {
  startStation: Station;
  endStation: Station;
  typicalTravelTime: number; // minutes
  frequentHaltReasons: string[];
  congestionHistory: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * CANONICAL UNIFIED RESPONSE for all train detail endpoints
 * This is the single source of truth - all frontend queries use this
 */
export interface CanonicalTrainInsight {
  // MASTER CATALOG METADATA - from realTrainsDatabase
  trainNumber: string;
  trainName: string;
  sourceStation: string;
  destinationStation: string;
  zone: string;
  division: string;
  distance: number;
  maxSpeed: number;
  trainType: string;
  stationSequence: Station[];

  // LIVE OPERATIONAL DATA - from aggregated providers
  currentLocation: TrainLocation;
  currentSpeed: number; // km/h
  isHalted: boolean;
  haltReason?: string;
  haltConfidence?: number; // 0-100
  delay: number; // minutes
  expectedDelay: number; // predicted

  // Data quality metrics
  dataQuality: {
    overallScore: number; // 0-100
    source: string; // which provider gave us this
    locationDataAge: number; // seconds
    statusDataAge: number; // seconds
    isLiveData: boolean;
    isSynthetic: boolean;
    warnings: string[];
  };

  // Derived insights
  nearbyTrains: Array<{
    trainNumber: string;
    trainName: string;
    distanceKm: number;
    direction: string;
  }>;
  sectionCongestion: {
    currentSection: string;
    congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    trainsInSection: number;
  };
  prediction: {
    estimatedDelay: { min: number; max: number };
    estimatedWaitTime: { min: number; max: number };
    confidenceScore: number;
  };
  uncertainty: {
    level: UncertaintyLevel;
    score: number;
    factors: string[];
  };

  // Passenger-facing message
  passengerMessage: string;

  // Metadata
  timestamp: number;
  cacheAge?: number;
}

export interface FilteredTrain {
  trainNumber: string;
  trainName: string;
  speed: number;
  delay: number;
  status: 'moving' | 'delayed' | 'halted';
  region: string;
  distance: number;
  source?: string;
  sourceCode?: string;
  destination?: string;
  destinationCode?: string;
  zone?: string;
  division?: string;
  maxSpeed?: number;
  avgSpeed?: number;
  type?: string;
  lat?: number;
  lng?: number;
}
