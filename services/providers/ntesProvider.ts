/**
 * NTES Provider
 * Pulls train status from NTES and compatible live status endpoints.
 * Supports approximate GPS extraction when precise coordinates are unavailable.
 */

import { ProviderResult, TrainProvider } from '../providerAdapter';

export interface NTESStatus {
  trainNumber: string;
  status: 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'HALTED';
  delay: number; // minutes
  lastStation?: string;
  nextStation?: string;
  actualArrival?: number; // unix timestamp
  expectedArrival?: number; // unix timestamp
  platform?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  accuracy?: number;
  freshnessSeconds?: number;
  coordinateQuality?: 'exact' | 'approximate' | 'none';
  sourceConfidence?: number;
}

class NTESProvider implements TrainProvider {
  name = 'NTES';
  enabled = true;
  rateLimit = 10; // requests per minute
  stats = {
    successCount: 0,
    failureCount: 0,
    avgLatencyMs: 0,
    lastError: null as string | null,
    lastSuccessTime: null as number | null,
  };

  private scrapedCache = new Map<string, { data: NTESStatus; timestamp: number }>();
  private CACHE_TTL_MS = 20000; // 20s cache for NTES data
  private REQUEST_TIMEOUT_MS = 6500;
  private PAGE_TIMEOUT_MS = 7000;
  private NTES_BASE_URL = process.env.NTES_BASE_URL || 'https://enquiry.indianrail.gov.in';
  private ENABLE_MOCK_MODE = process.env.ENABLE_MOCK_LIVE_DATA === 'true';
  private endpointTemplates = [
    ...(process.env.NTES_LIVE_ENDPOINTS || '')
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
    ...(process.env.NTES_LIVE_ENDPOINT ? [process.env.NTES_LIVE_ENDPOINT] : []),
  ];

