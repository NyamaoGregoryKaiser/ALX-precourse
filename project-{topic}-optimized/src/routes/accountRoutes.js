const express = require('express');
const accountController = require('../controllers/accountController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// User-specific account routes
router.post('/', authenticate, accountController.createAccount); // Create account for self
router.get('/my', authenticate, accountController.getMyAccounts); // Get all accounts for self
router.get('/:id', authenticate, accountController.getAccount); // Get specific account (checks ownership/admin)
router.put('/:id', authenticate, accountController.updateAccount); // Update specific account (checks ownership/admin)
router.delete('/:id', authenticate, accountController.deleteAccount); // Delete specific account (checks ownership/admin)

// Admin-only operations (if needed, e.g., to list all accounts in the system)
// router.get('/', authenticate, authorize(USER_ROLES.ADMIN), accountController.getAllAccountsAdmin); // Not implemented yet

module.exports = router;