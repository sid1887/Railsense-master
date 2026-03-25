/**
 * Error Tracking & Monitoring Service
 * Sentry integration with fallback to logging
 */

import * as Sentry from '@sentry/nextjs';
import { log } from '@/lib/logger';

// Error tracking configuration
const SENTRY_CONFIG = {
  enabled: process.env.SENTRY_ENABLED === 'true',
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_RATE || '0.1'),
  release: process.env.APP_VERSION || '2.1.0'
};

/**
 * Initialize Sentry
 */
export function initializeSentry(): void {
  if (!SENTRY_CONFIG.enabled || !SENTRY_CONFIG.dsn) {
    console.log('[Sentry] Disabled - using local logging only');
    return;
  }

  try {
    Sentry.init({
      dsn: SENTRY_CONFIG.dsn,
      environment: SENTRY_CONFIG.environment,
      tracesSampleRate: SENTRY_CONFIG.tracesSampleRate,
      release: SENTRY_CONFIG.release,
    });

    console.log('[Sentry] Initialized successfully');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Capture an exception
 */
export function captureException(error: Error | string, context?: Record<string, any>): void {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  // Always log to local logging system
  log.error('Exception captured', errorObj, context);

  // Send to Sentry if enabled
  if (SENTRY_CONFIG.enabled && SENTRY_CONFIG.dsn) {
    try {
      Sentry.captureException(errorObj, {
        contexts: context ? { custom: context } : undefined,
      });
    } catch (sentryError) {
      console.error('[Sentry] Error sending exception:', sentryError);
    }
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info', context?: Record<string, any>): void {
  const logContext = context || {};

  if (level === 'error' || level === 'fatal') {
    log.error(message, undefined, logContext);
  } else if (level === 'warning') {
    log.warn(message, logContext);
  } else if (level === 'debug') {
    log.debug(message, logContext);
  } else {
    log.info(message, logContext);
  }

  if (SENTRY_CONFIG.enabled && SENTRY_CONFIG.dsn) {
    try {
      Sentry.captureMessage(message, level as Sentry.SeverityLevel);
    } catch (sentryError) {
      console.error('[Sentry] Error sending message:', sentryError);
    }
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: number, email?: string, name?: string): void {
  if (SENTRY_CONFIG.enabled && SENTRY_CONFIG.dsn) {
    try {
      Sentry.setUser({
        id: String(userId),
        email,
        username: name,
      });
    } catch (error) {
      console.error('[Sentry] Error setting user context:', error);
    }
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  if (SENTRY_CONFIG.enabled && SENTRY_CONFIG.dsn) {
    try {
      Sentry.setUser(null);
    } catch (error) {
      console.error('[Sentry] Error clearing user context:', error);
    }
  }
}

/**
 * Add breadcrumb for error tracking
 */
export function addBreadcrumb(message: string, category: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info', data?: Record<string, any>): void {
  if (SENTRY_CONFIG.enabled && SENTRY_CONFIG.dsn) {
    try {
      Sentry.addBreadcrumb({
        message,
        category,
        level: level === 'warning' ? 'warning' : level,
        data,
        timestamp: Date.now() / 1000,
      });
    } catch (error) {
      console.error('[Sentry] Error adding breadcrumb:', error);
    }
  }

  // Also log locally
  const logMessage = `[${category}] ${message}`;
  if (level === 'error' || level === 'fatal') {
    log.error(logMessage, undefined, data);
  } else if (level === 'warning') {
    log.warn(logMessage, data);
  } else if (level === 'debug') {
    log.debug(logMessage, data);
  } else {
    log.info(logMessage, data);
  }
}

/**
 * Track API performance
 */
export function trackApiPerformance(endpoint: string, method: string, duration: number, statusCode: number): void {
  addBreadcrumb(
    `${method} ${endpoint} completed in ${duration}ms`,
    'api',
    statusCode >= 400 ? 'error' : statusCode >= 300 ? 'warning' : 'info',
    { endpoint, method, duration, statusCode }
  );
}

/**
 * Get Sentry status
 */
export function getSentryStatus(): {
  enabled: boolean;
  environment: string;
  configured: boolean;
  errorMessage?: string;
} {
  return {
    enabled: SENTRY_CONFIG.enabled,
    environment: SENTRY_CONFIG.environment,
    configured: SENTRY_CONFIG.enabled && !!SENTRY_CONFIG.dsn,
    ...(SENTRY_CONFIG.enabled && !SENTRY_CONFIG.dsn && {
      errorMessage: 'Sentry enabled but DSN not configured'
    })
  };
}

/**
 * API error handler wrapper
 */
export async function withErrorTracking<T>(
  fn: () => Promise<T>,
  context: { operation: string; userId?: number; metadata?: Record<string, any> }
): Promise<T> {
  try {
    setUserContext(context.userId || 0);
    addBreadcrumb(`Starting: ${context.operation}`, 'operation', 'info');

    const result = await fn();

    addBreadcrumb(`Completed: ${context.operation}`, 'operation', 'info');
    return result;
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    captureException(errorObj, {
      operation: context.operation,
      ...context.metadata
    });
    throw error;
  }
}

/**
 * Handler for unhandled promise rejections
 */
export function setupGlobalErrorHandling(): void {
  if (typeof window === 'undefined') {
    // Server-side error handling
    process.on('unhandledRejection', (reason: any) => {
      console.error('Unhandled Rejection:', reason);
      captureException(
        reason instanceof Error ? reason : new Error(String(reason)),
        { type: 'unhandledRejection' }
      );
    });

    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      captureException(error, { type: 'uncaughtException' });
    });
  } else {
    // Client-side error handling
    window.addEventListener('error', (event: ErrorEvent) => {
      console.error('Client Error:', event.error);
      captureException(event.error || event.message, { type: 'clientError' });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      console.error('Unhandled Promise Rejection:', event.reason);
      captureException(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandledPromiseRejection' }
      );
    });
  }
}
