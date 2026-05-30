const express = require('express');
const auth = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const commentValidation = require('../../validations/comment.validation');
const commentController = require('../../controllers/comment.controller');

const router = express.Router();

router
  .route('/')
  .post(auth('manageComments'), validate(commentValidation.createComment), commentController.createComment)
  .get(auth('getComments'), validate(commentValidation.getComments), commentController.getComments);

router
  .route('/:commentId')
  .get(auth('getComments'), validate(commentValidation.getComment), commentController.getComment)
  .patch(auth('manageComments'), validate(commentValidation.updateComment), commentController.updateComment)
  .delete(auth('manageComments'), validate(commentValidation.deleteComment), commentController.deleteComment);

module.exports = router;