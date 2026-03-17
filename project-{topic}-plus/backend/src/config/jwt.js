```javascript
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` });
require('dotenv').config({ path: '.env' });

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'super_secret_jwt_key',
  accessTokenExpiration: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '1h',
  refreshTokenExpiration: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
};
```