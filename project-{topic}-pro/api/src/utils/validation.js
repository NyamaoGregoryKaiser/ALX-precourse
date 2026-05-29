```javascript
const Joi = require('joi');
const { objectId } = require('./customValidators'); // Custom Joi validator
const { ROLES, ORDER_STATUS } = require('../config/constants');
const { PASSWORD_REGEX, EMAIL_REGEX } = require('../config/constants');

// Custom Joi validator for UUIDs
const uuid = Joi.string().guid({ version: 'uuidv4' });

// User Validations
const userValidation = {
  register: Joi.object().keys({
    firstName: Joi.string().required().min(2).max(50),
    lastName: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
    password: Joi.string().required().pattern(PASSWORD_REGEX).messages({
      'string.pattern.base': 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.',
    }),
    role: Joi.string().valid(ROLES.USER, ROLES.ADMIN).default(ROLES.USER),
  }),

  login: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }),

  getUsers: Joi.object().keys({
    firstName: Joi.string(),
    lastName: Joi.string(),
    email: Joi.string().email(),
    role: Joi.string().valid(ROLES.USER, ROLES.ADMIN),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
  }),

  getUser: Joi.object().keys({
    userId: uuid.required(),
  }),

  updateUser: Joi.object().keys({
    userId: uuid.required(),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    email: Joi.string().email(),
    password: Joi.string().pattern(PASSWORD_REGEX).messages({
      'string.pattern.base': 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.',
    }),
    profilePicture: Joi.string().uri(),
    role: Joi.string().valid(ROLES.USER, ROLES.ADMIN), // Admin role change allowed only for admin users via middleware
  }).min(1), // At least one field required for update

  deleteUser: Joi.object().keys({
    userId: uuid.required(),
  }),
};

// Product Validations
const productValidation = {
  createProduct: Joi.object().keys({
    name: Joi.string().required().min(3).max(255),
    description: Joi.string().allow('', null).max(1000),
    price: Joi.number().required().min(0).precision(2),
    stockQuantity: Joi.number().required().integer().min(0),
    imageUrl: Joi.string().uri().allow('', null),
    weight: Joi.number().min(0).precision(2).allow(null),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().default('cm'),
    }).allow(null),
    categoryId: uuid.allow(null), // Optional category link
  }),

  getProducts: Joi.object().keys({
    name: Joi.string(),
    categoryId: uuid,
    minPrice: Joi.number().min(0).precision(2),
    maxPrice: Joi.number().min(0).precision(2),
    availability: Joi.string().valid('in_stock', 'out_of_stock', 'pre_order'),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    populate: Joi.string().valid('category', 'category,reviews'), // Example for future expansion
  }),

  getProduct: Joi.object().keys({
    productId: uuid.required(),
  }),

  updateProduct: Joi.object().keys({
    productId: uuid.required(),
    name: Joi.string().min(3).max(255),
    description: Joi.string().allow('', null).max(1000),
    price: Joi.number().min(0).precision(2),
    stockQuantity: Joi.number().integer().min(0),
    imageUrl: Joi.string().uri().allow('', null),
    weight: Joi.number().min(0).precision(2).allow(null),
    dimensions: Joi.object({
      length: Joi.number().min(0),
      width: Joi.number().min(0),
      height: Joi.number().min(0),
      unit: Joi.string().default('cm'),
    }).allow(null),
    categoryId: uuid.allow(null),
  }).min(1),

  deleteProduct: Joi.object().keys({
    productId: uuid.required(),
  }),
};

// Category Validations
const categoryValidation = {
  createCategory: Joi.object().keys({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().allow('', null).max(500),
    imageUrl: Joi.string().uri().allow('', null),
  }),

  getCategory: Joi.object().keys({
    categoryId: uuid.required(),
  }),

  updateCategory: Joi.object().keys({
    categoryId: uuid.required(),
    name: Joi.string().min(2).max(100),
    description: Joi.string().allow('', null).max(500),
    imageUrl: Joi.string().uri().allow('', null),
  }).min(1),

  deleteCategory: Joi.object().keys({
    categoryId: uuid.required(),
  }),
};

// Order Validations
const orderValidation = {
  createOrder: Joi.object().keys({
    items: Joi.array().items(
      Joi.object({
        productId: uuid.required(),
        quantity: Joi.number().integer().min(1).required(),
      })
    ).min(1).required(),
    shippingAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
    }).required(),
    billingAddress: Joi.object({ // Optional, can default to shipping
      street: Joi.string(),
      city: Joi.string(),
      state: Joi.string(),
      zipCode: Joi.string(),
      country: Joi.string(),
    }),
    paymentMethod: Joi.string().required(), // e.g., 'credit_card', 'paypal', 'stripe'
  }),

  getOrders: Joi.object().keys({
    userId: uuid, // Admin can filter by userId
    status: Joi.string().valid(...Object.values(ORDER_STATUS)),
    paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunded', 'failed'),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1),
    page: Joi.number().integer().min(1),
    populate: Joi.string().valid('user', 'orderItems', 'user,orderItems', 'orderItems.product'),
  }),

  getOrder: Joi.object().keys({
    orderId: uuid.required(),
  }),

  updateOrderStatus: Joi.object().keys({
    orderId: uuid.required(),
    status: Joi.string().valid(...Object.values(ORDER_STATUS)).required(),
  }),

  updateOrderPaymentStatus: Joi.object().keys({
    orderId: uuid.required(),
    paymentStatus: Joi.string().valid('unpaid', 'paid', 'refunded', 'failed').required(),
  }),

  cancelOrder: Joi.object().keys({
    orderId: uuid.required(),
  }),
};


module.exports = {
  userValidation,
  productValidation,
  categoryValidation,
  orderValidation,
};
```