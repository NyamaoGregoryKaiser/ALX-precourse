```javascript
const express = require('express');
const { protect, authorize, asyncHandler } = require('../middleware/auth');
const Media = require('../models/media');
const ApiError = require('../utils/ApiError');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
// For real-world, you'd integrate with multer for file uploads and a cloud storage service like S3.
// For this example, we'll simulate media creation by providing URLs.

const router = express.Router();

router.use(protect); // All media routes require authentication

router
  .route('/')
  .post(authorize('admin', 'editor', 'author'), asyncHandler(async (req, res, next) => {
    const { filename, mimeType, url, altText, description } = req.body;
    if (!filename || !mimeType || !url) {
      return next(new ApiError(400, 'Filename, mimeType, and url are required for media.'));
    }
    const media = await Media.create({ ...req.body, uploadedBy: req.user.id });
    await clearCache('media:*');
    res.status(201).json({ success: true, data: media });
  }))
  .get(cacheMiddleware('media'), asyncHandler(async (req, res) => {
    const mediaItems = await Media.findAll({
      include: [{ model: Media.sequelize.models.User, as: 'uploader', attributes: ['id', 'username'] }]
    });
    res.status(200).json({ success: true, count: mediaItems.length, data: mediaItems });
  }));

router
  .route('/:id')
  .get(cacheMiddleware('media'), asyncHandler(async (req, res, next) => {
    const media = await Media.findByPk(req.params.id, {
      include: [{ model: Media.sequelize.models.User, as: 'uploader', attributes: ['id', 'username'] }]
    });
    if (!media) {
      return next(new ApiError(404, `Media item with id ${req.params.id} not found`));
    }
    res.status(200).json({ success: true, data: media });
  }))
  .put(authorize('admin', 'editor', 'author'), asyncHandler(async (req, res, next) => {
    let media = await Media.findByPk(req.params.id);
    if (!media) {
      return next(new ApiError(404, `Media item with id ${req.params.id} not found`));
    }
    // Only admins/editors can update others' media, authors only their own
    if (req.user.role === 'author' && media.uploadedBy !== req.user.id) {
      return next(new ApiError(403, 'Authors can only update their own media.'));
    }
    media = await media.update(req.body);
    await clearCache('media:*');
    res.status(200).json({ success: true, data: media });
  }))
  .delete(authorize('admin', 'editor', 'author'), asyncHandler(async (req, res, next) => {
    const media = await Media.findByPk(req.params.id);
    if (!media) {
      return next(new ApiError(404, `Media item with id ${req.params.id} not found`));
    }
    // Only admins/editors can delete others' media, authors only their own
    if (req.user.role === 'author' && media.uploadedBy !== req.user.id) {
      return next(new ApiError(403, 'Authors can only delete their own media.'));
    }
    await media.destroy();
    await clearCache('media:*');
    res.status(200).json({ success: true, data: {} });
  }));

module.exports = router;
```