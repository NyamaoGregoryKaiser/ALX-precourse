```javascript
// src/config/tokens.js
// ALX Principle: Enumeration for Clarity
// Define token types as constants to avoid magic strings and improve readability.
const tokenTypes = {
    ACCESS: 'access',
    REFRESH: 'refresh',
    RESET_PASSWORD: 'resetPassword',
    VERIFY_EMAIL: 'verifyEmail',
};

module.exports = {
    tokenTypes,
};
```