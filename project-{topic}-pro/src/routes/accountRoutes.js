const express = require('express');
const AccountController = require('../controllers/accountController');
const auth = require('../middleware/auth');
const { cacheMiddleware } = require('../middleware/caching');

const router = express.Router();

// All account routes are protected and require authentication
router.use(auth());

router.get('/', cacheMiddleware(60), AccountController.getUserAccounts); // Cache for 60 seconds
router.post('/', AccountController.createAccount);
router.get('/:id', cacheMiddleware(30), AccountController.getAccountById);
router.patch('/:id', AccountController.updateAccount);

module.exports = router;