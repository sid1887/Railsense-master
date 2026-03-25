/**
 * Logger Service
 * Handles both console logging and file logging for debugging
 * Writes to logs/app.log with timestamps
 */

import fs from 'fs';
import path from 'path';

const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'app.log');

// Ensure logs directory exists
function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Get formatted timestamp for logs
 */
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

/**
 * Write message to both console and file
 */
function writeLog(level: string, message: string, data?: any): void {
  ensureLogDir();

  const timestamp = getTimestamp();
  const logMessage = data
    ? `[${timestamp}] [${level}] ${message} ${JSON.stringify(data)}`
    : `[${timestamp}] [${level}] ${message}`;

  // Console output with color
  const colorMap = {
    INFO: '\x1b[36m', // cyan
    WARN: '\x1b[33m', // yellow
    ERROR: '\x1b[31m', // red
    DEBUG: '\x1b[35m', // magenta
    SUCCESS: '\x1b[32m', // green
  };

  const color = colorMap[level as keyof typeof colorMap] || '';
  const reset = '\x1b[0m';

  console.log(`${color}${logMessage}${reset}`);

  // File logging
  try {
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

/**
 * Logger interface exported to services
 */
export const logger = {
  info: (message: string, data?: any) => writeLog('INFO', message, data),
  warn: (message: string, data?: any) => writeLog('WARN', message, data),
  error: (message: string, data?: any) => writeLog('ERROR', message, data),
  debug: (message: string, data?: any) => writeLog('DEBUG', message, data),
  success: (message: string, data?: any) => writeLog('SUCCESS', message, data),
};

/**
 * Get recent log lines for display in UI (e.g., debug panel)
 */
export function getRecentLogs(lines: number = 50): string[] {
  try {
    ensureLogDir();
    if (!fs.existsSync(LOG_FILE)) {
      return ['[No logs yet]'];
    }

    const content = fs.readFileSync(LOG_FILE, 'utf-8');
    return content.split('\n').slice(-lines).filter((line) => line.trim());
  } catch (err) {
    return [`[Error reading logs: ${err}]`];
  }
}

/**
 * Clear log file
 */
export function clearLogs(): void {
  try {
    ensureLogDir();
    fs.writeFileSync(LOG_FILE, '');
    logger.info('Logs cleared');
  } catch (err) {
    logger.error('Failed to clear logs:', err);
  }
}

export default logger;
