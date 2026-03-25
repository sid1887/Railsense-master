import sqlite3 from 'sqlite3';
import path from 'path';
import { ntesProvider } from './providers/ntesProvider';
import { crowdDetectionService } from './crowdDetectionService';
import { getNearbyTrainsData, getTrainData } from './trainDataService';

const NTES_BASE_URL = process.env.NTES_BASE_URL || 'https://enquiry.indianrail.gov.in';
const REQUEST_TIMEOUT_MS = Number(process.env.NTES_INTELLIGENCE_TIMEOUT_MS || 7000);

export interface TrainStatusInsight {
  trainNumber: string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'HALTED' | 'UNKNOWN';
  delayMinutes: number;
  currentStation: string;
  nextStation: string;
  coordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  freshnessSeconds?: number;
  source: string;
  interpretedInsights: string[];
  timestamp: string;
}

export interface StationLiveInsight {
  stationCode: string;
  stationName: string;
  totalActiveTrains: number;
  incomingTrains: Array<{
    trainNumber: string;
    delayMinutes: number;
    speed: number;
    status: string;
    lastSeen: string;
  }>;
  outgoingTrains: Array<{
    trainNumber: string;
    delayMinutes: number;
    speed: number;
    status: string;
    lastSeen: string;
  }>;
  platformTrains: Array<{
    trainNumber: string;
    delayMinutes: number;
    speed: number;
    status: string;
    lastSeen: string;
  }>;
  congestionLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
  source: string;
  timestamp: string;
}

export interface TrainScheduleInsight {
  trainNumber: string;
  trainName: string;
  source: string;
  destination: string;
  totalStations: number;
  route: Array<{
    stationCode: string;
    stationName: string;
    scheduledArrival: string;
    scheduledDeparture: string;
  }>;
  sourceType: string;
  timestamp: string;
}

export interface ExceptionInsight {
  trainNumber: string;
  hasException: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  items: Array<{
    type: 'delay' | 'cancellation' | 'diversion' | 'halt';
    message: string;
    confidence: number;
  }>;
  source: string;
  timestamp: string;
}

export interface TrainsBetweenInsight {
  fromStationCode: string;
  toStationCode: string;
  totalTrains: number;
  trains: Array<{
    trainNumber: string;
    trainName?: string;
    status?: string;
    delayMinutes?: number;
  }>;
  source: string;
  timestamp: string;
}

export interface SpeedEstimationInsight {
  estimatedSpeedKmph: number;
  basis: 'station-distance-time' | 'fallback';
  fromStationCode?: string;
  toStationCode?: string;
  distanceKm?: number;
  timeDiffMinutes?: number;
}

export interface TimeSignalInsight {
  lastUpdated: string;
  runningLateMinutes: number;
  nextScheduledArrival: string;
  expectedArrival: string;
}

export interface DataQualityInsight {
  confidence: number;
  sourceReliability: 'LOW' | 'MEDIUM' | 'HIGH';
  latencyMs: number;
  validFields: number;
  totalFields: number;
  missingFields: string[];
  successfulSignals: number;
  totalSignals: number;
  primarySource: string;
}

export interface NetworkComputationInsight {
  sectionLoad: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  congestionScore: number;
  trainsBetween: number;
  nearbyTrains: number;
  message: string;
}

export interface HaltComputationInsight {
  detected: boolean;
  status: string;
  reason: string;
  delayTrend: 'INCREASING' | 'STABLE' | 'DECREASING';
  positionUnchanged: boolean;
}

export interface ExplainabilityInsight {
  confidence: number;
  reasons: string[];
}

export interface PassengerSafetyInsight {
  risk: 'LOW' | 'MODERATE' | 'HIGH';
  discomfortScore: number;
  message: string;
}

export interface CascadeDetectionInsight {
  detected: boolean;
  risk: 'LOW' | 'MODERATE' | 'HIGH';
  affectedTrains: number;
  message: string;
}

export interface IntelligenceInsight {
  trainNumber: string;
  speed: number;
  delay: number;
  expectedArrival: string;
  lastUpdated: string;
  runningLateMinutes: number;
  crowdLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  crowdScore: number;
  confidence: number;
  haltStatus: string;
  haltReason: string;
  safety: string;
  safetyStatus: 'NORMAL' | 'ELEVATED' | 'HIGH_RISK';
  modules: {
    trainStatus: TrainStatusInsight;
    stationLive: StationLiveInsight;
    exceptions: ExceptionInsight;
    trainsBetween?: TrainsBetweenInsight;
    speedEstimation: SpeedEstimationInsight;
    timeSignals: TimeSignalInsight;
    dataQuality: DataQualityInsight;
    networkIntelligence: NetworkComputationInsight;
    haltAnalysis: HaltComputationInsight;
    explainability: ExplainabilityInsight;
    passengerSafety: PassengerSafetyInsight;
    cascadeDetection: CascadeDetectionInsight;
  };
  interpretedInsights: string[];
  timestamp: string;
}

interface SnapshotRow {
  trainNumber: string;
  stationCode: string;
  stationName: string;
  latitude: number;
  longitude: number;
  speed: number;
  delay: number;
  status: string;
  timestamp: string;
}

function formatNtesRefDate(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()] || 'Jan';
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function resolveTemplate(template: string, params: Record<string, string>): string {
  let url = template;
  for (const [key, value] of Object.entries(params)) {
    url = url.replace(new RegExp(`\\{${key}\\}`, 'g'), encodeURIComponent(value));
  }
  return url;
}

