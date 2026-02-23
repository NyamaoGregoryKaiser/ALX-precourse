```javascript
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const config = require('../config');

// Helmet for setting security HTTP headers
const setSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Add 'unsafe-inline' if you use inline scripts (consider removing this)
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", config.frontendUrl], // Allow connections from frontend
      // frameAncestors: ["'self'", config.frontendUrl], // Uncomment if you embed in iframes
    },
  },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' }, // Prevent clickjacking
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  xssFilter: true, // Helmet's XSS filter (redundant with xss-clean but good fallback)
});

// CORS configuration
const corsConfig = cors({
  origin: config.frontendUrl, // Allow requests only from your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true, // Allow cookies to be sent
});

// XSS-clean middleware to sanitize user input
const xssSanitizer = xss();

module.exports = {
  setSecurityHeaders,
  corsConfig,
  xssSanitizer,
};
```