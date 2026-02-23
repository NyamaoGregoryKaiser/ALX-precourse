```javascript
const commentService = require('../services/commentService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getComments = catchAsync(async (req, res) => {
  const comments = await commentService.getCommentsByTaskId(req.params.taskId, req.user.id, req.user.role);
  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: { comments },
  });
});

const createComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const comment = await commentService.createComment(
    req.params.taskId,
    content,
    req.user.id // Author is the logged-in user
  );
  res.status(201).json({
    status: 'success',
    data: { comment },
  });
});

const updateComment = catchAsync(async (req, res, next) => {
  const { content } = req.body;
  const updatedComment = await commentService.updateComment(
    req.params.taskId,
    req.params.id,
    content,
    req.user.id,
    req.user.role
  );
  res.status(200).json({
    status: 'success',
    data: { comment: updatedComment },
  });
});

const deleteComment = catchAsync(async (req, res, next) => {
  await commentService.deleteComment(
    req.params.taskId,
    req.params.id,
    req.user.id,
    req.user.role
  );
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  getComments,
  createComment,
  updateComment,
  deleteComment,
};
```