```javascript
// This file is conceptually where a direct database connection might be managed
// if Mongoose wasn't handling it directly in server.js.
// For MongoDB with Mongoose, the connection is typically established at app startup.
// This file can serve as a placeholder for more complex DB setup or different DB types.

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(config.mongoURI);
    logger.info('MongoDB connected successfully (via connectDB function)');
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;

// Note: In this project, `server.js` directly calls `mongoose.connect`.
// This file exists to demonstrate a dedicated `db.js` if the connection logic
// needed to be more encapsulated or reusable beyond initial startup.
```