const Joi = require('joi');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Validates data against a Joi schema.
 * @param {object} schema - Joi schema object.
 * @param {object} data - Data to validate.
 * @returns {object} The validated data.
 * @throws {ApiError} If validation fails.
 */
const validateSchema = (schema, data) => {
  const { error, value } = schema.validate(data, { abortEarly: false, allowUnknown: true });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(', ');
    throw new ApiError(400, `Validation error: ${errorMessages}`);
  }
  return value;
};

/**
 * Generates a universally unique identifier (UUID v4).
 * Note: In a real production system, you might use a dedicated library like 'uuid'
 * or rely on database UUID generation for consistency and performance.
 * This is a simple placeholder.
 * @returns {string} A UUID v4 string.
 */
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Formats a given amount to two decimal places.
 * @param {number} amount
 * @returns {number} Formatted amount
 */
const formatAmount = (amount) => {
  return parseFloat(amount.toFixed(2));
};

module.exports = {
  validateSchema,
  generateUUID,
  formatAmount,
};