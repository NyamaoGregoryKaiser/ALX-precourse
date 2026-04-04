```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from './errorHandler';
import httpStatus from 'http-status';

// Helper function to validate Joi schema
const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params') =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[property], { abortEarly: false, allowUnknown: true });

    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join(', ');
      return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
    }
    next();
  };

// Joi schemas for different API requests
export const authValidation = {
  register: Joi.object({
    username: Joi.string().trim().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  }),
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

export const userValidation = {
  searchUsers: Joi.object({
    q: Joi.string().min(1).required(),
  }),
  getUserById: Joi.object({
    id: Joi.string().uuid().required(),
  }),
};

export const conversationValidation = {
  createConversation: Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    participantIds: Joi.array().items(Joi.string().uuid()).min(1).required(),
  }),
  getConversationById: Joi.object({
    conversationId: Joi.string().uuid().required(),
  }),
};

export const messageValidation = {
  sendMessage: Joi.object({
    content: Joi.string().trim().min(1).max(1000).required(),
  }),
  getMessages: Joi.object({
    conversationId: Joi.string().uuid().required(),
  }),
};

export { validate };
```