export type MovementState = 'running' | 'halted' | 'stopped' | 'stalled';

export interface Location {
  stationName: string;
  stationCode: string;
  latitude: number;
  longitude: number;
}

export interface HaltFactor {
  factor: string;
  weight: number;
  evidence: string;
}

export interface HaltReason {
  primaryReason: string;
  secondaryReasons: string[];
  explanation: string;
  factors: HaltFactor[];
  estimatedResolution?: string;
  confidence: number;
}

export interface HaltAnalysis {
  isHalted: boolean;
  reason?: HaltReason;
}

export interface WaitTimeBreakdown {
  baseStopDuration: number;
  trafficDelay: number;
  weatherDelay: number;
  delayCarryover: number;
  operationalDelay: number;
  totalWaitTime: number;
  confidence: number;
}

export interface WaitTimeRange {
  min: number;
  max: number;
}

export interface WaitTimePrediction {
  breakdown: WaitTimeBreakdown;
  range: WaitTimeRange;
  isUnusual: boolean;
}

export interface NearbyTrain {
  trainNumber: string;
  trainName: string;
  distance: number;
  movementState: MovementState;
}

export interface NearbyTrainsContext {
  count: number;
  trains: NearbyTrain[];
  congestion_level: 'LOW' | 'MEDIUM' | 'HIGH';
  same_section_count?: number;
}

export interface SectionAnalytics {
  networkHeatmap: Record<string, number>;
}

export interface MajorStop {
  stationName: string;
  stationCode?: string;
  distance: number;
  estimatedArrival: string;
}

export interface TrainAnalytics {
  trainNumber: string;
  trainName: string;
  movementState: MovementState;
  speed: number;
  delay: number;
  confidence: number;
  haltConfidence: number;
  destinationStation: string;
  currentLocation: Location;
  nextMajorStop?: MajorStop;
  haltAnalysis: HaltAnalysis;
  waitTimePrediction: WaitTimePrediction;
  nearbyTrains: NearbyTrainsContext;
  sectionAnalytics: SectionAnalytics;
  recommendedAction: string;
  lastUpdated: string;
}
