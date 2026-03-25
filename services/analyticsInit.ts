/**
 * Analytics Service Initialization
 * Starts background jobs for metrics aggregation
 */

let analyticsInitialized = false;
let congestionAnalyzer: any = null;

/**
 * Initialize analytics services
 * Should be called once on server startup
 */
export function initializeAnalyticsServices() {
  if (analyticsInitialized) {
    console.log('[Analytics Init] Services already initialized');
    return;
  }

  if (typeof window !== 'undefined') {
    // Skip on client-side
    return;
  }

  try {
    // Load congestion analyzer
    congestionAnalyzer = require('./congestionAnalyzer').default;

    // Start background jobs
    if (congestionAnalyzer) {
      congestionAnalyzer.startBackgroundJob();
      console.log('[Analytics Init] Congestion analyzer background job started');
    }

    analyticsInitialized = true;
    console.log('[Analytics Init] All analytics services initialized');
  } catch (e) {
    console.error('[Analytics Init] Failed to initialize services:', e);
  }
}

/**
 * Shutdown analytics services gracefully
 */
export function shutdownAnalyticsServices() {
  try {
    if (congestionAnalyzer) {
      congestionAnalyzer.stopBackgroundJob();
      console.log('[Analytics Init] Congestion analyzer stopped');
    }
    analyticsInitialized = false;
  } catch (e) {
    console.error('[Analytics Init] Error during shutdown:', e);
  }
}

export default {
  initializeAnalyticsServices,
  shutdownAnalyticsServices,
};
