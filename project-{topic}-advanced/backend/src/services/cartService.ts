```typescript
import { Cart, CartItem, Product } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import logger from '../utils/logger';
import { prisma } from '../database/prisma/client';

export interface AddToCartData {
  productId: string;
  quantity: number;
}

export interface UpdateCartItemData {
  quantity: number;
}

export const getOrCreateUserCart = async (userId: string): Promise<Cart> => {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });
    logger.info(`Created new cart for user: ${userId}`);
  }
  return cart;
};

export const addItemToCart = async (userId: string, itemData: AddToCartData): Promise<Cart> => {
  const { productId, quantity } = itemData;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new AppError(`Product with ID ${productId} not found`, 404);
  }
  if (product.stock < quantity) {
    throw new AppError(`Not enough stock for product '${product.name}'. Available: ${product.stock}`, 400);
  }

  const cart = await getOrCreateUserCart(userId);

  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: {
        cartId: cart.id,
        productId,
      },
    },
  });

  if (existingCartItem) {
    // Update quantity if item already exists
    const newQuantity = existingCartItem.quantity + quantity;
    if (product.stock < newQuantity) {
      throw new AppError(`Cannot add ${quantity} more units. Exceeds available stock of ${product.stock}.`, 400);
    }
    await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: newQuantity },
    });
    logger.info(`Updated cart item quantity for user ${userId}, product ${productId} to ${newQuantity}`);
  } else {
    // Create new cart item
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
    logger.info(`Added new item to cart for user ${userId}, product ${productId} quantity ${quantity}`);
  }

  // Refetch cart with updated items to ensure consistency
  return getOrCreateUserCart(userId);
};

export const updateCartItem = async (userId: string, cartItemId: string, updateData: UpdateCartItemData): Promise<Cart> => {
  const { quantity } = updateData;

  if (quantity <= 0) {
    return removeItemFromCart(userId, cartItemId);
  }

  const cart = await getOrCreateUserCart(userId);

  const existingCartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
    include: { product: true }
  });

  if (!existingCartItem || existingCartItem.cartId !== cart.id) {
    throw new AppError(`Cart item with ID ${cartItemId} not found in user's cart`, 404);
  }

  if (existingCartItem.product.stock < quantity) {
    throw new AppError(`Not enough stock for product '${existingCartItem.product.name}'. Available: ${existingCartItem.product.stock}`, 400);
  }

  await prisma.cartItem.update({
    where: { id: cartItemId },
    data: { quantity },
  });
  logger.info(`Updated cart item ${cartItemId} quantity for user ${userId} to ${quantity}`);
  return getOrCreateUserCart(userId);
};

export const removeItemFromCart = async (userId: string, cartItemId: string): Promise<Cart> => {
  const cart = await getOrCreateUserCart(userId);

  const existingCartItem = await prisma.cartItem.findUnique({
    where: { id: cartItemId },
  });

  if (!existingCartItem || existingCartItem.cartId !== cart.id) {
    throw new AppError(`Cart item with ID ${cartItemId} not found in user's cart`, 404);
  }

  await prisma.cartItem.delete({
    where: { id: cartItemId },
  });
  logger.info(`Removed cart item ${cartItemId} from cart for user ${userId}`);
  return getOrCreateUserCart(userId);
};

export const clearCart = async (userId: string): Promise<Cart> => {
  const cart = await getOrCreateUserCart(userId);

  await prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });
  logger.info(`Cleared cart for user ${userId}`);
  return getOrCreateUserCart(userId);
};

export const getUserCart = async (userId: string): Promise<Cart | null> => {
  return prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });
};

export const calculateCartTotal = (cart: Cart & { items: (CartItem & { product: Product })[] }): number => {
  return cart.items.reduce((total, item) => total + item.quantity * item.product.price, 0);
};
```