```javascript
const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const accountRoutes = require('./account.routes');
const transactionRoutes = require('./transaction.routes');
const config = require('../../config/config');

const router = express.Router();

const defaultRoutes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/accounts',
    route: accountRoutes,
  },
  {
    path: '/transactions',
    route: transactionRoutes,
  },
];

// Add docs route only in development
if (config.env === 'development') {
  // Example for a docs route, you might use swagger-ui-express here
  // const docsRoute = require('./docs.route');
  // defaultRoutes.push({
  //   path: '/docs',
  //   route: docsRoute,
  // });
}

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
```