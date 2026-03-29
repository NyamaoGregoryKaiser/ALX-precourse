import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import * as productService from './product.service';
import { catchAsync } from '@/utils/catchAsync';
import { ApiError } from '@/utils/ApiError';
import logger from '@/utils/logger';

// Create a new product
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);
  res.status(httpStatus.CREATED).send(product);
});

// Get all products
export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const products = await productService.getProducts();
  res.status(httpStatus.OK).send(products);
});

// Get a single product by ID
export const getProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.params.productId);
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  res.status(httpStatus.OK).send(product);
});

// Update a product by ID
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.updateProductById(req.params.productId, req.body);
  res.status(httpStatus.OK).send(product);
});

// Delete a product by ID
export const deleteProduct = catchAsync(async (req: Request, res: Response) => {
  await productService.deleteProductById(req.params.productId);
  res.status(httpStatus.NO_CONTENT).send();
});