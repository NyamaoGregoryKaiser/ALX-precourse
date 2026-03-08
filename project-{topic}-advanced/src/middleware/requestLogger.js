```javascript
const logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  logger.http(`${req.method} ${req.originalUrl}`);
  next();
};

module.exports = requestLogger;
```