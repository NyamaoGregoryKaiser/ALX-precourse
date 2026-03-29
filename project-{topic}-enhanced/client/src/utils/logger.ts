// client/src/utils/logger.ts
// A simple client-side logger. In a real application, you might send these to a logging service.

const isDevelopment = import.meta.env.MODE === 'development';

const logger = {
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info('%c[INFO]', 'color: #2196F3; font-weight: bold;', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn('%c[WARN]', 'color: #FFC107; font-weight: bold;', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('%c[ERROR]', 'color: #F44336; font-weight: bold;', ...args);
  },
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug('%c[DEBUG]', 'color: #9E9E9E; font-weight: bold;', ...args);
    }
  },
};

export default logger;