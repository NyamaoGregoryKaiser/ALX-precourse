```javascript
const Joi = require('joi');

const createPost = {
  body: Joi.object().keys({
    title: Joi.string().required().min(5).max(255),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).message('Slug must be in kebab-case format'),
    content: Joi.string().required(),
    excerpt: Joi.string().max(500).allow(''),
    status: Joi.string().valid('draft', 'published', 'archived').default('draft'),
    featuredImage: Joi.string().uri().allow(''),
    categoryId: Joi.string().uuid().allow(null),
  }).unknown(false),
};

const getPosts = {
  query: Joi.object().keys({
    title: Joi.string(),
    slug: Joi.string(),
    authorId: Joi.string().uuid(),
    categoryId: Joi.string().uuid(),
    status: Joi.string().valid('draft', 'published', 'archived'),
    sortBy: Joi.string().default('createdAt:desc'),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

const getPost = {
  params: Joi.object().keys({
    postId: Joi.string().uuid().required(),
  }),
};

const updatePost = {
  params: Joi.object().keys({
    postId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    title: Joi.string().min(5).max(255),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).message('Slug must be in kebab-case format'),
    content: Joi.string(),
    excerpt: Joi.string().max(500).allow(''),
    status: Joi.string().valid('draft', 'published', 'archived'),
    featuredImage: Joi.string().uri().allow(''),
    categoryId: Joi.string().uuid().allow(null),
  }).min(1).unknown(false),
};

const deletePost = {
  params: Joi.object().keys({
    postId: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
};
```