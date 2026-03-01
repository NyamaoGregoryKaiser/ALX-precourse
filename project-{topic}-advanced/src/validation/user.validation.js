```javascript
// src/validation/user.validation.js
const Joi = require('joi');
const { password, uuid } = require('./custom.validation');

const createUser = {
    body: Joi.object().keys({
        email: Joi.string().required().email(),
        password: Joi.string().required().custom(password),
        name: Joi.string().required(),
        role: Joi.string().required().valid('user', 'admin'),
    }),
};

const getUsers = {
    query: Joi.object().keys({
        name: Joi.string(),
        role: Joi.string(),
        sortBy: Joi.string(),
        limit: Joi.number().integer(),
        page: Joi.number().integer(),
    }),
};

const getUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(uuid).required(),
    }),
};

const updateUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(uuid).required(),
    }),
    body: Joi.object()
        .keys({
            email: Joi.string().email(),
            password: Joi.string().custom(password),
            name: Joi.string(),
            role: Joi.string().valid('user', 'admin'),
        })
        .min(1),
};

const deleteUser = {
    params: Joi.object().keys({
        userId: Joi.string().custom(uuid).required(),
    }),
};

module.exports = {
    createUser,
    getUsers,
    getUser,
    updateUser,
    deleteUser,
};
```