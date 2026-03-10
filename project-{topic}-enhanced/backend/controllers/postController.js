```javascript
const postService = require('../services/postService');
const { asyncHandler, authorize } = require('../middleware/auth');
const ApiError = require('../utils/ApiError');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

/**
 * @desc    Create a new post
 * @route   POST /api/v1/posts
 * @access  Private (Editor, Admin, Author)
 */
exports.createPost = asyncHandler(async (req, res, next) => {
  // Author can only create posts for themselves
  if (req.user.role === 'author' && req.body.authorId !== req.user.id) {
    return next(new ApiError(403, 'Authors can only create posts under their own ID.'));
  }
  const post = await postService.createPost(req.body, req.user.id);
  res.status(201).json({ success: true, data: post });
});

/**
 * @desc    Get all posts
 * @route   GET /api/v1/posts
 * @access  Public
 */
exports.getAllPosts = [
  cacheMiddleware('posts'), // Apply caching
  asyncHandler(async (req, res, next) => {
    const { posts, count } = await postService.getAllPosts(req.query);
    res.status(200).json({ success: true, count, data: posts });
  })
];

/**
 * @desc    Get single post by ID or slug
 * @route   GET /api/v1/posts/:identifier
 * @access  Public
 */
exports.getPost = [
  cacheMiddleware('posts'), // Apply caching
  asyncHandler(async (req, res, next) => {
    const post = await postService.getPostByIdOrSlug(req.params.identifier);
    res.status(200).json({ success: true, data: post });
  })
];

/**
 * @desc    Update a post
 * @route   PUT /api/v1/posts/:id
 * @access  Private (Editor, Admin, Author - only own posts)
 */
exports.updatePost = asyncHandler(async (req, res, next) => {
  let post = await postService.getPostByIdOrSlug(req.params.id);

  // Author can only update their own posts
  if (req.user.role === 'author' && post.authorId !== req.user.id) {
    return next(new ApiError(403, 'Authors can only update their own posts.'));
  }

  post = await postService.updatePost(req.params.id, req.body);
  await clearCache('posts:*'); // Clear cache after update
  res.status(200).json({ success: true, data: post });
});

/**
 * @desc    Delete a post
 * @route   DELETE /api/v1/posts/:id
 * @access  Private (Editor, Admin, Author - only own posts)
 */
exports.deletePost = asyncHandler(async (req, res, next) => {
  const post = await postService.getPostByIdOrSlug(req.params.id);

  // Author can only delete their own posts
  if (req.user.role === 'author' && post.authorId !== req.user.id) {
    return next(new ApiError(403, 'Authors can only delete their own posts.'));
  }

  await postService.deletePost(req.params.id);
  await clearCache('posts:*'); // Clear cache after deletion
  res.status(200).json({ success: true, data: {} });
});
```