```javascript
const Joi = require('joi');

const createCategory = {
  body: Joi.object().keys({
    name: Joi.string().required().min(2).max(50),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).message('Slug must be in kebab-case format'),
    description: Joi.string().allow('').max(500),
  }).unknown(false), // Disallow unknown fields
};

const getCategories = {
  query: Joi.object().keys({
    name: Joi.string(),
    slug: Joi.string(),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

const getCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().uuid().required(),
  }),
};

const updateCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().min(2).max(50),
    slug: Joi.string().pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).message('Slug must be in kebab-case format'),
    description: Joi.string().allow('').max(500),
  }).min(1).unknown(false),
};

const deleteCategory = {
  params: Joi.object().keys({
    categoryId: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
```