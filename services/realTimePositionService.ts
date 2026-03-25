/**
 * Real-Time Train Position Service - ENHANCED
 * Generates LIVE train positions based on:
 * - Actual train schedules (departure/arrival times)
 * - Real route coordinates (intermediate stations)
 * - Current time with realistic speed variations
 * - Updates LIVE on every API call (not cached)
 */

import { getTrainByNumber, getAllTrains } from './realTrainsCatalog';

export interface TrainPosition {
  trainNumber: string;
  trainName: string;
  currentLat: number;
  currentLng: number;
  currentStation: string;
  currentStationCode: string;
  nextStation: string;
  nextStationCode: string;
  currentSpeed: number;
  distanceTraveled: number;
  totalDistance: number;
  percentageComplete: number;
  isMoving: boolean;
  lastUpdated: number;
  estimatedDelay: number;
  status: 'On Time' | 'Delayed' | 'Halted' | 'Approaching Station' | 'At Station';
}

class RealTimePositionService {
  private positions: Map<string, TrainPosition> = new Map();

  constructor() {
    this.initializePositions();
  }

  /**
   * CRITICAL: Calculate position based on ACTUAL SCHEDULE
   * This makes sure trains move realistically according to their departure times
   */
  private calculatePositionBySchedule(trainNumber: string): TrainPosition | null {
    const train = getTrainByNumber(trainNumber);
    if (!train || !train.stations || train.stations.length < 2) {
      return null;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Parse departure time (format: "HH:MM")
    const [depHour, depMin] = train.departureTime.split(':').map(Number);
    const departureTimeInMinutes = depHour * 60 + depMin;

    // Calculate journey progress (cyclical - repeats daily)
    let minutesSinceDeparture = (currentTimeInMinutes - departureTimeInMinutes + 1440) % 1440;

    // If train hasn't departed yet today, assume it departed yesterday
    if (currentTimeInMinutes < departureTimeInMinutes) {
      minutesSinceDeparture = currentTimeInMinutes + (1440 - departureTimeInMinutes);
    }

    const journeyProgress = Math.min(minutesSinceDeparture / train.duration, 1);
    const totalKmOnJourney = train.distance * journeyProgress;

    // Find current segment based on accumulated distance
    let currentSegmentIndex = 0;
    let accumulatedKm = 0;

    for (let i = 0; i < train.stations.length - 1; i++) {
      const stationKm = train.stations[i].km || (train.distance * i / (train.stations.length - 1));
      const nextStationKm = train.stations[i + 1].km || (train.distance * (i + 1) / (train.stations.length - 1));

      if (totalKmOnJourney >= stationKm && totalKmOnJourney < nextStationKm) {
        currentSegmentIndex = i;
        accumulatedKm = stationKm;
        break;
      }
    }

    const currentStation = train.stations[currentSegmentIndex];
    const nextStation = train.stations[Math.min(currentSegmentIndex + 1, train.stations.length - 1)];

    const segmentDistance = (nextStation.km || 0) - (currentStation.km || 0) || 1;
    const distanceInSegment = totalKmOnJourney - (currentStation.km || 0);
    const segmentProgress = Math.max(0, Math.min(1, distanceInSegment / segmentDistance));

    // LIVE POSITION: Interpolate between stations
    const currentLat = currentStation.lat + (nextStation.lat - currentStation.lat) * segmentProgress;
    const currentLng = currentStation.lng + (nextStation.lng - currentStation.lng) * segmentProgress;

    // Calculate realistic speed with variations
    const baseSpeed = train.avgSpeed;
    const timeIntoJourney = journeyProgress * Math.PI * 2;
    const speedVariation = Math.sin(timeIntoJourney) * 8; // ±8 km/h variation
    let currentSpeed = baseSpeed + speedVariation;

    // Slow down when approaching station
    const distToNextStation = ((nextStation.km || 0) - totalKmOnJourney);
    const isApproachingStation = distToNextStation < 3 && distToNextStation >= 0;
    if (isApproachingStation) {
      currentSpeed *= 0.6; // 40% speed when approaching
    }

    currentSpeed = Math.max(0, currentSpeed);

    // Determine status based on speed and distance
    let status: 'On Time' | 'Delayed' | 'Halted' | 'Approaching Station' | 'At Station' = 'On Time';
    if (isApproachingStation) {
      status = 'Approaching Station';
    } else if (currentSpeed < 1) {
      status = journeyProgress >= 0.95 ? 'At Station' : 'Halted';
    }

    // Simulate realistic delays (trains may be 5-15 minutes off schedule)
    const delayVariation = Math.sin((minutesSinceDeparture / 60) * 0.5) * 7;
    const estimatedDelay = Math.round(delayVariation);

    const position: TrainPosition = {
      trainNumber,
      trainName: train.trainName,
      currentLat: Math.round(currentLat * 100000) / 100000, // 5 decimal places
      currentLng: Math.round(currentLng * 100000) / 100000,
      currentStation: currentStation.name,
      currentStationCode: currentStation.code,
      nextStation: nextStation.name,
      nextStationCode: nextStation.code,
      currentSpeed: Math.round(currentSpeed * 10) / 10,
      distanceTraveled: Math.round(totalKmOnJourney),
      totalDistance: train.distance,
      percentageComplete: Math.round(journeyProgress * 100),
      isMoving: currentSpeed > 1,
      lastUpdated: Date.now(),
      estimatedDelay: estimatedDelay >= 0 ? estimatedDelay : Math.abs(estimatedDelay),
      status,
    };

    return position;
  }

  private initializePositions() {
    // Pre-calculate all positions on startup
    const allTrains = getAllTrains();
    allTrains.forEach((train) => {
      const trainNumber = train.trainNumber;
      const pos = this.calculatePositionBySchedule(trainNumber);
      if (pos) {
        this.positions.set(trainNumber, pos);
      }
    });
  }

  /**
   * Get train position - ALWAYS FRESH (live data, not cached)
   * Recalculates position based on current time
   */
  getPosition(trainNumber: string): TrainPosition | null {
    // Always recalculate based on current time - ensures LIVE data
    const freshPosition = this.calculatePositionBySchedule(trainNumber);
    if (freshPosition) {
      this.positions.set(trainNumber, freshPosition);
    }
    return freshPosition;
  }

  /**
   * Get all train positions - LIVE
   */
  getAllPositions(): TrainPosition[] {
    const allPositions: TrainPosition[] = [];
    const allTrains = getAllTrains();
    allTrains.forEach((train) => {
      const trainNumber = train.trainNumber;
      const pos = this.getPosition(trainNumber);
      if (pos) {
        allPositions.push(pos);
      }
    });
    return allPositions;
  }

  /**
   * Get trains in a geographic region - LIVE
   */
  getPositionsByRegion(lat: number, lng: number, radiusKm: number = 100): TrainPosition[] {
    const EARTH_RADIUS_KM = 6371;
    const allPositions = this.getAllPositions();

    return allPositions.filter((pos) => {
      const latDiff = (pos.currentLat - lat) * Math.PI / 180;
      const lngDiff = (pos.currentLng - lng) * Math.PI / 180;
      const a =
        Math.sin(latDiff / 2) * Math.sin(latDiff / 2) +
        Math.cos(lat * Math.PI / 180) *
          Math.cos(pos.currentLat * Math.PI / 180) *
          Math.sin(lngDiff / 2) *
          Math.sin(lngDiff / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = EARTH_RADIUS_KM * c;
      return distance <= radiusKm;
    });
  }

  /**
   * Get nearby trains - LIVE (fresh positions)
   */
  getNearbyTrains(trainNumber: string, radiusKm: number = 100): TrainPosition[] {
    const pos = this.getPosition(trainNumber);
    if (!pos) return [];

    return this.getPositionsByRegion(pos.currentLat, pos.currentLng, radiusKm).filter(
      (t) => t.trainNumber !== trainNumber
    );
  }

  /**
   * Refresh all positions (useful for forcing updates)
   */
  refreshAllPositions(): void {
    this.initializePositions();
  }
}

export const realTimePositionService = new RealTimePositionService();

export default realTimePositionService;
