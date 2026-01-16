// Simple console-based logger for Next.js compatibility
// Avoids pino worker thread issues in Next.js environment

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const levels = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
};

const currentLevel = levels[LOG_LEVEL as keyof typeof levels] || levels.info;

const logger = {
  trace: (...args: any[]) => {
    if (currentLevel <= levels.trace) {
      console.log('[TRACE]', new Date().toISOString(), ...args);
    }
  },
  debug: (...args: any[]) => {
    if (currentLevel <= levels.debug) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  info: (...args: any[]) => {
    if (currentLevel <= levels.info) {
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },
  warn: (...args: any[]) => {
    if (currentLevel <= levels.warn) {
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },
  error: (...args: any[]) => {
    if (currentLevel <= levels.error) {
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },
  fatal: (...args: any[]) => {
    if (currentLevel <= levels.fatal) {
      console.error('[FATAL]', new Date().toISOString(), ...args);
    }
  },
};

export default logger;
