```javascript
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const { encrypt } = require('../utils/crypt');
const { v4: uuidv4 } = require('uuid');
const cacheService = require('../services/cacheService');

// NOTE: In a PCI-compliant system, raw card data should NEVER hit your backend.
// It would be tokenized by the frontend directly with the payment gateway.
// This example uses local encryption for demonstration of data handling, but is NOT PCI-compliant.

// @desc    Add a new payment method for the logged-in user
// @route   POST /api/v1/payment-methods
// @access  Private (User)
exports.createPaymentMethod = catchAsync(async (req, res, next) => {
  const { id: userId } = req.user;
  const {
    type,
    cardHolderName,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv, // CVV should NOT be stored long-term, only used for immediate tokenization/transaction
    isDefault,
  } = req.body;

  if (type === 'card') {
    // Basic validation for CVV - this would ideally be handled by Joi in validator
    if (!cvv || cvv.length !== 3 || !/^[0-9]+$/.test(cvv)) {
        return next(new AppError('Invalid CVV.', 400, 'INVALID_CVV'));
    }

    // In a REAL system, you'd send cardNumber, expiryMonth, expiryYear, cvv to a
    // payment gateway (e.g., Stripe.createToken) from the client-side.
    // The gateway returns a secure token/fingerprint which you store.
    // NEVER store raw card data on your servers.

    // For this mock, we encrypt and store it (for demonstration, NOT for production PCI compliance)
    const newPaymentMethod = {
      id: uuidv4(),
      user_id: userId,
      type: 'card',
      card_holder_name: encrypt(cardHolderName),
      card_number: encrypt(cardNumber), // Last 4 typically
      expiry_month: encrypt(String(expiryMonth)),
      expiry_year: encrypt(String(expiryYear)),
      card_brand: 'Visa', // Auto-detect in real system
      fingerprint: uuidv4(), // In real system, this would be a token from the gateway
      is_default: isDefault,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    };

    // If setting as default, ensure previous default is unset
    if (isDefault) {
      await db('payment_methods').where({ user_id: userId, is_default: true }).update({ is_default: false });
    }

    await db('payment_methods').insert(newPaymentMethod);

    // Invalidate user's payment method cache
    await cacheService.invalidatePrefix(`user_payment_methods:${userId}`);

    // Return a sanitized version
    const { card_number, expiry_month, expiry_year, ...safePaymentMethod } = newPaymentMethod;
    safePaymentMethod.card_last_four = cardNumber.slice(-4); // Display last 4
    res.status(201).json({
      status: 'success',
      data: { paymentMethod: safePaymentMethod }
    });
  } else {
    return next(new AppError('Payment method type not supported.', 400));
  }
});

// @desc    Get all payment methods for the logged-in user
// @route   GET /api/v1/payment-methods
// @access  Private (User)
exports.getAllPaymentMethods = catchAsync(async (req, res, next) => {
  const { id: userId } = req.user;
  const paymentMethods = await db('payment_methods')
    .where({ user_id: userId, status: 'active' })
    .select('id', 'type', 'card_holder_name', 'card_brand', 'is_default', 'status', 'created_at'); // Do not return encrypted data

  // For display, we would normally get `card_last_four`, `expiry_month`, `expiry_year` if they were stored separately (unencrypted)
  // Since we only stored encrypted, we'd need to decrypt each if we wanted to display (which is bad practice).
  // Assume a safe version for now.
  res.status(200).json({
    status: 'success',
    results: paymentMethods.length,
    data: { paymentMethods }
  });
});

// @desc    Get a single payment method by ID for the logged-in user
// @route   GET /api/v1/payment-methods/:id
// @access  Private (User)
exports.getPaymentMethodById = catchAsync(async (req, res, next) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  const paymentMethod = await db('payment_methods')
    .where({ id, user_id: userId, status: 'active' })
    .select('id', 'type', 'card_holder_name', 'card_brand', 'is_default', 'status', 'created_at') // Select safe fields
    .first();

  if (!paymentMethod) {
    return next(new AppError('Payment method not found or unauthorized.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { paymentMethod }
  });
});

// @desc    Update a payment method (e.g., set as default, update card holder name)
// @route   PATCH /api/v1/payment-methods/:id
// @access  Private (User)
exports.updatePaymentMethod = catchAsync(async (req, res, next) => {
  const { id: userId } = req.user;
  const { id } = req.params;
  const { isDefault } = req.body;
  const updateData = { updated_at: new Date() };

  if (isDefault !== undefined) {
    updateData.is_default = isDefault;
  }

  // Only allow updating certain fields (e.g., isDefault) for security
  // You should NOT allow updating card number, expiry, CVV directly here.
  // Those would be a new payment method or re-tokenization.

  if (Object.keys(updateData).length === 1) { // Only updated_at, meaning no actual change
      return next(new AppError('No valid fields to update.', 400, 'NO_FIELDS_TO_UPDATE'));
  }

  await db.transaction(async trx => {
    // If setting as default, ensure previous default is unset
    if (isDefault) {
      await trx('payment_methods').where({ user_id: userId, is_default: true }).update({ is_default: false });
    }

    const [updatedPaymentMethod] = await trx('payment_methods')
      .where({ id, user_id: userId, status: 'active' })
      .update(updateData)
      .returning('id', 'type', 'card_holder_name', 'card_brand', 'is_default', 'status', 'created_at'); // Return safe fields

    if (!updatedPaymentMethod) {
      return next(new AppError('Payment method not found or unauthorized to update.', 404));
    }

    await cacheService.invalidatePrefix(`user_payment_methods:${userId}`);
    res.status(200).json({
      status: 'success',
      data: { paymentMethod: updatedPaymentMethod }
    });
  });
});

// @desc    Delete a payment method (soft delete)
// @route   DELETE /api/v1/payment-methods/:id
// @access  Private (User)
exports.deletePaymentMethod = catchAsync(async (req, res, next) => {
  const { id: userId } = req.user;
  const { id } = req.params;

  const rowsAffected = await db('payment_methods')
    .where({ id, user_id: userId })
    .update({ status: 'inactive', updated_at: new Date() }); // Soft delete

  if (rowsAffected === 0) {
    return next(new AppError('Payment method not found or unauthorized for deletion.', 404));
  }

  await cacheService.invalidatePrefix(`user_payment_methods:${userId}`);
  res.status(204).json({
    status: 'success',
    data: null
  });
});
```