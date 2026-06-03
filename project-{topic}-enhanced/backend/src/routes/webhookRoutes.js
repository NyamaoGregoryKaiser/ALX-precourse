```javascript
const express = require('express');
const webhookController = require('../controllers/webhookController');
const { protect, restrictTo } = require('../middleware/auth'); // For future webhook management APIs
const { webhookSecret } = require('../config').webhook; // Secret for verifying incoming webhooks

const router = express.Router();

// Public endpoint for receiving webhooks from payment gateways or external services
// This endpoint typically doesn't need authentication for *this* server,
// but requires signature verification to ensure authenticity.
router.post('/incoming/:source', webhookController.receiveWebhook);

// Example: Routes for managing webhooks (e.g., creating/updating webhook subscriptions)
// These would typically be protected and restricted to merchants/admins.
// router.use(protect, restrictTo('merchant', 'admin'));
// router.route('/subscriptions')
//   .post(webhookController.createWebhookSubscription)
//   .get(webhookController.getWebhookSubscriptions);
// router.route('/subscriptions/:id')
//   .patch(webhookController.updateWebhookSubscription)
//   .delete(webhookController.deleteWebhookSubscription);

module.exports = router;
```