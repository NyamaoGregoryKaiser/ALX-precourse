```javascript
const express = require('express');
const merchantController = require('../controllers/merchantController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate, Schemas } = require('../utils/validator');

const router = express.Router();

router.use(protect); // All merchant routes require authentication

// Merchant specific routes
router.route('/me')
  .get(restrictTo('merchant', 'admin'), merchantController.getMyMerchantAccount)
  .patch(restrictTo('merchant', 'admin'), validate(Schemas.updateMerchant), merchantController.updateMyMerchantAccount);

// Admin-only routes for general merchant management
router.use(restrictTo('admin'));
router.route('/')
  .post(validate(Schemas.createMerchant), merchantController.createMerchant)
  .get(merchantController.getAllMerchants);

router.route('/:id')
  .get(merchantController.getMerchantById)
  .patch(validate(Schemas.updateMerchant), merchantController.updateMerchant)
  .delete(merchantController.deleteMerchant); // Soft delete

module.exports = router;
```