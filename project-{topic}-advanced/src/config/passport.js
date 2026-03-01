```javascript
// src/config/passport.js
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const config = require('./config');
const { tokenTypes } = require('./tokens');
const { User } = require('../models');

const jwtOptions = {
    secretOrKey: config.jwt.secret,
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
};

const jwtVerify = async (payload, done) => {
    // ALX Principle: Token Verification
    // Ensure JWT is valid, not expired, and user exists.
    try {
        if (payload.type !== tokenTypes.ACCESS) {
            throw new Error('Invalid token type');
        }
        const user = await User.findByPk(payload.sub);
        if (!user) {
            return done(null, false);
        }
        done(null, user);
    } catch (error) {
        done(error, false);
    }
};

module.exports = {
    jwtStrategy: new JwtStrategy(jwtOptions, jwtVerify),
};
```