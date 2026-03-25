/**
 * Structured Logging Service
 * Centralized logging with Winston
 * Supports console, file, and cloud logging
 */

import winston, { Logger, transports, format } from 'winston';
import * as fs from 'fs';
import * as path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Create a logger instance
 */
let logger: Logger | null = null;

export function getLogger(): Logger {
  if (logger) {
    return logger;
  }

  const isDevelopment = process.env.NODE_ENV !== 'production';
  const logLevel = process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info');

  logger = winston.createLogger({
    level: logLevel,
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.metadata(),
      winston.format.json()
    ),
    defaultMeta: { service: 'railsense' },
    transports: [
      /**
       * Console transport (always enabled)
       */
      new transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ level, message, timestamp, metadata }) => {
            const meta = metadata && Object.keys(metadata).length > 0
              ? JSON.stringify(metadata)
              : '';
            return `${timestamp} [${level}]: ${message} ${meta}`;
          })
        )
      }),

      /**
       * Error file transport
       */
      new transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        format: winston.format.json()
      }),

      /**
       * Combined file transport
       */
      new transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        format: winston.format.json()
      })
    ]
  });

  /**
   * Handle uncaught exceptions
   */
  logger.exceptions.handle(
    new transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: winston.format.json()
    })
  );

  /**
   * Handle unhandled rejections
   */
  logger.rejections.handle(
    new transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: winston.format.json()
    })
  );

  return logger;
}

/**
 * Logging functionality
 */
export const log = {
  /**
   * Log info level
   */
  info: (message: string, meta?: Record<string, any>) => {
    getLogger().info(message, meta);
  },

  /**
   * Log error level
   */
  error: (message: string, error?: Error | string, meta?: Record<string, any>) => {
    const errorObj = typeof error === 'string' ? { error } : error;
    getLogger().error(message, { ...(errorObj && { error: errorObj }), ...meta });
  },

  /**
   * Log warning level
   */
  warn: (message: string, meta?: Record<string, any>) => {
    getLogger().warn(message, meta);
  },

  /**
   * Log debug level
   */
  debug: (message: string, meta?: Record<string, any>) => {
    getLogger().debug(message, meta);
  },

  /**
   * Log HTTP requests
   */
  http: (method: string, path: string, statusCode: number, responseTime: number, meta?: Record<string, any>) => {
    getLogger().info(`${method} ${path} - ${statusCode}`, {
      http: { method, path, statusCode, responseTimeMs: responseTime },
      ...meta
    });
  },

  /**
   * Log API calls
   */
  api: (endpoint: string, method: string, statusCode: number, responseTimeMs: number, userId?: number) => {
    getLogger().info(`API ${method} ${endpoint}`, {
      api: {
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        userId
      }
    });
  },

  /**
   * Log authentication events
   */
  auth: (action: 'LOGIN' | 'LOGOUT' | 'FAILED_LOGIN' | 'SIGNUP' | 'TOKEN_REFRESH', userId?: number, meta?: Record<string, any>) => {
    getLogger().info(`Auth: ${action}`, {
      auth: { action, userId, ...meta }
    });
  },

  /**
   * Log database operations
   */
  database: (operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE', table: string, recordCount?: number, meta?: Record<string, any>) => {
    getLogger().debug(`DB ${operation} ${table}`, {
      database: { operation, table, recordCount, ...meta }
    });
  },

  /**
   * Log cache operations
   */
  cache: (operation: 'GET' | 'SET' | 'DELETE' | 'HIT' | 'MISS', key: string, meta?: Record<string, any>) => {
    getLogger().debug(`Cache ${operation} ${key}`, {
      cache: { operation, key, ...meta }
    });
  },

  /**
   * Log prediction/ML operations
   */
  prediction: (trainNumber: string, predictionType: string, confidence: number, meta?: Record<string, any>) => {
    getLogger().info(`Prediction ${predictionType} for train ${trainNumber}`, {
      prediction: { trainNumber, predictionType, confidence, ...meta }
    });
  },

  /**
   * Log train tracking events
   */
  train: (trainNumber: string, event: string, station?: string, status?: string, meta?: Record<string, any>) => {
    getLogger().info(`Train ${trainNumber}: ${event}`, {
      train: { trainNumber, event, station, status, ...meta }
    });
  },

  /**
   * Log system events
   */
  system: (event: string, severity: 'info' | 'warn' | 'error' = 'info', meta?: Record<string, any>) => {
    const method = severity === 'error' ? 'error' : severity === 'warn' ? 'warn' : 'info';
    getLogger()[method as keyof Logger](`System: ${event}`, { system: { event, severity, ...meta } });
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, durationMs: number, threshold?: number) => {
    const isSlowQuery = threshold && durationMs > threshold;
    const level = isSlowQuery ? 'warn' : 'debug';
    const logger = getLogger();
    (logger[level as keyof Logger] as Function)(`Performance: ${operation}`, {
      performance: { operation, durationMs, isSlowQuery }
    });
  },

  /**
   * Log alerts
   */
  alert: (alertType: string, trainNumber: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string) => {
    getLogger().warn(`Alert: ${alertType}`, {
      alert: { alertType, trainNumber, severity, message }
    });
  }
};

/**
 * Request logging middleware
 */
export function requestLoggingMiddleware(req: any, res: any, next: any) {
  const startTime = Date.now();
  const originalSend = res.send;

  res.send = function (data: any) {
    const duration = Date.now() - startTime;
    const method = req.method;
    const path = req.originalUrl || req.url;
    const statusCode = res.statusCode;

    log.http(method, path, statusCode, duration, {
      contentLength: res.get('content-length'),
      userAgent: req.get('user-agent'),
      ip: req.ip
    });

    originalSend.call(this, data);
  };

  next();
}

/**
 * Error logging middleware
 */
export function errorLoggingMiddleware(error: any, req: any, res: any, next: any) {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Unknown error';

  log.error(`Error: ${message}`, error, {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    userId: req.user?.id
  });

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
}

/**
 * Get logs file path
 */
export function getLogsPath(): string {
  return logsDir;
}

/**
 * Helper to get recent logs
 */
export function getRecentLogs(filename: 'error.log' | 'combined.log' = 'combined.log', lines: number = 100): string[] {
  try {
    const logPath = path.join(logsDir, filename);
    if (!fs.existsSync(logPath)) {
      return [];
    }

    const content = fs.readFileSync(logPath, 'utf-8');
    return content.split('\n').slice(-lines).filter(line => line.trim());
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}
