```typescript
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const WinstonLogger = WinstonModule.createLogger({
  transports: [
    // Console transport for development/local debugging
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        nestWinstonModuleUtilities.format.nestLike('TaskManagementApp', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),
    // File transport for all logs
    new winston.transports.DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m', // Max size of log file before rotation
      maxFiles: '14d', // Keep logs for 14 days
      level: 'info', // Log level for this transport
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(), // JSON format for structured logging
      ),
    }),
    // File transport for error logs only
    new winston.transports.DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error', // Only log errors here
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    }),
  ],
});
```