const Joi = require('joi');
const { APIError } = require('../utils/errors');

/**
 * Validates request data against a Joi schema.
 * @param {Joi.ObjectSchema} schema - The Joi schema to validate against.
 * @param {string} property - The property of the request object to validate (e.g., 'body', 'params', 'query').
 */
const validate = (schema, property) => (req, res, next) => {
  const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });
  if (error) {
    // Joi validation errors are handled by the centralized error handler
    // We attach them to the error object to be formatted there.
    const validationError = new APIError('Validation Error', 400);
    validationError.name = 'ValidationError';
    validationError.details = error.details; // Joi's error details
    next(validationError);
  } else {
    next();
  }
};

module.exports = validate;
```