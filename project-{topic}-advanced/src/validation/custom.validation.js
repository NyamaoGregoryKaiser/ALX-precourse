```javascript
// src/validation/custom.validation.js
// ALX Principle: Custom Validation Rules
// Extend Joi with specific validation logic (e.g., complex password requirements).
const objectId = (value, helpers) => {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
        return helpers.message('"{{#label}}" must be a valid mongo id');
    }
    return value;
};

const uuid = (value, helpers) => {
    if (!value.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/)) {
        return helpers.message('"{{#label}}" must be a valid UUID v4');
    }
    return value;
};

const password = (value, helpers) => {
    if (value.length < 8) {
        return helpers.message('password must be at least 8 characters');
    }
    if (!value.match(/\d/) || !value.match(/[a-zA-Z]/)) {
        return helpers.message('password must contain at least 1 letter and 1 number');
    }
    return value;
};

module.exports = {
    objectId,
    uuid,
    password,
};
```