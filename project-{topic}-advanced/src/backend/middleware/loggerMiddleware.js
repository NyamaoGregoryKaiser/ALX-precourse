```javascript
const morgan = require('morgan');
const logger = require('../utils/logger');

// Custom token for morgan to include userId (if authenticated)
morgan.token('userId', (req) => req.user ? req.user.id : 'anonymous');

// Custom format string for Morgan
const morganFormat = process.env.NODE_ENV === 'development'
    ? ':method :url :status :res[content-length] - :response-time ms'
    : ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" userId::userId';

// Create a stream for morgan to pipe logs to winston
const morganStream = {
    write: (message) => logger.http(message.trim()),
};

// Morgan middleware setup
const loggerMiddleware = morgan(morganFormat, { stream: morganStream });

module.exports = loggerMiddleware;
```