async function bootstrapNtesCookie(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(`${NTES_BASE_URL}/mntes/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const getSetCookie = (response.headers as any).getSetCookie;
    if (typeof getSetCookie !== 'function') return null;

    const cookies: string[] = getSetCookie.call(response.headers) || [];
    if (!cookies.length) return null;

    return cookies
      .map((cookie) => cookie.split(';')[0]?.trim())
      .filter(Boolean)
      .join('; ');
  } catch {
    return null;
  }
}

async function fetchNtesTemplatePayload(template: string, params: Record<string, string>): Promise<any | null> {
  try {
    const url = resolveTemplate(template, params);
    const cookie = await bootstrapNtesCookie();

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': `${NTES_BASE_URL}/mntes/`,
        'X-Requested-With': 'XMLHttpRequest',
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    clearTimeout(timeout);

    if (!response.ok) return null;
    const text = await response.text();
    if (!text?.trim()) return null;

    const direct = safeJsonParse(text.trim());
    if (direct !== null) return direct;

    return extractJsonLikePayload(text);
  } catch {
    return null;
  }
}

function safeJsonParse(value: string): any | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonLikePayload(text: string): any | null {
  const chunks = text.match(/\{[\s\S]{20,2000}?\}/g) || [];
  for (const chunk of chunks.slice(0, 50)) {
    const parsed = safeJsonParse(chunk);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  }
  return null;
}

function readByPath(source: any, pathKey: string): any {
  const parts = pathKey.split('.');
  let cursor = source;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function pickNumber(source: any, paths: string[]): number | null {
  for (const pathKey of paths) {
    const value = readByPath(source, pathKey);
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[^0-9.-]/g, ''));
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function pickString(source: any, paths: string[]): string | null {
  for (const pathKey of paths) {
    const value = readByPath(source, pathKey);
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function normalizeStationCode(value: string | null | undefined): string {
  return String(value || '').trim().toUpperCase();
}

function inferStationCodeFromLabel(label: string): string | null {
  if (!label) return null;

  const dashParts = label.split('-').map((part) => part.trim()).filter(Boolean);
  if (dashParts.length >= 2) {
    const candidate = normalizeStationCode(dashParts[dashParts.length - 1]);
    if (/^[A-Z0-9]{2,6}$/.test(candidate)) {
      return candidate;
    }
  }

  const parenMatch = label.match(/\(([A-Z0-9]{2,6})\)/i);
  if (parenMatch?.[1]) {
    const candidate = normalizeStationCode(parenMatch[1]);
    if (/^[A-Z0-9]{2,6}$/.test(candidate)) {
      return candidate;
    }
  }

  return null;
}

function normalizeStationName(value: string | null | undefined): string {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findRouteIndexByStationToken(
  route: TrainScheduleInsight['route'],
  token: string | null | undefined
): number {
  const trimmed = String(token || '').trim();
  if (!trimmed) return -1;

  const normalizedCode = normalizeStationCode(trimmed);
  const normalizedName = normalizeStationName(trimmed);

  for (let i = 0; i < route.length; i += 1) {
    const stop = route[i];
    const stopCode = normalizeStationCode(stop.stationCode);
    const stopName = normalizeStationName(stop.stationName);
    if (normalizedCode && stopCode === normalizedCode) {
      return i;
    }
    if (normalizedName && (stopName.includes(normalizedName) || normalizedName.includes(stopName))) {
      return i;
    }
  }

  return -1;
}

function inferSegmentFromSchedule(
  schedule: TrainScheduleInsight | null,
  currentStation: string,
  nextStation: string
): { fromStationCode: string; toStationCode: string } | null {
  if (!schedule?.route?.length) {
    return null;
  }

  const currentToken = inferStationCodeFromLabel(currentStation) || currentStation;
  const nextToken = inferStationCodeFromLabel(nextStation) || nextStation;

  let fromIndex = findRouteIndexByStationToken(schedule.route, currentToken);
  let toIndex = findRouteIndexByStationToken(schedule.route, nextToken);

  if (fromIndex < 0 && toIndex > 0) {
    fromIndex = toIndex - 1;
  }
  if (fromIndex < 0) {
    fromIndex = 0;
  }
  if (toIndex <= fromIndex) {
    toIndex = Math.min(fromIndex + 1, schedule.route.length - 1);
  }
  if (toIndex <= fromIndex) {
    return null;
  }

  const fromStationCode = normalizeStationCode(schedule.route[fromIndex]?.stationCode);
  const toStationCode = normalizeStationCode(schedule.route[toIndex]?.stationCode);
  if (!fromStationCode || !toStationCode || fromStationCode === toStationCode) {
    return null;
  }

  return { fromStationCode, toStationCode };
}

function resolveCongestion(totalTrains: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE' {
  if (totalTrains >= 12) return 'SEVERE';
  if (totalTrains >= 8) return 'HIGH';
  if (totalTrains >= 4) return 'MEDIUM';
  return 'LOW';
}

function resolveCrowdLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (score >= 75) return 'CRITICAL';
  if (score >= 55) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

function resolveSafetyStatus(
  delay: number,
  crowdScore: number,
  severity: ExceptionInsight['severity']
): 'NORMAL' | 'ELEVATED' | 'HIGH_RISK' {
  if (severity === 'critical' || severity === 'high') {
    return 'HIGH_RISK';
  }
  if ((delay >= 35 && crowdScore >= 45) || crowdScore >= 75) {
    return 'HIGH_RISK';
  }
  if (delay >= 15 || crowdScore >= 35 || severity === 'medium') {
    return 'ELEVATED';
  }
  return 'NORMAL';
}

function parseClockToMinutes(value: string | null | undefined): number | null {
  const normalized = String(value || '').trim();
  if (!normalized || normalized === '--:--') return null;
  const match = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
}

function formatMinutesToClock(totalMinutes: number): string {
  const minutesInDay = 24 * 60;
  const normalized = ((Math.round(totalMinutes) % minutesInDay) + minutesInDay) % minutesInDay;
  const hour = String(Math.floor(normalized / 60)).padStart(2, '0');
  const minute = String(normalized % 60).padStart(2, '0');
  return `${hour}:${minute}`;
}

function addDelayToClock(scheduledTime: string, delayMinutes: number): string {
  const base = parseClockToMinutes(scheduledTime);
  if (base === null) return '--:--';
  return formatMinutesToClock(base + Math.max(0, Math.round(delayMinutes)));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function resolveSourceReliability(confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (confidence >= 80) return 'HIGH';
  if (confidence >= 60) return 'MEDIUM';
  return 'LOW';
}

function resolveSectionLoad(score: number): NetworkComputationInsight['sectionLoad'] {
  if (score >= 75) return 'SEVERE';
  if (score >= 55) return 'HIGH';
  if (score >= 30) return 'MODERATE';
  return 'LOW';
}

function estimateSpeedFromSchedule(trainData: any): SpeedEstimationInsight {
  const stops = Array.isArray(trainData?.scheduledStations) ? trainData.scheduledStations : [];
  if (stops.length >= 2) {
    const currentIndex = Math.max(0, Math.min(Number(trainData?.currentStationIndex || 0), stops.length - 1));
    const nextIndex = Math.min(currentIndex + 1, stops.length - 1);

    if (nextIndex > currentIndex) {
      const currentStop = stops[currentIndex];
      const nextStop = stops[nextIndex];

      const depMinutes = parseClockToMinutes(
        currentStop?.scheduledDeparture || currentStop?.estimatedDeparture || currentStop?.scheduledArrival
      );
      const arrMinutes = parseClockToMinutes(
        nextStop?.scheduledArrival || nextStop?.estimatedArrival || nextStop?.scheduledDeparture
      );

      const lat1 = Number(currentStop?.latitude);
      const lon1 = Number(currentStop?.longitude);
      const lat2 = Number(nextStop?.latitude);
      const lon2 = Number(nextStop?.longitude);

      if (
        depMinutes !== null &&
        arrMinutes !== null &&
        Number.isFinite(lat1) && Number.isFinite(lon1) &&
        Number.isFinite(lat2) && Number.isFinite(lon2) &&
        lat1 !== 0 && lon1 !== 0 && lat2 !== 0 && lon2 !== 0
      ) {
        let timeDiffMinutes = arrMinutes - depMinutes;
        if (timeDiffMinutes <= 0) {
          timeDiffMinutes += 24 * 60;
        }

        const distanceKm = haversineKm(lat1, lon1, lat2, lon2);
        const rawSpeed = distanceKm > 0 && timeDiffMinutes > 0
          ? distanceKm / (timeDiffMinutes / 60)
          : 0;

        if (Number.isFinite(rawSpeed) && rawSpeed > 0) {
          const boundedSpeed = Math.max(12, Math.min(130, rawSpeed));
          return {
            estimatedSpeedKmph: Number(boundedSpeed.toFixed(1)),
            basis: 'station-distance-time',
            fromStationCode: normalizeStationCode(currentStop?.code),
            toStationCode: normalizeStationCode(nextStop?.code),
            distanceKm: Number(distanceKm.toFixed(1)),
            timeDiffMinutes,
          };
        }
      }
    }
  }

  const fallbackSpeed = Math.max(0, Number(trainData?.speed || 0));
  return {
    estimatedSpeedKmph: Number(fallbackSpeed.toFixed(1)),
    basis: 'fallback',
  };
}

function computeDelayTrend(rows: SnapshotRow[]): HaltComputationInsight['delayTrend'] {
  if (!rows.length) return 'STABLE';
  const latest = Number(rows[0]?.delay || 0);
  const oldest = Number(rows[rows.length - 1]?.delay || 0);
  const delta = latest - oldest;
  if (delta >= 4) return 'INCREASING';
  if (delta <= -4) return 'DECREASING';
  return 'STABLE';
}

function isPositionUnchanged(rows: SnapshotRow[]): boolean {
  if (rows.length < 2) return false;
  const uniqueStations = new Set(rows.map((row) => normalizeStationCode(row.stationCode)).filter(Boolean));
  if (uniqueStations.size <= 1) return true;

  const anchor = rows[0];
  const maxDrift = rows.slice(1).reduce((maxValue, row) => {
    const dist = haversineKm(
      Number(anchor.latitude || 0),
      Number(anchor.longitude || 0),
      Number(row.latitude || 0),
      Number(row.longitude || 0)
    );
    return Math.max(maxValue, Number.isFinite(dist) ? dist : 0);
  }, 0);

  return maxDrift <= 1.2;
}

function computeNetworkInsight(
  stationLive: StationLiveInsight,
  trainsBetween: TrainsBetweenInsight | null,
  nearbyTrainsCount: number
): NetworkComputationInsight {
  const trainsBetweenCount = Math.max(0, trainsBetween?.totalTrains || 0);
  const score = Math.min(
    100,
    stationLive.totalActiveTrains * 5 + trainsBetweenCount * 3 + nearbyTrainsCount * 7
  );
  const sectionLoad = resolveSectionLoad(score);

  const message =
    sectionLoad === 'SEVERE'
      ? 'High traffic section detected.'
      : sectionLoad === 'HIGH'
        ? 'Moderate-to-high congestion in this corridor.'
        : sectionLoad === 'MODERATE'
          ? 'Moderate congestion observed.'
          : 'Low traffic section right now.';

  return {
    sectionLoad,
    congestionScore: Math.round(score),
    trainsBetween: trainsBetweenCount,
    nearbyTrains: nearbyTrainsCount,
    message,
  };
}

function computePassengerSafety(
  delay: number,
  crowdScore: number,
  network: NetworkComputationInsight
): PassengerSafetyInsight {
  const hour = new Date().getHours();
  const nightPenalty = hour >= 22 || hour <= 5 ? 10 : 0;
  const riskScore = Math.min(
    100,
    crowdScore * 0.45 +
      Math.min(45, delay * 1.3) +
      network.congestionScore * 0.25 +
      nightPenalty
  );

  if (riskScore >= 70) {
    return {
      risk: 'HIGH',
      discomfortScore: Math.round(riskScore),
      message: 'High Discomfort Risk',
    };
  }

  if (riskScore >= 40) {
    return {
      risk: 'MODERATE',
      discomfortScore: Math.round(riskScore),
      message: 'Moderate Risk',
    };
  }

  return {
    risk: 'LOW',
    discomfortScore: Math.round(riskScore),
    message: 'Low Risk',
  };
}

function computeCascade(
  delay: number,
  network: NetworkComputationInsight
): CascadeDetectionInsight {
  const detected = delay >= 15 && (network.trainsBetween >= 6 || network.nearbyTrains >= 2);
  const impactScore = Math.min(100, delay * 1.8 + network.congestionScore * 0.6);
  const affectedTrains = Math.min(30, Math.max(network.trainsBetween, network.nearbyTrains * 3));

  const risk: CascadeDetectionInsight['risk'] =
    impactScore >= 75 ? 'HIGH' : impactScore >= 45 ? 'MODERATE' : 'LOW';

  return {
    detected,
    risk,
    affectedTrains,
    message: detected
      ? 'Delay propagation detected'
      : 'No significant cascade signal detected',
  };
}

function buildDataQualityInsight(params: {
  latencyMs: number;
  trainStatus: TrainStatusInsight;
  stationLive: StationLiveInsight;
  exceptions: ExceptionInsight;
  trainsBetween: TrainsBetweenInsight | null;
  speed: SpeedEstimationInsight;
}): DataQualityInsight {
  const missingFields: string[] = [];
  const fieldChecks: Array<[string, boolean]> = [
    ['trainStatus', params.trainStatus.status !== 'UNKNOWN'],
    ['currentStation', params.trainStatus.currentStation !== 'Unknown'],
    ['nextStation', params.trainStatus.nextStation !== 'Unknown'],
    ['stationLive', Number.isFinite(params.stationLive.totalActiveTrains)],
    ['exceptions', typeof params.exceptions.hasException === 'boolean'],
    ['speedEstimation', params.speed.estimatedSpeedKmph > 0],
    ['trainsBetween', Boolean(params.trainsBetween)],
  ];

  for (const [name, passed] of fieldChecks) {
    if (!passed) {
      missingFields.push(name);
    }
  }

  const validFields = fieldChecks.filter(([, passed]) => passed).length;
  const totalFields = fieldChecks.length;

  let successfulSignals = 0;
  if (params.trainStatus.source.startsWith('ntes')) successfulSignals += 1;
  if (params.stationLive.source.startsWith('ntes')) successfulSignals += 1;
  if (params.exceptions.source.startsWith('ntes')) successfulSignals += 1;
  if (params.trainsBetween?.source === 'ntes-trains-between') successfulSignals += 1;
  const totalSignals = 4;

  const completenessScore = (validFields / totalFields) * 70;
  const sourceScore = (successfulSignals / totalSignals) * 30;
  const latencyPenalty = params.latencyMs > 3200 ? 12 : params.latencyMs > 1800 ? 6 : 0;
  const confidence = Math.max(15, Math.min(99, Math.round(completenessScore + sourceScore - latencyPenalty)));

  return {
    confidence,
    sourceReliability: resolveSourceReliability(confidence),
    latencyMs: Math.max(1, Math.round(params.latencyMs)),
    validFields,
    totalFields,
    missingFields,
    successfulSignals,
    totalSignals,
    primarySource: params.trainStatus.source,
  };
}

function resolveTimeSignals(
  delay: number,
  schedule: TrainScheduleInsight | null,
  inferredSegment: { fromStationCode: string; toStationCode: string } | null,
  trainData: any
): TimeSignalInsight {
  let nextScheduledArrival = '--:--';

  if (schedule?.route?.length && inferredSegment?.toStationCode) {
    const match = schedule.route.find(
      (stop) => normalizeStationCode(stop.stationCode) === normalizeStationCode(inferredSegment.toStationCode)
    );
    if (match?.scheduledArrival) {
      nextScheduledArrival = match.scheduledArrival;
    }
  }

  if (nextScheduledArrival === '--:--' && Array.isArray(trainData?.scheduledStations)) {
    const currentIndex = Math.max(
      0,
      Math.min(Number(trainData?.currentStationIndex || 0), Math.max(trainData.scheduledStations.length - 1, 0))
    );
    const nextIndex = Math.min(currentIndex + 1, Math.max(trainData.scheduledStations.length - 1, 0));
    nextScheduledArrival = trainData.scheduledStations[nextIndex]?.scheduledArrival || '--:--';
  }

  return {
    lastUpdated: new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    runningLateMinutes: Math.max(0, Math.round(delay)),
    nextScheduledArrival,
    expectedArrival: addDelayToClock(nextScheduledArrival, delay),
  };
}

async function queryStationSnapshots(stationCode: string, lookbackMinutes: number = 90): Promise<SnapshotRow[]> {
  const dbPath = path.join(process.cwd(), 'railsense.db');
  const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

  return new Promise((resolve) => {
    const db = new sqlite3.Database(dbPath, (openErr) => {
      if (openErr) {
        resolve([]);
        return;
      }

      db.all(
        `
        SELECT trainNumber, stationCode, stationName, latitude, longitude, speed, delay, status, timestamp
        FROM train_snapshots
        WHERE UPPER(stationCode) = UPPER(?) AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 300
        `,
        [stationCode, cutoff],
        (queryErr, rows: any[]) => {
          db.close();
          if (queryErr || !rows) {
            resolve([]);
            return;
          }
          resolve(rows as SnapshotRow[]);
        }
      );
    });
  });
}

async function queryTrainSnapshots(trainNumber: string, lookbackMinutes: number = 90): Promise<SnapshotRow[]> {
  const dbPath = path.join(process.cwd(), 'railsense.db');
  const cutoff = new Date(Date.now() - lookbackMinutes * 60 * 1000).toISOString();

  return new Promise((resolve) => {
    const db = new sqlite3.Database(dbPath, (openErr) => {
      if (openErr) {
        resolve([]);
        return;
      }

      db.all(
        `
        SELECT trainNumber, stationCode, stationName, latitude, longitude, speed, delay, status, timestamp
        FROM train_snapshots
        WHERE UPPER(trainNumber) = UPPER(?) AND timestamp >= ?
        ORDER BY timestamp DESC
        LIMIT 60
        `,
        [trainNumber, cutoff],
        (queryErr, rows: any[]) => {
          db.close();
          if (queryErr || !rows) {
            resolve([]);
            return;
          }
          resolve(rows as SnapshotRow[]);
        }
      );
    });
  });
}

export async function getTrainStatusInsight(trainNumber: string): Promise<TrainStatusInsight> {
  const normalizedTrainNumber = trainNumber.trim();
  const providerResult = await ntesProvider.getStatus(normalizedTrainNumber);
  const source = providerResult ? 'ntes-train-running' : 'schedule-fallback';

  const trainData = await getTrainData(normalizedTrainNumber);

  const status = (providerResult?.status as TrainStatusInsight['status']) || 'UNKNOWN';
  const delayMinutes = Math.max(0, Number(providerResult?.delay || trainData?.delay || 0));
  const currentStation =
    (providerResult?.raw?.lastStation as string) ||
    trainData?.scheduledStations?.[trainData.currentStationIndex]?.name ||
    'Unknown';
  const nextStation =
    (providerResult?.raw?.nextStation as string) ||
    trainData?.scheduledStations?.[Math.min((trainData?.currentStationIndex || 0) + 1, Math.max((trainData?.scheduledStations?.length || 1) - 1, 0))]?.name ||
    'Unknown';

  const insights: string[] = [];
  if (status === 'CANCELLED') {
    insights.push('Train cancellation signal detected.');
  } else if (delayMinutes >= 60) {
    insights.push('Severe delay detected from running status.');
  } else if (delayMinutes >= 15) {
    insights.push('Operational delay detected.');
  } else {
    insights.push('Train appears operational with low delay.');
  }

  return {
    trainNumber: normalizedTrainNumber,
    status,
    delayMinutes,
    currentStation,
    nextStation,
    coordinates:
      typeof providerResult?.lat === 'number' && typeof providerResult?.lng === 'number'
        ? {
            latitude: providerResult.lat,
            longitude: providerResult.lng,
            accuracy: providerResult.accuracy,
          }
        : undefined,
    freshnessSeconds:
      typeof providerResult?.raw?.freshnessSeconds === 'number'
        ? providerResult.raw.freshnessSeconds
        : undefined,
    source,
    interpretedInsights: insights,
    timestamp: new Date().toISOString(),
  };
}

export async function getStationLiveInsight(stationCode: string): Promise<StationLiveInsight> {
  const normalizedStationCode = stationCode.trim().toUpperCase();
  const stationTemplate = process.env.NTES_STATION_LIVE_ENDPOINT || '';

  let rawStationPayload: any | null = null;
  if (stationTemplate) {
    rawStationPayload = await fetchNtesTemplatePayload(stationTemplate, {
      stationCode: normalizedStationCode,
      refDate: formatNtesRefDate(new Date()),
    });
  }

  if (rawStationPayload) {
    const arrivals = (readByPath(rawStationPayload, 'arrivals') || readByPath(rawStationPayload, 'arrivalTrains') || []) as any[];
    const departures = (readByPath(rawStationPayload, 'departures') || readByPath(rawStationPayload, 'departureTrains') || []) as any[];

    const normalizeRows = (items: any[]) => items.slice(0, 20).map((item) => ({
      trainNumber: pickString(item, ['trainNo', 'trainNumber', 'number']) || 'UNKNOWN',
      delayMinutes: pickNumber(item, ['delay', 'delayMinutes', 'lateBy']) || 0,
      speed: pickNumber(item, ['speed']) || 0,
      status: pickString(item, ['status', 'runningStatus']) || 'Running',
      lastSeen: pickString(item, ['timestamp', 'lastSeen', 'updatedAt']) || new Date().toISOString(),
    }));

    const incomingTrains = normalizeRows(arrivals);
    const outgoingTrains = normalizeRows(departures);
    const platformTrains = [...incomingTrains, ...outgoingTrains].filter((row) => row.speed <= 5 || row.status.toLowerCase().includes('halt'));
    const total = incomingTrains.length + outgoingTrains.length;

    return {
      stationCode: normalizedStationCode,
      stationName: pickString(rawStationPayload, ['stationName', 'station.name']) || normalizedStationCode,
      totalActiveTrains: total,
      incomingTrains,
      outgoingTrains,
      platformTrains,
      congestionLevel: resolveCongestion(total),
      source: 'ntes-live-station',
      timestamp: new Date().toISOString(),
    };
  }

  const snapshotRows = await queryStationSnapshots(normalizedStationCode);
  const latestByTrain = new Map<string, SnapshotRow>();
  for (const row of snapshotRows) {
    if (!latestByTrain.has(row.trainNumber)) {
      latestByTrain.set(row.trainNumber, row);
    }
  }

  const trainRows = Array.from(latestByTrain.values()).slice(0, 30);
  const incomingTrains = trainRows
    .filter((row) => row.status.toLowerCase() === 'running' && row.speed <= 35)
    .map((row) => ({
      trainNumber: row.trainNumber,
      delayMinutes: Math.max(0, Number(row.delay || 0)),
      speed: Number(row.speed || 0),
      status: row.status,
      lastSeen: row.timestamp,
    }));

  const outgoingTrains = trainRows
    .filter((row) => row.status.toLowerCase() === 'running' && row.speed > 35)
    .map((row) => ({
      trainNumber: row.trainNumber,
      delayMinutes: Math.max(0, Number(row.delay || 0)),
      speed: Number(row.speed || 0),
      status: row.status,
      lastSeen: row.timestamp,
    }));

  const platformTrains = trainRows
    .filter((row) => row.status.toLowerCase() !== 'running' || row.speed <= 5)
    .map((row) => ({
      trainNumber: row.trainNumber,
      delayMinutes: Math.max(0, Number(row.delay || 0)),
      speed: Number(row.speed || 0),
      status: row.status,
      lastSeen: row.timestamp,
    }));

  const totalActiveTrains = incomingTrains.length + outgoingTrains.length + platformTrains.length;

  return {
    stationCode: normalizedStationCode,
    stationName: trainRows[0]?.stationName || normalizedStationCode,
    totalActiveTrains,
    incomingTrains,
    outgoingTrains,
    platformTrains,
    congestionLevel: resolveCongestion(totalActiveTrains),
    source: 'snapshot-fallback',
    timestamp: new Date().toISOString(),
  };
}

export async function getTrainScheduleInsight(trainNumber: string): Promise<TrainScheduleInsight | null> {
  const normalizedTrainNumber = trainNumber.trim();
  const scheduleTemplate = process.env.NTES_TRAIN_SCHEDULE_ENDPOINT || '';

  if (scheduleTemplate) {
    const raw = await fetchNtesTemplatePayload(scheduleTemplate, {
      trainNumber: normalizedTrainNumber,
      trainNo: normalizedTrainNumber,
      refDate: formatNtesRefDate(new Date()),
    });

    if (raw) {
      const routeRows = (readByPath(raw, 'stations') || readByPath(raw, 'route') || []) as any[];
      if (Array.isArray(routeRows) && routeRows.length) {
        return {
          trainNumber: normalizedTrainNumber,
          trainName: pickString(raw, ['trainName', 'name']) || `Train ${normalizedTrainNumber}`,
          source: pickString(raw, ['source', 'from']) || routeRows[0]?.stationName || 'Unknown',
          destination: pickString(raw, ['destination', 'to']) || routeRows[routeRows.length - 1]?.stationName || 'Unknown',
          totalStations: routeRows.length,
          route: routeRows.slice(0, 200).map((row: any) => ({
            stationCode: pickString(row, ['stationCode', 'code']) || 'UNKNOWN',
            stationName: pickString(row, ['stationName', 'name']) || 'Unknown',
            scheduledArrival: pickString(row, ['scheduledArrival', 'arrives', 'arrival']) || '--:--',
            scheduledDeparture: pickString(row, ['scheduledDeparture', 'departs', 'departure']) || '--:--',
          })),
          sourceType: 'ntes-schedule',
          timestamp: new Date().toISOString(),
        };
      }
    }
  }

  const trainData = await getTrainData(normalizedTrainNumber);
  if (!trainData) {
    return null;
  }

  return {
    trainNumber: normalizedTrainNumber,
    trainName: trainData.trainName,
    source: trainData.scheduledStations[0]?.name || 'Unknown',
    destination: trainData.destination,
    totalStations: trainData.scheduledStations.length,
    route: trainData.scheduledStations.map((station) => ({
      stationCode: station.code || 'UNKNOWN',
      stationName: station.name,
      scheduledArrival: station.scheduledArrival,
      scheduledDeparture: station.scheduledDeparture,
    })),
    sourceType: 'schedule-db',
    timestamp: new Date().toISOString(),
  };
}

export async function getExceptionInsight(
  trainNumber: string,
  precomputedStatus?: TrainStatusInsight
): Promise<ExceptionInsight> {
  const normalizedTrainNumber = trainNumber.trim();
  const exceptionTemplate = process.env.NTES_EXCEPTIONS_ENDPOINT || '';

  const items: ExceptionInsight['items'] = [];
  let source = 'ntes-train-running';

  if (exceptionTemplate) {
    const raw = await fetchNtesTemplatePayload(exceptionTemplate, {
      trainNumber: normalizedTrainNumber,
      trainNo: normalizedTrainNumber,
      refDate: formatNtesRefDate(new Date()),
    });

    if (raw) {
      const rawStatus = pickString(raw, ['status', 'trainStatus', 'exceptionStatus']) || '';
      const normalized = rawStatus.toLowerCase();
      if (normalized.includes('cancel')) {
        items.push({ type: 'cancellation', message: 'Cancellation signal from NTES exception feed.', confidence: 0.9 });
      }
      if (normalized.includes('divert')) {
        items.push({ type: 'diversion', message: 'Diversion signal from NTES exception feed.', confidence: 0.82 });
      }
    }
  }

  const statusInsight = precomputedStatus || await getTrainStatusInsight(normalizedTrainNumber);
  if (statusInsight.status === 'CANCELLED') {
    items.push({ type: 'cancellation', message: 'Train marked cancelled in running status.', confidence: 0.95 });
  } else if (statusInsight.status === 'HALTED') {
    items.push({ type: 'halt', message: 'Train appears halted in running status.', confidence: 0.8 });
  }

  if (statusInsight.delayMinutes >= 15) {
    items.push({
      type: 'delay',
      message: `Delay observed: ${statusInsight.delayMinutes} minutes.`,
      confidence: statusInsight.delayMinutes >= 60 ? 0.9 : 0.75,
    });
  }

  let severity: ExceptionInsight['severity'] = 'none';
  const hasCancellation = items.some((item) => item.type === 'cancellation');
  const hasDiversion = items.some((item) => item.type === 'diversion');
  if (hasCancellation) {
    severity = 'critical';
  } else if (hasDiversion || statusInsight.delayMinutes >= 90) {
    severity = 'high';
  } else if (statusInsight.delayMinutes >= 30 || items.some((item) => item.type === 'halt')) {
    severity = 'medium';
  } else if (items.length > 0) {
    severity = 'low';
  }

  if (items.length === 0) {
    source = 'ntes-normal';
  }

  return {
    trainNumber: normalizedTrainNumber,
    hasException: items.length > 0,
    severity,
    items,
    source,
    timestamp: new Date().toISOString(),
  };
}

export async function getTrainsBetweenInsight(
  fromStationCode: string,
  toStationCode: string
): Promise<TrainsBetweenInsight | null> {
  const fromCode = normalizeStationCode(fromStationCode);
  const toCode = normalizeStationCode(toStationCode);
  if (!fromCode || !toCode || fromCode === toCode) {
    return null;
  }

  const template = process.env.NTES_TRAINS_BETWEEN_ENDPOINT || '';
  if (!template) {
    return {
      fromStationCode: fromCode,
      toStationCode: toCode,
      totalTrains: 0,
      trains: [],
      source: 'trains-between-unconfigured',
      timestamp: new Date().toISOString(),
    };
  }

  const raw = await fetchNtesTemplatePayload(template, {
    from: fromCode,
    to: toCode,
    fromStation: fromCode,
    toStation: toCode,
    fromStationCode: fromCode,
    toStationCode: toCode,
    refDate: formatNtesRefDate(new Date()),
  });

  if (!raw) {
    return {
      fromStationCode: fromCode,
      toStationCode: toCode,
      totalTrains: 0,
      trains: [],
      source: 'trains-between-unavailable',
      timestamp: new Date().toISOString(),
    };
  }

  const rows =
    (Array.isArray(raw) ? raw : null) ||
    (readByPath(raw, 'trains') as any[]) ||
    (readByPath(raw, 'betweenTrains') as any[]) ||
    (readByPath(raw, 'trainList') as any[]) ||
    (readByPath(raw, 'data.trains') as any[]) ||
    (readByPath(raw, 'result') as any[]) ||
    [];

  const trains = (Array.isArray(rows) ? rows : [])
    .slice(0, 80)
    .map((item: any) => ({
      trainNumber: pickString(item, ['trainNo', 'trainNumber', 'number']) || 'UNKNOWN',
      trainName: pickString(item, ['trainName', 'name']) || undefined,
      status: pickString(item, ['status', 'runningStatus']) || undefined,
      delayMinutes: pickNumber(item, ['delay', 'delayMinutes', 'lateBy']) ?? undefined,
    }));

  const totalTrains = Math.max(
    0,
    Number(
      pickNumber(raw, ['total', 'totalTrains', 'count', 'meta.total']) ?? trains.length
    )
  );

  return {
    fromStationCode: fromCode,
    toStationCode: toCode,
    totalTrains,
    trains,
    source: 'ntes-trains-between',
    timestamp: new Date().toISOString(),
  };
}

export async function getIntelligenceInsight(
  trainNumber: string,
  stationCodeOverride?: string
): Promise<IntelligenceInsight | null> {
  const startedAt = Date.now();
  const normalizedTrainNumber = trainNumber.trim();

  const [trainStatus, schedule, trainData] = await Promise.all([
    getTrainStatusInsight(normalizedTrainNumber),
    getTrainScheduleInsight(normalizedTrainNumber),
    getTrainData(normalizedTrainNumber),
  ]);
  const exceptions = await getExceptionInsight(normalizedTrainNumber, trainStatus);

  const inferredSegment = inferSegmentFromSchedule(
    schedule,
    trainStatus.currentStation,
    trainStatus.nextStation
  );

  const inferredStationCode =
    inferStationCodeFromLabel(trainStatus.currentStation) ||
    trainStatus.currentStation.split('-').pop()?.trim() ||
    undefined;

  const stationCode = normalizeStationCode(
    stationCodeOverride || inferredSegment?.fromStationCode || inferredStationCode || 'UNKNOWN'
  );

  const [trainsBetween, stationLive] = await Promise.all([
    inferredSegment
      ? getTrainsBetweenInsight(inferredSegment.fromStationCode, inferredSegment.toStationCode)
      : Promise.resolve(null),
    getStationLiveInsight(stationCode),
  ]);

  const nearbyTrains =
    trainData?.currentLocation?.latitude && trainData?.currentLocation?.longitude
      ? await getNearbyTrainsData(
          Number(trainData.currentLocation.latitude),
          Number(trainData.currentLocation.longitude),
          35,
          normalizedTrainNumber
        )
      : [];
  const nearbyTrainsCount = nearbyTrains.length;

  const delay = trainStatus.delayMinutes;
  const speedEstimation = estimateSpeedFromSchedule(trainData);
  const timeSignals = resolveTimeSignals(delay, schedule, inferredSegment, trainData);

  const searchCrowd = crowdDetectionService.estimateCrowd(normalizedTrainNumber);
  const stationTrafficScore = Math.min(100, stationLive.totalActiveTrains * 12);
  const segmentTrafficScore = Math.min(100, (trainsBetween?.totalTrains || 0) * 8);
  const nearbyTrafficScore = Math.min(100, nearbyTrainsCount * 14);
  const crowdScore = Math.round(
    trainsBetween
      ? searchCrowd.crowdScore * 0.4 + stationTrafficScore * 0.3 + segmentTrafficScore * 0.2 + nearbyTrafficScore * 0.1
      : searchCrowd.crowdScore * 0.55 + stationTrafficScore * 0.35 + nearbyTrafficScore * 0.1
  );
  const crowdLevel = resolveCrowdLevel(crowdScore);

  const networkIntelligence = computeNetworkInsight(stationLive, trainsBetween, nearbyTrainsCount);

  const snapshotRows = await queryTrainSnapshots(normalizedTrainNumber, 70);
  const delayTrend = computeDelayTrend(snapshotRows);
  const positionUnchanged = isPositionUnchanged(snapshotRows);
  const haltDetected =
    trainStatus.status === 'HALTED' ||
    (positionUnchanged && delayTrend === 'INCREASING' && delay >= 10);

  const haltReason =
    exceptions.items.find((item) => item.type === 'halt')?.message ||
    (haltDetected
      ? networkIntelligence.congestionScore >= 65
        ? 'Possible signal delay'
        : stationLive.platformTrains.length >= 3
          ? 'Likely platform hold'
          : 'Unexpected halt detected'
      : 'No confirmed halt reason');

  const haltAnalysis: HaltComputationInsight = {
    detected: haltDetected,
    status: haltDetected ? 'Possible Signal Halt' : 'No Unexpected Halt',
    reason: haltReason,
    delayTrend,
    positionUnchanged,
  };

  let safetyStatus = resolveSafetyStatus(delay, crowdScore, exceptions.severity);
  if (networkIntelligence.congestionScore >= 80 || (trainsBetween?.totalTrains || 0) >= 24) {
    safetyStatus = 'HIGH_RISK';
  } else if ((trainsBetween?.totalTrains || 0) >= 15 && safetyStatus === 'NORMAL') {
    safetyStatus = 'ELEVATED';
  }

  const passengerSafety = computePassengerSafety(delay, crowdScore, networkIntelligence);
  const cascadeDetection = computeCascade(delay, networkIntelligence);

  const dataQuality = buildDataQualityInsight({
    latencyMs: Date.now() - startedAt,
    trainStatus,
    stationLive,
    exceptions,
    trainsBetween,
    speed: speedEstimation,
  });

  const explainability: ExplainabilityInsight = {
    confidence: dataQuality.confidence,
    reasons: [
      `Estimated Speed: ${speedEstimation.estimatedSpeedKmph} km/h from station distance-time model.`,
      `${networkIntelligence.message} (${networkIntelligence.trainsBetween} trains between stations, ${networkIntelligence.nearbyTrains} nearby).`,
      haltAnalysis.detected
        ? `Halt inference: position unchanged with ${haltAnalysis.delayTrend.toLowerCase()} delay trend.`
        : 'No halt pattern from delay + movement checks.',
      `Passenger safety: ${passengerSafety.message} at discomfort score ${passengerSafety.discomfortScore}/100.`,
      `Data confidence: ${dataQuality.confidence}% (${dataQuality.sourceReliability} reliability).`,
    ],
  };

  const interpretedInsights = [
    `Delay signal: ${delay} min (${trainStatus.status})`,
    `Estimated speed: ${speedEstimation.estimatedSpeedKmph} km/h`,
    `Expected arrival: ${timeSignals.expectedArrival}`,
    `Crowd score: ${crowdScore}/100 (${crowdLevel})`,
    trainsBetween
      ? `Segment pressure: ${trainsBetween.totalTrains} trains between ${trainsBetween.fromStationCode} and ${trainsBetween.toStationCode}.`
      : 'Segment pressure unavailable; using station/search signals only.',
    networkIntelligence.message,
    haltAnalysis.detected ? 'Unexpected halt detected.' : 'No unexpected halt detected.',
    exceptions.hasException
      ? `Exception severity: ${exceptions.severity}`
      : 'No active exception flags.',
    safetyStatus === 'HIGH_RISK'
      ? 'Safety risk elevated: consider alternate train/boarding strategy.'
      : safetyStatus === 'ELEVATED'
        ? 'Operational caution advised due to delay/crowd blend.'
        : 'Operational conditions currently stable.',
    cascadeDetection.detected ? 'Delay propagation detected.' : 'No delay propagation signal.',
  ];

  return {
    trainNumber: normalizedTrainNumber,
    speed: speedEstimation.estimatedSpeedKmph,
    delay,
    expectedArrival: timeSignals.expectedArrival,
    lastUpdated: timeSignals.lastUpdated,
    runningLateMinutes: timeSignals.runningLateMinutes,
    crowdLevel,
    crowdScore,
    confidence: dataQuality.confidence,
    haltStatus: haltAnalysis.status,
    haltReason,
    safety: passengerSafety.message,
    safetyStatus,
    modules: {
      trainStatus,
      stationLive,
      exceptions,
      trainsBetween: trainsBetween || undefined,
      speedEstimation,
      timeSignals,
      dataQuality,
      networkIntelligence,
      haltAnalysis,
      explainability,
      passengerSafety,
      cascadeDetection,
    },
    interpretedInsights,
    timestamp: new Date().toISOString(),
  };
}
