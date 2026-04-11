```typescript
import { Request, Response, NextFunction } from 'express';
import * as cartService from '../services/cartService';
import { AppError } from '../utils/errorHandler';
import Joi from 'joi';

const addToCartSchema = Joi.object({
  productId: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).required(),
});

const updateCartItemSchema = Joi.object({
  quantity: Joi.number().integer().min(0).required(), // 0 quantity implies removal
});

export const getCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }
    const cart = await cartService.getUserCart(req.user.id);

    if (!cart) {
      return res.status(200).json({
        status: 'success',
        data: { cart: { items: [], total: 0 } }, // Return empty cart if not exists
      });
    }

    const total = cartService.calculateCartTotal(cart);

    res.status(200).json({
      status: 'success',
      data: { cart: { ...cart, total } },
    });
  } catch (err: any) {
    next(err);
  }
};

export const addItemToCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    const { error, value } = addToCartSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const updatedCart = await cartService.addItemToCart(req.user.id, value);
    const total = cartService.calculateCartTotal(updatedCart);

    res.status(200).json({
      status: 'success',
      message: 'Item added to cart successfully',
      data: { cart: { ...updatedCart, total } },
    });
  } catch (err: any) {
    next(err);
  }
};

export const updateItemInCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    const { error, value } = updateCartItemSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const updatedCart = await cartService.updateCartItem(req.user.id, req.params.cartItemId, value);
    const total = cartService.calculateCartTotal(updatedCart);

    res.status(200).json({
      status: 'success',
      message: 'Cart item updated successfully',
      data: { cart: { ...updatedCart, total } },
    });
  } catch (err: any) {
    next(err);
  }
};

export const removeItemFromCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    const updatedCart = await cartService.removeItemFromCart(req.user.id, req.params.cartItemId);
    const total = cartService.calculateCartTotal(updatedCart);

    res.status(200).json({
      status: 'success',
      message: 'Item removed from cart successfully',
      data: { cart: { ...updatedCart, total } },
    });
  } catch (err: any) {
    next(err);
  }
};

export const clearUserCart = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }

    const clearedCart = await cartService.clearCart(req.user.id);
    const total = cartService.calculateCartTotal(clearedCart);

    res.status(200).json({
      status: 'success',
      message: 'Cart cleared successfully',
      data: { cart: { ...clearedCart, total } },
    });
  } catch (err: any) {
    next(err);
  }
};
```