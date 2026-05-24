```javascript
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { postService } = require('../services');

const createPost = catchAsync(async (req, res) => {
  // Author ID comes from the authenticated user
  const authorId = req.user.id;
  const post = await postService.createPost(req.body, authorId);
  res.status(httpStatus.CREATED).send(post);
});

const getPosts = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['title', 'slug', 'authorId', 'categoryId', 'status']);
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'populate']);

  // For non-admin/editor roles, force status to 'published' unless explicitly requested and authorized
  if (req.user && (req.user.role === 'admin' || req.user.role === 'editor')) {
    // Admins and editors can query all statuses.
    // However, if no status is provided, we should still ensure only published posts
    // are exposed to the public view, unless explicitly filtered for 'draft' or 'archived'.
    // The `queryPosts` service handles the default to 'published' for public views.
  } else {
    filter.status = 'published'; // Public users can only see published posts
  }

  // Allow populating author/category for public views as well
  options.populate = ['author', 'category'];

  const result = await postService.queryPosts(filter, options);
  res.send(result);
});

const getPost = catchAsync(async (req, res) => {
  const populate = ['author', 'category'];
  const post = await postService.getPostById(req.params.postId, populate);

  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }

  // Only allow viewing drafts/archived posts if user is admin/editor or the author
  if (post.status !== 'published' && (!req.user || (req.user.role !== 'admin' && req.user.role !== 'editor' && req.user.id !== post.authorId))) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to view this post');
  }

  res.send(post);
});

const updatePost = catchAsync(async (req, res) => {
  const post = await postService.getPostById(req.params.postId);
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  // Ensure only author or admin can update
  if (req.user.role !== 'admin' && req.user.id !== post.authorId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to update this post');
  }

  const updatedPost = await postService.updatePostById(req.params.postId, req.body);
  res.send(updatedPost);
});

const deletePost = catchAsync(async (req, res) => {
  const post = await postService.getPostById(req.params.postId);
  if (!post) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Post not found');
  }
  // Ensure only author or admin can delete
  if (req.user.role !== 'admin' && req.user.id !== post.authorId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You are not authorized to delete this post');
  }

  await postService.deletePostById(req.params.postId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
};
```