import commentService from './comment.service.js';
import catchAsync from '../utils/catchAsync.js';
import APIFeatures from '../utils/apiFeatures.js';

const addComment = catchAsync(async (req, res) => {
  const newComment = await commentService.addCommentToTask(req.params.taskId, req.user.id, req.body);
  res.status(201).json({
    status: 'success',
    data: {
      comment: newComment,
    },
  });
});

const getCommentsForTask = catchAsync(async (req, res) => {
  const features = new APIFeatures({}, req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const comments = await commentService.getCommentsByTaskId(req.params.taskId, features.build());
  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: {
      comments,
    },
  });
});

const getComment = catchAsync(async (req, res) => {
  const comment = await commentService.getCommentById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: {
      comment,
    },
  });
});

const updateComment = catchAsync(async (req, res) => {
  const updatedComment = await commentService.updateComment(req.params.id, req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      comment: updatedComment,
    },
  });
});

const deleteComment = catchAsync(async (req, res) => {
  await commentService.deleteComment(req.params.id, req.user.id, req.user.role);
  res.status(204).send();
});


export default {
  addComment,
  getCommentsForTask,
  getComment,
  updateComment,
  deleteComment,
};
```

```javascript