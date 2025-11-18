/**
 * Centralized Logging Utility
 * Replaces console.log statements with environment-aware logging
 *
 * Usage:
 * ```ts
 * import { logger } from '@/lib/logger';
 *
 * logger.debug('User data:', userData);
 * logger.info('Operation completed');
 * logger.warn('Deprecated API usage');
 * logger.error('Failed to fetch data', error);
 * ```
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabledInProduction: boolean;
  minLevel: LogLevel;
}

const config: LoggerConfig = {
  enabledInProduction: false,
  minLevel: 'debug',
};

const logLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

/**
 * Check if logging is enabled for the given level
 */
function isEnabled(level: LogLevel): boolean {
  // In production, only log if explicitly enabled
  if (isProduction && !config.enabledInProduction) {
    return level === 'error' || level === 'warn';
  }

  // In development, respect minLevel
  return logLevels[level] >= logLevels[config.minLevel];
}

/**
 * Format log arguments for better readability
 */
function formatArgs(args: any[]): any[] {
  return args.map((arg) => {
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
        name: arg.name,
      };
    }
    return arg;
  });
}

/**
 * Debug level logging - Development only
 * Use for detailed debugging information
 */
function debug(...args: any[]): void {
  if (isEnabled('debug')) {
    console.log('[DEBUG]', ...formatArgs(args));
  }
}

/**
 * Info level logging
 * Use for general informational messages
 */
function info(...args: any[]): void {
  if (isEnabled('info')) {
    console.info('[INFO]', ...formatArgs(args));
  }
}

/**
 * Warning level logging
 * Use for warning messages that don't prevent operation
 */
function warn(...args: any[]): void {
  if (isEnabled('warn')) {
    console.warn('[WARN]', ...formatArgs(args));
  }
}

/**
 * Error level logging
 * Use for error messages - always logged
 */
function error(...args: any[]): void {
  if (isEnabled('error')) {
    console.error('[ERROR]', ...formatArgs(args));
  }
}

/**
 * Group related log messages
 */
function group(label: string, callback: () => void): void {
  if (isDevelopment) {
    console.group(label);
    callback();
    console.groupEnd();
  } else {
    callback();
  }
}

/**
 * Time a function execution
 */
function time<T>(label: string, fn: () => T): T {
  if (isDevelopment) {
    console.time(label);
    const result = fn();
    console.timeEnd(label);
    return result;
  }
  return fn();
}

/**
 * Time an async function execution
 */
async function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  if (isDevelopment) {
    console.time(label);
    const result = await fn();
    console.timeEnd(label);
    return result;
  }
  return fn();
}

export const logger = {
  debug,
  info,
  warn,
  error,
  group,
  time,
  timeAsync,
};

// Re-export for backwards compatibility
export default logger;
