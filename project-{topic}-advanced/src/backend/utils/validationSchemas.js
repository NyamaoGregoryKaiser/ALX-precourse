```javascript
const Joi = require('joi');
const AppError = require('./appError');
const { StatusCodes } = require('http-status-codes');

// Schema for user registration
const registerSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address.',
        'string.empty': 'Email is required.',
        'any.required': 'Email is required.'
    }),
    password: Joi.string().min(8).required().messages({
        'string.min': 'Password must be at least 8 characters long.',
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.'
    }),
    role: Joi.string().valid('user').optional().messages({
        'any.only': 'You cannot register as an admin directly.'
    }) // Role 'admin' should only be set by an existing admin.
});

// Schema for user login
const loginSchema = Joi.object({
    email: Joi.string().email().required().messages({
        'string.email': 'Email must be a valid email address.',
        'string.empty': 'Email is required.',
        'any.required': 'Email is required.'
    }),
    password: Joi.string().required().messages({
        'string.empty': 'Password is required.',
        'any.required': 'Password is required.'
    })
});

// Schema for creating a product
const createProductSchema = Joi.object({
    name: Joi.string().min(3).max(255).required().messages({
        'string.min': 'Product name must be at least 3 characters long.',
        'string.max': 'Product name cannot exceed 255 characters.',
        'string.empty': 'Product name is required.',
        'any.required': 'Product name is required.'
    }),
    description: Joi.string().min(10).max(2000).required().messages({
        'string.min': 'Product description must be at least 10 characters long.',
        'string.max': 'Product description cannot exceed 2000 characters.',
        'string.empty': 'Product description is required.',
        'any.required': 'Product description is required.'
    }),
    price: Joi.number().precision(2).min(0).required().messages({
        'number.base': 'Price must be a number.',
        'number.precision': 'Price can have at most 2 decimal places.',
        'number.min': 'Price cannot be negative.',
        'any.required': 'Price is required.'
    }),
    quantity: Joi.number().integer().min(0).required().messages({
        'number.base': 'Quantity must be an integer.',
        'number.integer': 'Quantity must be an integer.',
        'number.min': 'Quantity cannot be negative.',
        'any.required': 'Quantity is required.'
    }),
    category: Joi.string().max(100).optional().allow(null, '').messages({
        'string.max': 'Category cannot exceed 100 characters.'
    }),
    imageUrl: Joi.string().uri().max(2048).optional().allow(null, '').messages({
        'string.uri': 'Image URL must be a valid URL.',
        'string.max': 'Image URL cannot exceed 2048 characters.'
    })
});

// Schema for updating a product (all fields are optional, but at least one must be present)
const updateProductSchema = Joi.object({
    name: Joi.string().min(3).max(255).optional().messages({
        'string.min': 'Product name must be at least 3 characters long.',
        'string.max': 'Product name cannot exceed 255 characters.'
    }),
    description: Joi.string().min(10).max(2000).optional().messages({
        'string.min': 'Product description must be at least 10 characters long.',
        'string.max': 'Product description cannot exceed 2000 characters.'
    }),
    price: Joi.number().precision(2).min(0).optional().messages({
        'number.base': 'Price must be a number.',
        'number.precision': 'Price can have at most 2 decimal places.',
        'number.min': 'Price cannot be negative.'
    }),
    quantity: Joi.number().integer().min(0).optional().messages({
        'number.base': 'Quantity must be an integer.',
        'number.integer': 'Quantity must be an integer.',
        'number.min': 'Quantity cannot be negative.'
    }),
    category: Joi.string().max(100).optional().allow(null, '').messages({
        'string.max': 'Category cannot exceed 100 characters.'
    }),
    imageUrl: Joi.string().uri().max(2048).optional().allow(null, '').messages({
        'string.uri': 'Image URL must be a valid URL.',
        'string.max': 'Image URL cannot exceed 2048 characters.'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for update.'
});

// Schema for updating a user (only email and role are updatable via API; password changes are separate)
const updateUserSchema = Joi.object({
    email: Joi.string().email().optional().messages({
        'string.email': 'Email must be a valid email address.'
    }),
    // Role change should be handled with care, usually only by admins
    role: Joi.string().valid('user', 'admin').optional().messages({
        'any.only': 'Role must be either "user" or "admin".'
    })
}).min(1).messages({
    'object.min': 'At least one field must be provided for user update.'
});


// Generic validation middleware
const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false, allowUnknown: false });

    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join('; ');
        return next(new AppError(errorMessage, StatusCodes.BAD_REQUEST));
    }
    next();
};

module.exports = {
    registerSchema,
    loginSchema,
    createProductSchema,
    updateProductSchema,
    updateUserSchema,
    validate
};
```