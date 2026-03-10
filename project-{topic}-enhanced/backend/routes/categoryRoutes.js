```javascript
const express = require('express');
const { protect, authorize, asyncHandler } = require('../middleware/auth');
const Category = require('../models/category');
const ApiError = require('../utils/ApiError');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

const router = express.Router();

router.use(protect); // All category routes require authentication

router
  .route('/')
  .post(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    const category = await Category.create(req.body);
    await clearCache('categories:*');
    res.status(201).json({ success: true, data: category });
  }))
  .get(cacheMiddleware('categories'), asyncHandler(async (req, res) => {
    const categories = await Category.findAll();
    res.status(200).json({ success: true, count: categories.length, data: categories });
  }));

router
  .route('/:id')
  .get(cacheMiddleware('categories'), asyncHandler(async (req, res, next) => {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return next(new ApiError(404, `Category with id ${req.params.id} not found`));
    }
    res.status(200).json({ success: true, data: category });
  }))
  .put(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    let category = await Category.findByPk(req.params.id);
    if (!category) {
      return next(new ApiError(404, `Category with id ${req.params.id} not found`));
    }
    category = await category.update(req.body);
    await clearCache('categories:*');
    res.status(200).json({ success: true, data: category });
  }))
  .delete(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    const deletedRows = await Category.destroy({ where: { id: req.params.id } });
    if (deletedRows === 0) {
      return next(new ApiError(404, `Category with id ${req.params.id} not found`));
    }
    await clearCache('categories:*');
    res.status(200).json({ success: true, data: {} });
  }));

module.exports = router;
```