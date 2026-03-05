const express = require('express');
const authRoutes = require('./routes/authRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const scrapeJobRoutes = require('./routes/scrapeJobRoutes');

const router = express.Router();

const defaultRoutes = [
  { path: '/auth', route: authRoutes },
  { path: '/scrapers', route: scraperRoutes },
  { path: '/jobs', route: scrapeJobRoutes },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;