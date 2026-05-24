```javascript
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const { config } = require('./config');
const { User } = require('../models');
const logger = require('../utils/logger');

const jwtOptions = {
  secretOrKey: config.jwt.secret,
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
  try {
    const user = await User.findByPk(payload.sub);
    if (!user) {
      return done(null, false);
    }
    // Attach user to request object
    done(null, user);
  } catch (error) {
    logger.error('JWT verification error:', error);
    done(error, false);
  }
};

const jwtStrategy = new JwtStrategy(jwtOptions, jwtVerify);

module.exports = {
  jwtStrategy,
};
```