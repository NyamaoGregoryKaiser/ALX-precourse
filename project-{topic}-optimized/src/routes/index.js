const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');
const paymentRoutes = require('./paymentRoutes');

const router = express.Router();

// Define API version
const API_V1 = '/v1';

// Mount specific routes
router.use(`${API_V1}/auth`, authRoutes);
router.use(`${API_V1}/users`, userRoutes);
router.use(`${API_V1}/accounts`, accountRoutes);
router.use(`${API_V1}/transactions`, transactionRoutes);
router.use(`${API_V1}/payments`, paymentRoutes);

module.exports = router;