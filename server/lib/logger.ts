type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
const minLevel = LOG_LEVELS[currentLevel] ?? LOG_LEVELS.info;

function formatTimestamp(): string {
  return new Date().toISOString();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= minLevel;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const base = JSON.stringify({
    timestamp: formatTimestamp(),
    level,
    message,
    ...(context && Object.keys(context).length > 0 ? { context } : {}),
  });
  return base;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (shouldLog('debug')) {
      console.debug(formatMessage('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    if (shouldLog('info')) {
      console.info(formatMessage('info', message, context));
    }
  },

  warn(message: string, context?: LogContext) {
    if (shouldLog('warn')) {
      console.warn(formatMessage('warn', message, context));
    }
  },

  error(message: string, context?: LogContext) {
    if (shouldLog('error')) {
      console.error(formatMessage('error', message, context));
    }
  },

  child(context: LogContext) {
    return {
      debug: (message: string, extra?: LogContext) =>
        logger.debug(message, { ...context, ...extra }),
      info: (message: string, extra?: LogContext) =>
        logger.info(message, { ...context, ...extra }),
      warn: (message: string, extra?: LogContext) =>
        logger.warn(message, { ...context, ...extra }),
      error: (message: string, extra?: LogContext) =>
        logger.error(message, { ...context, ...extra }),
    };
  },
};
