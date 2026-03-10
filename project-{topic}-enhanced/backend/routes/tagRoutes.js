```javascript
const express = require('express');
const { protect, authorize, asyncHandler } = require('../middleware/auth');
const Tag = require('../models/tag');
const ApiError = require('../utils/ApiError');
const { cacheMiddleware, clearCache } = require('../middleware/cache');

const router = express.Router();

router.use(protect); // All tag routes require authentication

router
  .route('/')
  .post(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    const tag = await Tag.create(req.body);
    await clearCache('tags:*');
    res.status(201).json({ success: true, data: tag });
  }))
  .get(cacheMiddleware('tags'), asyncHandler(async (req, res) => {
    const tags = await Tag.findAll();
    res.status(200).json({ success: true, count: tags.length, data: tags });
  }));

router
  .route('/:id')
  .get(cacheMiddleware('tags'), asyncHandler(async (req, res, next) => {
    const tag = await Tag.findByPk(req.params.id);
    if (!tag) {
      return next(new ApiError(404, `Tag with id ${req.params.id} not found`));
    }
    res.status(200).json({ success: true, data: tag });
  }))
  .put(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    let tag = await Tag.findByPk(req.params.id);
    if (!tag) {
      return next(new ApiError(404, `Tag with id ${req.params.id} not found`));
    }
    tag = await tag.update(req.body);
    await clearCache('tags:*');
    res.status(200).json({ success: true, data: tag });
  }))
  .delete(authorize('admin', 'editor'), asyncHandler(async (req, res, next) => {
    const deletedRows = await Tag.destroy({ where: { id: req.params.id } });
    if (deletedRows === 0) {
      return next(new ApiError(404, `Tag with id ${req.params.id} not found`));
    }
    await clearCache('tags:*');
    res.status(200).json({ success: true, data: {} });
  }));

module.exports = router;
```