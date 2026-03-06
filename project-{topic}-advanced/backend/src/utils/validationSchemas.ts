```typescript
import Joi from 'joi';

// Custom password validation regex
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

const customPasswordMessage = 'Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character.';

const authSchemas = {
  register: Joi.object({
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).required().label('First Name'),
      lastName: Joi.string().trim().min(2).max(50).required().label('Last Name'),
      email: Joi.string().email().required().label('Email'),
      password: Joi.string().regex(passwordRegex).required().messages({
        'string.pattern.base': customPasswordMessage
      }).label('Password'),
    }).required(),
  }),
  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().label('Email'),
      password: Joi.string().required().label('Password'),
    }).required(),
  }),
  refreshTokens: Joi.object({
    body: Joi.object({
      refreshToken: Joi.string().required().label('Refresh Token'),
    }).required(),
  }),
  forgotPassword: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required().label('Email'),
    }).required(),
  }),
  resetPassword: Joi.object({
    query: Joi.object({
      token: Joi.string().required().label('Reset Token'),
    }).required(),
    body: Joi.object({
      newPassword: Joi.string().regex(passwordRegex).required().messages({
        'string.pattern.base': customPasswordMessage
      }).label('New Password'),
    }).required(),
  }),
  verifyEmail: Joi.object({
    query: Joi.object({
      token: Joi.string().required().label('Verification Token'),
    }).required(),
  }),
};

const userSchemas = {
  getUser: Joi.object({
    params: Joi.object({
      userId: Joi.string().uuid().required().label('User ID'),
    }).required(),
  }),
  updateUser: Joi.object({
    params: Joi.object({
      userId: Joi.string().uuid().required().label('User ID'),
    }).required(),
    body: Joi.object({
      firstName: Joi.string().trim().min(2).max(50).label('First Name'),
      lastName: Joi.string().trim().min(2).max(50).label('Last Name'),
      email: Joi.string().email().label('Email'),
      roleId: Joi.string().uuid().label('Role ID'), // Only for admin to update roles
    }).min(1).required().label('User Update Data'), // At least one field is required
  }),
  changePassword: Joi.object({
    params: Joi.object({
      userId: Joi.string().uuid().required().label('User ID'),
    }).required(),
    body: Joi.object({
      currentPassword: Joi.string().required().label('Current Password'),
      newPassword: Joi.string().regex(passwordRegex).required().messages({
        'string.pattern.base': customPasswordMessage
      }).label('New Password'),
    }).required(),
  }),
};

const postSchemas = {
  createPost: Joi.object({
    body: Joi.object({
      title: Joi.string().trim().min(5).max(255).required().label('Title'),
      content: Joi.string().trim().min(10).required().label('Content'),
    }).required(),
  }),
  getPost: Joi.object({
    params: Joi.object({
      postId: Joi.string().uuid().required().label('Post ID'),
    }).required(),
  }),
  updatePost: Joi.object({
    params: Joi.object({
      postId: Joi.string().uuid().required().label('Post ID'),
    }).required(),
    body: Joi.object({
      title: Joi.string().trim().min(5).max(255).label('Title'),
      content: Joi.string().trim().min(10).label('Content'),
    }).min(1).required().label('Post Update Data'),
  }),
  deletePost: Joi.object({
    params: Joi.object({
      postId: Joi.string().uuid().required().label('Post ID'),
    }).required(),
  }),
};


export { authSchemas, userSchemas, postSchemas };
```