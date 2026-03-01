```javascript
// src/routes/index.js
const express = require('express');
const merchantRoutes = require('./merchant.routes');
const userRoutes = require('./user.routes');
const transactionRoutes = require('./transaction.routes');
const webhookRoutes = require('./webhook.routes');
const { auth } = require('../middlewares/auth'); // Internal auth middleware
const { apiKeyAuth } = require('../middlewares/apiKeyAuth'); // API Key auth for merchants

const router = express.Router();

const defaultRoutes = [
    {
        path: '/merchants',
        route: merchantRoutes,
        middleware: [auth], // Only authenticated internal users can manage merchants
    },
    {
        path: '/users',
        route: userRoutes,
        middleware: [auth], // Only authenticated internal users can manage users
    },
    {
        path: '/transactions',
        route: transactionRoutes,
        middleware: [apiKeyAuth], // Merchants interact with transactions via API keys
    },
    {
        path: '/webhooks',
        route: webhookRoutes,
        middleware: [], // Webhook endpoints are typically public, with signature verification in controller
    }
];

defaultRoutes.forEach((route) => {
    router.use(route.path, ...route.middleware, route.route);
});

module.exports = router;
```