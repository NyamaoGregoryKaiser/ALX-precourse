const Joi = require('joi');
const { uuid } = require('./custom.validation');

const createComment = Joi.object().keys({
  content: Joi.string().required(),
  taskId: Joi.string().custom(uuid).required(),
  // userId is taken from authenticated user (req.user.id) in controller
});

const getComments = Joi.object().keys({
  taskId: Joi.string().custom(uuid),
  userId: Joi.string().custom(uuid),
  sortBy: Joi.string(),
  limit: Joi.number().integer(),
  page: Joi.number().integer(),
});

const getComment = Joi.object().keys({
  commentId: Joi.string().custom(uuid).required(),
});

const updateComment = Joi.object().keys({
  commentId: Joi.string().custom(uuid).required(),
  body: Joi.object()
    .keys({
      content: Joi.string(),
    })
    .min(1),
});

const deleteComment = Joi.object().keys({
  commentId: Joi.string().custom(uuid).required(),
});

module.exports = {
  createComment,
  getComments,
  getComment,
  updateComment,
  deleteComment,
};