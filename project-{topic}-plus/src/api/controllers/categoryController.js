```javascript
const categoryService = require('../../services/categoryService');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../config/logger');

/**
 * Create a new task category for the authenticated user.
 */
exports.createCategory = catchAsync(async (req, res, next) => {
  const newCategory = await categoryService.createCategory(req.user.id, req.body);
  logger.info(`User ${req.user.id} created category: ${newCategory.name}`);

  res.status(201).json({
    status: 'success',
    data: {
      category: newCategory,
    },
  });
});

/**
 * Get all task categories for the authenticated user.
 */
exports.getAllCategories = catchAsync(async (req, res, next) => {
  const { categories, total, results } = await categoryService.getAllCategories(req.user.id, req.query);
  logger.debug(`User ${req.user.id} fetched ${results} of ${total} categories.`);

  res.status(200).json({
    status: 'success',
    results,
    total,
    data: {
      categories,
    },
  });
});

/**
 * Get a specific task category by ID for the authenticated user.
 */
exports.getCategoryById = catchAsync(async (req, res, next) => {
  const category = await categoryService.getCategoryById(req.params.id, req.user.id);
  logger.debug(`User ${req.user.id} fetched category: ${category.id}`);

  res.status(200).json({
    status: 'success',
    data: {
      category,
    },
  });
});

/**
 * Update a task category for the authenticated user.
 */
exports.updateCategory = catchAsync(async (req, res, next) => {
  const updatedCategory = await categoryService.updateCategory(req.params.id, req.user.id, req.body);
  logger.info(`User ${req.user.id} updated category: ${updatedCategory.id}`);

  res.status(200).json({
    status: 'success',
    data: {
      category: updatedCategory,
    },
  });
});

/**
 * Delete a task category for the authenticated user.
 */
exports.deleteCategory = catchAsync(async (req, res, next) => {
  await categoryService.deleteCategory(req.params.id, req.user.id);
  logger.info(`User ${req.user.id} deleted category: ${req.params.id}`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
```