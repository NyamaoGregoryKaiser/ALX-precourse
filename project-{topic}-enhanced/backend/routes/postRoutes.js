```javascript
const express = require('express');
const {
  createPost,
  getAllPosts,
  getPost,
  updatePost,
  deletePost
} = require('../controllers/postController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router
  .route('/')
  .post(protect, authorize('admin', 'editor', 'author'), createPost)
  .get(getAllPosts); // Publicly accessible with caching

router
  .route('/:identifier') // Can be ID or slug
  .get(getPost) // Publicly accessible with caching
  .put(protect, authorize('admin', 'editor', 'author'), updatePost)
  .delete(protect, authorize('admin', 'editor', 'author'), deletePost);

module.exports = router;
```