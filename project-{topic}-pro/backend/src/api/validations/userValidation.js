```javascript
const Joi = require('joi');

const userUpdateSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(30),
  email: Joi.string()
    .email(),
  role: Joi.string()
    .valid('developer', 'manager', 'admin')
});

exports.userUpdateValidation = (req, res, next) => {
  const { error } = userUpdateSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return next(error);
  }
  next();
};
```