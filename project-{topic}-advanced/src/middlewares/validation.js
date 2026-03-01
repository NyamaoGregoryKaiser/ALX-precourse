```javascript
// src/middlewares/validation.js
const Joi = require('joi');
const httpStatus = require('http-status');
const { ApiError } = require('../utils/ApiError');
const { pick } = require('../utils/helpers');

const validate = (schema) => (req, res, next) => {
    // ALX Principle: Input Validation
    // Validate all incoming request data (params, query, body) against Joi schemas.
    const validSchema = pick(schema, ['params', 'query', 'body']);
    const object = pick(req, Object.keys(validSchema));
    const { value, error } = Joi.compile(validSchema)
        .prefs({ errors: { label: 'key' }, abortEarly: false })
        .validate(object);

    if (error) {
        const errorMessage = error.details.map((details) => details.message).join(', ');
        return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }
    Object.assign(req, value);
    return next();
};

module.exports = {
    validate
};
```