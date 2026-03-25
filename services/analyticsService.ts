/**
 * Analytics Service
 * Centralized metrics tracking for system monitoring
 */

export interface Metrics {
  activeSubscriptions: number;
  totalUpdatesLastMinute: number;
  averageLatency: number;
  uptime: number;
  peakSubscriptions: number;
}

const metricsStore = {
  activeSubscriptions: 0,
  totalUpdatesLastMinute: 0,
  peakSubscriptions: 0,
  startTime: Date.now(),
  lastUpdateTimes: [] as number[],
};

/**
 * Record new WebSocket subscription
 */
export function recordSubscription(): void {
  metricsStore.activeSubscriptions++;
  metricsStore.peakSubscriptions = Math.max(
    metricsStore.peakSubscriptions,
    metricsStore.activeSubscriptions
  );
}

/**
 * Record WebSocket unsubscription
 */
export function recordUnsubscription(): void {
  metricsStore.activeSubscriptions = Math.max(0, metricsStore.activeSubscriptions - 1);
}

/**
 * Record a train data update
 */
export function recordUpdate(): void {
  const now = Date.now();
  metricsStore.lastUpdateTimes.push(now);

  // Keep only last 60 seconds
  metricsStore.lastUpdateTimes = metricsStore.lastUpdateTimes.filter(
    (t) => now - t < 60000
  );
}

/**
 * Get current metrics
 */
export function getMetrics(): Metrics {
  const now = Date.now();
  const uptime = now - metricsStore.startTime;

  // Calculate average latency (simulated based on load)
  const baseLatency = 50;
  const loadFactor = (metricsStore.activeSubscriptions / 100) * 50;
  const averageLatency = Math.min(baseLatency + loadFactor, 200);

  return {
    activeSubscriptions: metricsStore.activeSubscriptions,
    totalUpdatesLastMinute: metricsStore.lastUpdateTimes.length,
    averageLatency: Math.round(averageLatency),
    uptime: Math.round(uptime),
    peakSubscriptions: metricsStore.peakSubscriptions,
  };
}

/**
 * Reset metrics (for testing)
 */
export function resetMetrics(): void {
  metricsStore.activeSubscriptions = 0;
  metricsStore.totalUpdatesLastMinute = 0;
  metricsStore.peakSubscriptions = 0;
  metricsStore.startTime = Date.now();
  metricsStore.lastUpdateTimes = [];
}
