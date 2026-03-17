```javascript
const { AppError } = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');

/**
 * Joi validation middleware
 * @param {object} schema Joi schema object with properties like body, params, query
 */
const validate = (schema) => asyncHandler(async (req, res, next) => {
  const validationOptions = {
    abortEarly: false, // Include all errors
    allowUnknown: true, // Allow unknown props (e.g., if you only validate a subset)
    stripUnknown: true, // Remove unknown props from the validated object
  };

  try {
    // Validate request.body, request.params, request.query against the schema
    for (const key of ['params', 'query', 'body']) {
      if (schema[key]) {
        const { error, value } = schema[key].validate(req[key], validationOptions);

        if (error) {
          logger.warn(`Validation error for ${key}: ${error.message}`);
          throw error; // Let the errorHandler handle Joi errors
        }
        // Replace the original request property with the validated and stripped value
        req[key] = value;
      }
    }
    next();
  } catch (error) {
    // Joi errors will have 'isJoi' property
    if (error.isJoi) {
      throw new AppError(error.details.map(detail => detail.message).join(', '), 400);
    }
    throw error; // Re-throw other errors
  }
});

module.exports = validate;
```