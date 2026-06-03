```typescript
import { createLogger, format, transports } from 'winston';
import { env } from '../config/env';

const { combine, timestamp, printf, colorize, align } = format;

const logFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let logMessage = `${timestamp} [${level}] ${message}`;
  if (stack) {
    logMessage += `\n${stack}`;
  }
  if (Object.keys(metadata).length > 0) {
    logMessage += ` ${JSON.stringify(metadata)}`;
  }
  return logMessage;
});

export const logger = createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // Include stack trace for errors
    env.NODE_ENV === 'development' ? colorize() : format.uncolorize(), // Colorize only in dev
    align(),
    logFormat
  ),
  transports: [
    new transports.Console(), // Log to console
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // Log errors to a file
    new transports.File({ filename: 'logs/combined.log' }), // Log all levels to a combined file
  ],
  exceptionHandlers: [ // Catch uncaught exceptions
    new transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [ // Catch unhandled promise rejections
    new transports.File({ filename: 'logs/rejections.log' }),
  ],
});
```

#### Modules (Auth, Users, Categories, Tasks)

**Module: Auth**