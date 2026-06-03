```javascript
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const cacheService = require('../services/cacheService');
const { v4: uuidv4 } = require('uuid');

// @desc    Get my merchant account (for a logged-in merchant admin)
// @route   GET /api/v1/merchants/me
// @access  Private (Merchant/Admin)
exports.getMyMerchantAccount = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;

  let merchant;
  if (userType === 'merchant') {
    merchant = await db('merchants').where({ user_id: userId }).first();
  } else if (userType === 'admin' && req.query.merchantId) { // Admins can specify merchantId
    merchant = await db('merchants').where({ id: req.query.merchantId }).first();
  } else {
    return next(new AppError('Not authorized to access merchant account or missing merchantId for admin.', 403));
  }

  if (!merchant) {
    return next(new AppError('Merchant account not found for this user.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { merchant }
  });
});

// @desc    Update my merchant account (for a logged-in merchant admin)
// @route   PATCH /api/v1/merchants/me
// @access  Private (Merchant/Admin)
exports.updateMyMerchantAccount = catchAsync(async (req, res, next) => {
  const { id: userId, type: userType } = req.user;
  const { name, description, webhookUrl } = req.body;
  const updateData = { updated_at: new Date() };

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description === '' ? null : description; // Allow clearing
  if (webhookUrl !== undefined) updateData.webhook_url = webhookUrl === '' ? null : webhookUrl; // Allow clearing

  let query = db('merchants');
  if (userType === 'merchant') {
    query = query.where({ user_id: userId });
  } else if (userType === 'admin' && req.query.merchantId) {
    query = query.where({ id: req.query.merchantId });
  } else {
    return next(new AppError('Not authorized to update merchant account or missing merchantId for admin.', 403));
  }

  const [updatedMerchant] = await query.update(updateData).returning('*');

  if (!updatedMerchant) {
    return next(new AppError('Merchant account not found or not authorized to update.', 404));
  }

  await cacheService.invalidatePrefix(`merchant:${updatedMerchant.id}`);
  res.status(200).json({
    status: 'success',
    data: { merchant: updatedMerchant }
  });
});


// Admin-only functions
// @desc    Create a new merchant
// @route   POST /api/v1/merchants
// @access  Private/Admin
exports.createMerchant = catchAsync(async (req, res, next) => {
  const { name, description, webhookUrl, userId } = req.body; // userId to link to an existing user

  // In a real scenario, check if userId exists and is a 'merchant' type or assign a new user.
  // For simplicity, we assume an existing user ID for 'merchant' type is provided, or we create a new one.
  // This example assumes we get the userId for the merchant admin from the request.
  // For a pure admin flow, admin would create the user first, then create merchant.
  // OR create both merchant and merchant-user account at once.
  if (!userId) {
    return next(new AppError('User ID for merchant admin is required.', 400));
  }
  const existingUser = await db('users').where({ id: userId }).first();
  if (!existingUser) {
    return next(new AppError('Provided user ID does not exist.', 404));
  }
  if (existingUser.type !== 'merchant' && existingUser.type !== 'admin') {
     return next(new AppError('User type must be "merchant" or "admin" to be linked to a merchant account.', 400));
  }
  const existingMerchant = await db('merchants').where({ user_id: userId }).first();
  if (existingMerchant) {
    return next(new AppError('A merchant account already exists for this user.', 409));
  }


  const newMerchant = {
    id: uuidv4(),
    user_id: userId,
    name,
    description: description || null,
    webhook_url: webhookUrl || null,
    status: 'active',
    created_at: new Date(),
    updated_at: new Date(),
  };

  await db('merchants').insert(newMerchant);
  await db('users').where({ id: userId }).update({ merchant_id: newMerchant.id }); // Link user to merchant

  res.status(201).json({
    status: 'success',
    data: { merchant: newMerchant }
  });
});

// @desc    Get all merchants
// @route   GET /api/v1/merchants
// @access  Private/Admin
exports.getAllMerchants = catchAsync(async (req, res, next) => {
  const merchants = await db('merchants').select('*');
  res.status(200).json({
    status: 'success',
    results: merchants.length,
    data: { merchants }
  });
});

// @desc    Get merchant by ID
// @route   GET /api/v1/merchants/:id
// @access  Private/Admin
exports.getMerchantById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const merchant = await db('merchants').where({ id }).first();
  if (!merchant) {
    return next(new AppError('Merchant not found.', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { merchant }
  });
});

// @desc    Update merchant by ID
// @route   PATCH /api/v1/merchants/:id
// @access  Private/Admin
exports.updateMerchant = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, description, webhookUrl, status } = req.body;
  const updateData = { updated_at: new Date() };

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description === '' ? null : description;
  if (webhookUrl !== undefined) updateData.webhook_url = webhookUrl === '' ? null : webhookUrl;
  if (status) updateData.status = status;

  const [updatedMerchant] = await db('merchants')
    .where({ id })
    .update(updateData)
    .returning('*');

  if (!updatedMerchant) {
    return next(new AppError('Merchant not found for update.', 404));
  }

  await cacheService.invalidatePrefix(`merchant:${id}`);
  res.status(200).json({
    status: 'success',
    data: { merchant: updatedMerchant }
  });
});

// @desc    Delete merchant by ID (soft delete)
// @route   DELETE /api/v1/merchants/:id
// @access  Private/Admin
exports.deleteMerchant = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const rowsAffected = await db('merchants')
    .where({ id })
    .update({ status: 'inactive', updated_at: new Date() }); // Soft delete

  if (rowsAffected === 0) {
    return next(new AppError('Merchant not found for deletion.', 404));
  }

  await cacheService.invalidatePrefix(`merchant:${id}`);
  res.status(204).json({
    status: 'success',
    data: null
  });
});
```