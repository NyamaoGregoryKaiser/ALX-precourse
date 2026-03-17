```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` }); // Load specific .env based on NODE_ENV
require('dotenv').config({ path: '.env' }); // Fallback to general .env

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  appName: 'Product Management API',
  appSecret: process.env.APP_SECRET || 'a_very_secret_app_key', // Used for general app security, not JWT
};
```