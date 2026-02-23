```javascript
const express = require('express');
const commentController = require('../controllers/commentController');
const { protect } = require('../middlewares/auth');
const { validate, commentSchemas } = require('../middlewares/validation');

// Merge params from parent route (taskRoutes)
const router = express.Router({ mergeParams: true });

// All comment routes require authentication (already handled by projectRoutes.use(protect))
// router.use(protect);

router.route('/')
  .get(commentController.getComments)
  .post(validate(commentSchemas.createComment), commentController.createComment);

router.route('/:id')
  .patch(validate(commentSchemas.updateComment), commentController.updateComment)
  .delete(validate(commentSchemas.getCommentById), commentController.deleteComment);

module.exports = router;
```