  /**
   * Fetch status for a single train from NTES and compatible sources.
   */
  async getStatus(trainNumber: string): Promise<ProviderResult | null> {
    const start = Date.now();

    try {
      // Check cache first
      const cached = this.scrapedCache.get(trainNumber);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
        return this._statusToProviderResult(trainNumber, cached.data, cached.timestamp);
      }

      let nteData = await this._fetchRealStatus(trainNumber);

      if (!nteData && this.ENABLE_MOCK_MODE) {
        nteData = await this._mockFetchFromNTES(trainNumber);
      }

      if (!nteData) {
        this.recordFailure('No NTES data found');
        return null;
      }

      const now = Date.now();
      const result = this._statusToProviderResult(trainNumber, nteData, now);

      // Cache it
      this.scrapedCache.set(trainNumber, {
        data: nteData,
        timestamp: now,
      });

      this.recordSuccess(Date.now() - start);
      return result;
    } catch (error) {
      this.recordFailure(`${error}`);
      console.error(`[NTES] Error fetching ${trainNumber}:`, error);
      return null;
    }
  }

  private _statusToProviderResult(
    trainNumber: string,
    data: NTESStatus,
    timestamp: number
  ): ProviderResult {
    const hasCoords = this._isValidIndianCoordinate(data.lat, data.lng);

    return {
      trainNumber,
      delay: data.delay,
      status: data.status,
      lat: hasCoords ? data.lat : undefined,
      lng: hasCoords ? data.lng : undefined,
      speed: typeof data.speed === 'number' && Number.isFinite(data.speed) ? data.speed : undefined,
      accuracy: typeof data.accuracy === 'number' && Number.isFinite(data.accuracy) ? data.accuracy : undefined,
      timestamp,
      source: 'ntes',
      raw: data,
    };
  }

  private async _fetchRealStatus(trainNumber: string): Promise<NTESStatus | null> {
    const [ntesTrainRunningData, endpointData, statusPageData] = await Promise.all([
      this._fetchFromNtesTrainRunningEndpoint(trainNumber),
      this._fetchFromConfiguredEndpoints(trainNumber),
      this._fetchFromStatusPages(trainNumber),
    ]);

    const candidates = [ntesTrainRunningData, endpointData, statusPageData].filter(
      (value): value is NTESStatus => Boolean(value)
    );

    if (!candidates.length) {
      return null;
    }

    candidates.sort((a, b) => this._scoreStatus(b) - this._scoreStatus(a));
    return candidates[0];
  }

  private async _fetchFromNtesTrainRunningEndpoint(trainNumber: string): Promise<NTESStatus | null> {
    try {
      const refDate = this._formatNtesRefDate(new Date());
      const endpoint = `${this.NTES_BASE_URL}/ntes/tr?opt=TrainRunning&subOpt=FindRunningInstance&trainNo=${encodeURIComponent(trainNumber)}&refDate=${encodeURIComponent(refDate)}`;
      const cookieHeader = await this._bootstrapNtesCookie();
      const text = await this._fetchTextWithHeaders(endpoint, this.REQUEST_TIMEOUT_MS, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': `${this.NTES_BASE_URL}/mntes/`,
        'X-Requested-With': 'XMLHttpRequest',
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      });

      if (!text) {
        return null;
      }

      const parsed = this._parseNtesTrainRunningText(text, trainNumber);
      if (!parsed) {
        return null;
      }

      parsed.sourceConfidence = Math.max(parsed.sourceConfidence ?? 0.62, 0.74);
      parsed.freshnessSeconds = typeof parsed.freshnessSeconds === 'number' ? parsed.freshnessSeconds : 120;
      return parsed;
    } catch {
      return null;
    }
  }

  private _scoreStatus(data: NTESStatus): number {
    let score = data.sourceConfidence ?? 0.45;

    if (this._isValidIndianCoordinate(data.lat, data.lng)) {
      score += 0.2;
      if (data.coordinateQuality === 'exact') {
        score += 0.05;
      }
    }

    if (typeof data.freshnessSeconds === 'number') {
      if (data.freshnessSeconds <= 120) {
        score += 0.08;
      } else if (data.freshnessSeconds > 600) {
        score -= 0.08;
      }
    }

    return score;
  }

  private async _fetchFromConfiguredEndpoints(trainNumber: string): Promise<NTESStatus | null> {
    if (!this.endpointTemplates.length) {
      return null;
    }

    const settled = await Promise.allSettled(
      this.endpointTemplates.map((template) => this._fetchFromSingleEndpoint(template, trainNumber))
    );

    const results = settled
      .filter((entry): entry is PromiseFulfilledResult<NTESStatus | null> => entry.status === 'fulfilled')
      .map((entry) => entry.value)
      .filter((value): value is NTESStatus => Boolean(value));

    if (!results.length) {
      return null;
    }

    results.sort((a, b) => this._scoreStatus(b) - this._scoreStatus(a));
    return results[0];
  }

  private async _fetchFromSingleEndpoint(template: string, trainNumber: string): Promise<NTESStatus | null> {
    const url = this._resolveEndpointTemplate(template, trainNumber);
    const payload = await this._fetchJson(url, this.REQUEST_TIMEOUT_MS);
    if (!payload) {
      return null;
    }
    return this._parseEndpointPayload(payload, trainNumber);
  }

  private _resolveEndpointTemplate(template: string, trainNumber: string): string {
    if (template.includes('{trainNumber}')) {
      return template.replace('{trainNumber}', encodeURIComponent(trainNumber));
    }
    if (template.includes('{train}')) {
      return template.replace('{train}', encodeURIComponent(trainNumber));
    }
    if (template.includes('{number}')) {
      return template.replace('{number}', encodeURIComponent(trainNumber));
    }

    const separator = template.includes('?') ? '&' : '?';
    return `${template}${separator}trainNumber=${encodeURIComponent(trainNumber)}`;
  }

  private _formatNtesRefDate(date: Date): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()] || 'Jan';
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  private async _bootstrapNtesCookie(): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS);
      const response = await fetch(`${this.NTES_BASE_URL}/mntes/`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        },
      });
      clearTimeout(timeoutHandle);

      if (!response.ok) {
        return null;
      }

      const getSetCookie = (response.headers as any).getSetCookie;
      if (typeof getSetCookie !== 'function') {
        return null;
      }

      const setCookies: string[] = getSetCookie.call(response.headers) || [];
      if (!setCookies.length) {
        return null;
      }

      return setCookies
        .map((cookie) => cookie.split(';')[0]?.trim())
        .filter(Boolean)
        .join('; ');
    } catch {
      return null;
    }
  }

  private async _fetchJson(url: string, timeoutMs: number): Promise<any | null> {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'RailSense/1.0 (+https://railsense.local)',
          'Accept': 'application/json,text/plain,*/*',
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        return null;
      }

      const text = await response.text();
      if (!text) {
        return null;
      }

      try {
        return JSON.parse(text);
      } catch {
        // Some endpoints return JS fragments around JSON. Pull the first object-like chunk.
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) {
          return null;
        }
        return JSON.parse(match[0]);
      }
    } catch {
      return null;
    }
  }

  private _parseEndpointPayload(payload: any, trainNumber: string): NTESStatus | null {
    const data = this._unwrapPayload(payload);
    if (!data || typeof data !== 'object') {
      return null;
    }

    const lat = this._readNumber(data, ['lat', 'latitude', 'position.lat', 'position.latitude', 'gps.lat', 'location.lat']);
    const lng = this._readNumber(data, ['lng', 'lon', 'longitude', 'position.lng', 'position.longitude', 'gps.lng', 'location.lng']);
    const delay = this._readNumber(data, ['delay', 'delay_minutes', 'delayMinutes', 'currentDelay']) ?? 0;
    const speed = this._readNumber(data, ['speed', 'currentSpeed', 'position.speed']);
    const accuracy = this._readNumber(data, ['accuracy', 'gpsAccuracy', 'position.accuracy']) ?? 350;
    const freshnessSeconds = this._readNumber(data, ['freshnessSeconds', 'ageSeconds', 'lastReportAge', 'timeAgo']) ?? undefined;
    const statusRaw = this._readString(data, ['status', 'trainStatus', 'currentStatus']);

    const hasCoords = this._isValidIndianCoordinate(lat, lng);
    const normalizedLat = hasCoords && typeof lat === 'number' ? lat : undefined;
    const normalizedLng = hasCoords && typeof lng === 'number' ? lng : undefined;
    if (!hasCoords && delay === 0 && !statusRaw) {
      return null;
    }

    return {
      trainNumber,
      status: this._deriveStatus(statusRaw, delay),
      delay,
      lat: normalizedLat,
      lng: normalizedLng,
      speed: speed ?? undefined,
      accuracy,
      freshnessSeconds: freshnessSeconds ?? undefined,
      coordinateQuality: hasCoords ? (accuracy <= 180 ? 'exact' : 'approximate') : 'none',
      sourceConfidence: hasCoords ? 0.8 : 0.62,
    };
  }

  private _parseNtesTrainRunningText(text: string, trainNumber: string): NTESStatus | null {
    const jsonPayload = this._extractJsonLikePayload(text);
    if (jsonPayload) {
      const parsedFromPayload = this._parseEndpointPayload(jsonPayload, trainNumber);
      if (parsedFromPayload) {
        return parsedFromPayload;
      }
    }

    const delay = this._extractFirstNumber(text, [
      /delay[^0-9-]{0,30}(-?[0-9]{1,3})\s*(?:min|minutes)?/i,
      /late[^0-9-]{0,30}(-?[0-9]{1,3})/i,
      /running\s+late\s+by[^0-9-]{0,10}(-?[0-9]{1,3})/i,
      /on\s*time/i,
    ]) ?? 0;

    const statusRaw = this._extractFirstString(text, [
      /\b(cancelled|halted|running|delayed|on\s*time|arrived)\b/i,
      /status[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,40})/i,
    ]);

    const lastStation = this._extractFirstString(text, [
      /last\s*reported\s*station[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,60})/i,
      /from\s*station[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,60})/i,
    ]);

    const nextStation = this._extractFirstString(text, [
      /next\s*station[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,60})/i,
      /towards[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,60})/i,
    ]);

    if (delay === 0 && !statusRaw && !lastStation && !nextStation) {
      return null;
    }

    return {
      trainNumber,
      status: this._deriveStatus(statusRaw, delay),
      delay,
      lastStation: lastStation ? this._sanitizeStationLabel(lastStation) : undefined,
      nextStation: nextStation ? this._sanitizeStationLabel(nextStation) : undefined,
      coordinateQuality: 'none',
      sourceConfidence: 0.68,
    };
  }

  private _extractJsonLikePayload(text: string): any | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (this._looksLikeTrainPayload(parsed)) {
          return parsed;
        }
      } catch {
        // Continue with candidate scanning.
      }
    }

    const candidates = text.match(/\{[\s\S]{20,1400}?\}/g) || [];
    for (const candidate of candidates.slice(0, 40)) {
      try {
        const parsed = JSON.parse(candidate);
        if (this._looksLikeTrainPayload(parsed)) {
          return parsed;
        }
      } catch {
        // Ignore and continue.
      }
    }

    return null;
  }

  private _looksLikeTrainPayload(payload: any): boolean {
    if (!payload || typeof payload !== 'object') {
      return false;
    }

    const sample = this._unwrapPayload(payload);
    if (!sample || typeof sample !== 'object') {
      return false;
    }

    const keys = Object.keys(sample).map((key) => key.toLowerCase());
    return keys.some((key) =>
      key.includes('train') ||
      key.includes('delay') ||
      key.includes('status') ||
      key.includes('lat') ||
      key.includes('lng') ||
      key.includes('location')
    );
  }

  private _sanitizeStationLabel(label: string): string {
    return label.replace(/["'`|]+/g, '').replace(/\s{2,}/g, ' ').trim();
  }

  private _unwrapPayload(payload: any): any {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }

    const wrappers = ['data', 'result', 'train', 'status', 'liveStatus'];
    for (const key of wrappers) {
      if (payload[key] && typeof payload[key] === 'object') {
        return payload[key];
      }
    }
    return payload;
  }

  private _readNumber(source: any, paths: string[]): number | null {
    for (const path of paths) {
      const value = this._readValueByPath(source, path);
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string') {
        const parsed = Number(value.replace(/[^0-9.-]/g, ''));
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private _readString(source: any, paths: string[]): string | null {
    for (const path of paths) {
      const value = this._readValueByPath(source, path);
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }
    return null;
  }

  private _readValueByPath(source: any, path: string): any {
    const parts = path.split('.');
    let cursor = source;
    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object') {
        return undefined;
      }
      cursor = cursor[part];
    }
    return cursor;
  }

  private async _fetchFromStatusPages(trainNumber: string): Promise<NTESStatus | null> {
    const pages = [
      `https://enquiry.indianrail.gov.in/mntes/`,
      `https://enquiry.indianrail.gov.in/ntes/`,
      `https://enquiry.indianrail.gov.in/ntes/tr?opt=TrainRunning`,
      `https://www.railyatri.in/live-train-status/${trainNumber}`,
      `https://www.whereismytrain.in/train-status/${trainNumber}`,
    ];

    const settled = await Promise.allSettled(
      pages.map((url) => this._fetchFromSingleStatusPage(url, trainNumber))
    );

    const results = settled
      .filter((entry): entry is PromiseFulfilledResult<NTESStatus | null> => entry.status === 'fulfilled')
      .map((entry) => entry.value)
      .filter((value): value is NTESStatus => Boolean(value));

    if (!results.length) {
      return null;
    }

    results.sort((a, b) => this._scoreStatus(b) - this._scoreStatus(a));
    return results[0];
  }

  private async _fetchFromSingleStatusPage(url: string, trainNumber: string): Promise<NTESStatus | null> {
    const html = await this._fetchText(url, this.PAGE_TIMEOUT_MS);
    if (!html) {
      return null;
    }

    const coords = this._extractCoordinatesFromText(html);
    const delay = this._extractFirstNumber(html, [
      /delay[^0-9-]{0,30}(-?[0-9]{1,3})(?:\s*min|\s*m)?/i,
      /late[^0-9-]{0,30}(-?[0-9]{1,3})/i,
      /on\s*time/i,
    ]);
    const statusRaw = this._extractFirstString(html, [
      /\b(cancelled|halted|running|delayed|on\s*time|arrived)\b/i,
      /train\s*status[^a-zA-Z]{0,10}([a-zA-Z\s-]{3,30})/i,
    ]);
    const freshnessSeconds = this._extractFreshnessSeconds(html);

    if (!coords && delay === null && !statusRaw) {
      return null;
    }

    const resolvedDelay = delay === null || Number.isNaN(delay) ? 0 : delay;
    const hasCoords = Boolean(coords);

    return {
      trainNumber,
      status: this._deriveStatus(statusRaw, resolvedDelay),
      delay: resolvedDelay,
      lat: coords?.lat,
      lng: coords?.lng,
      speed: this._extractFirstNumber(html, [
        /speed[^0-9]{0,15}([0-9]{1,3}(?:\.[0-9]+)?)/i,
      ]) ?? undefined,
      accuracy: hasCoords ? 420 : undefined,
      freshnessSeconds: freshnessSeconds ?? undefined,
      coordinateQuality: hasCoords ? 'approximate' : 'none',
      sourceConfidence: hasCoords ? 0.67 : 0.53,
    };
  }

  private async _fetchTextWithHeaders(
    url: string,
    timeoutMs: number,
    headers: Record<string, string>
  ): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers,
      });

      clearTimeout(timeoutHandle);

      if (!response.ok) {
        return null;
      }

      return await response.text();
    } catch {
      return null;
    }
  }

  private async _fetchText(url: string, timeoutMs: number): Promise<string | null> {
    return this._fetchTextWithHeaders(url, timeoutMs, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
    });
  }

  private _extractCoordinatesFromText(text: string): { lat: number; lng: number } | null {
    const patterns: RegExp[] = [
      /"lat(?:itude)?"\s*:\s*([0-9]{1,2}\.[0-9]+)[^\n\r]{0,140}?"(?:lng|lon|longitude)"\s*:\s*([0-9]{1,3}\.[0-9]+)/i,
      /"(?:lng|lon|longitude)"\s*:\s*([0-9]{1,3}\.[0-9]+)[^\n\r]{0,140}?"lat(?:itude)?"\s*:\s*([0-9]{1,2}\.[0-9]+)/i,
      /latitude\s*[=:]\s*([0-9]{1,2}\.[0-9]+)[^\n\r]{0,80}longitude\s*[=:]\s*([0-9]{1,3}\.[0-9]+)/i,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) {
        continue;
      }

      const first = Number(match[1]);
      const second = Number(match[2]);

      let lat = first;
      let lng = second;

      if (lat > 90 || lng > 180) {
        lat = second;
        lng = first;
      }

      if (this._isValidIndianCoordinate(lat, lng)) {
        return { lat, lng };
      }
    }

    return null;
  }

  private _extractFirstNumber(text: string, patterns: RegExp[]): number | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) {
        continue;
      }

      if (!match[1]) {
        if (/on\s*time/i.test(match[0])) {
          return 0;
        }
        continue;
      }

      const value = Number(match[1]);
      if (Number.isFinite(value)) {
        return value;
      }
    }
    return null;
  }

  private _extractFirstString(text: string, patterns: RegExp[]): string | null {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) {
        return match[1].trim();
      }
      if (match?.[0]) {
        return match[0].trim();
      }
    }
    return null;
  }

  private _extractFreshnessSeconds(text: string): number | null {
    const minMatch = text.match(/updated[^0-9]{0,20}([0-9]{1,3})\s*min/i);
    if (minMatch?.[1]) {
      return Number(minMatch[1]) * 60;
    }

    const secMatch = text.match(/updated[^0-9]{0,20}([0-9]{1,3})\s*sec/i);
    if (secMatch?.[1]) {
      return Number(secMatch[1]);
    }

    return null;
  }

  private _deriveStatus(rawStatus: string | null, delay: number): NTESStatus['status'] {
    const normalized = (rawStatus || '').toLowerCase();
    if (normalized.includes('cancel')) return 'CANCELLED';
    if (normalized.includes('halt')) return 'HALTED';
    if (delay > 0 || normalized.includes('delay') || normalized.includes('late')) return 'DELAYED';
    return 'ON_TIME';
  }

  private _isValidIndianCoordinate(
    lat: number | null | undefined,
    lng: number | null | undefined
  ): lat is number {
    return (
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng) &&
      lat >= 6 &&
      lat <= 37 &&
      lng >= 68 &&
      lng <= 98
    );
  }

  /**
   * Mock NTES fetch - returns simulated official status
   * In production: implement real scraper calling ntesScraperWorker
   * PHASE 2 FIX: Removed Math.random() - using deterministic data only
   */
  private async _mockFetchFromNTES(trainNumber: string): Promise<NTESStatus | null> {
    // Deterministic status based on real train data (NO randomization in production)
    const knownTrains: Record<string, Partial<NTESStatus>> = {
      '12955': {
        trainNumber: '12955',
        lastStation: 'Mumbai Central',
        nextStation: 'Thane',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '12728': {
        trainNumber: '12728',
        lastStation: 'Virar',
        nextStation: 'Diva',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '12702': {
        trainNumber: '12702',
        lastStation: 'Kalyan',
        nextStation: 'Kasara',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '17015': {
        trainNumber: '17015',
        lastStation: 'Hyderabad',
        nextStation: 'Tandur',
        status: 'ON_TIME' as const,
        delay: 0,
      },
      '11039': {
        trainNumber: '11039',
        lastStation: 'Dhanbad',
        nextStation: 'Asansol',
        status: 'ON_TIME' as const,
        delay: 0,
      },
    };

    const trainData = knownTrains[trainNumber];
    if (!trainData) return null;

    return {
      trainNumber,
      status: trainData.status || 'ON_TIME',
      delay: trainData.delay || 0,
      lastStation: trainData.lastStation,
      nextStation: trainData.nextStation,
      actualArrival: Date.now(),
      expectedArrival: Date.now() + (trainData.delay || 0) * 60000,
      coordinateQuality: 'none',
      sourceConfidence: 0.3,
    };
  }

  /**
   * Clear old cache entries (call periodically)
   */
  clearOldCache() {
    const now = Date.now();
    for (const [key, { timestamp }] of this.scrapedCache) {
      if (now - timestamp > this.CACHE_TTL_MS) {
        this.scrapedCache.delete(key);
      }
    }
  }

  private recordSuccess(latencyMs: number) {
    this.stats.successCount++;
    this.stats.lastSuccessTime = Date.now();
    // Update average latency
    this.stats.avgLatencyMs =
      (this.stats.avgLatencyMs * (this.stats.successCount - 1) + latencyMs) / this.stats.successCount;
    this.stats.lastError = null;
  }

  private recordFailure(error: string) {
    this.stats.failureCount++;
    this.stats.lastError = error;
  }
}

export const ntesProvider = new NTESProvider();
