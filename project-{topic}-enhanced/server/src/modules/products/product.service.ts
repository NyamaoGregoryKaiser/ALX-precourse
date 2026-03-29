import { AppDataSource } from '@/config/database';
import { Product } from '@/entities/Product';
import { CreateProductPayload, UpdateProductPayload, ProductResponse } from '@/interfaces/product.interface';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import logger from '@/utils/logger';

const productRepository = AppDataSource.getRepository(Product);

/**
 * Create a new product
 * @param productData - Product data
 * @returns Created product
 */
export const createProduct = async (productData: CreateProductPayload): Promise<ProductResponse> => {
  if (await productRepository.findOneBy({ name: productData.name })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product with this name already exists');
  }

  const product = productRepository.create(productData);
  const savedProduct = await productRepository.save(product);
  logger.info(`Product created: ${savedProduct.name} (ID: ${savedProduct.id})`);
  return savedProduct;
};

/**
 * Get all products
 * @returns Array of products
 */
export const getProducts = async (): Promise<ProductResponse[]> => {
  return productRepository.find();
};

/**
 * Get product by ID
 * @param id - Product ID
 * @returns Product or null if not found
 */
export const getProductById = async (id: string): Promise<ProductResponse | null> => {
  const product = await productRepository.findOneBy({ id });
  if (!product) {
    logger.warn(`Product not found with ID: ${id}`);
  }
  return product;
};

/**
 * Update product by ID
 * @param productId - Product ID
 * @param updateBody - Update data
 * @returns Updated product
 */
export const updateProductById = async (productId: string, updateBody: UpdateProductPayload): Promise<ProductResponse> => {
  const product = await productRepository.findOneBy({ id: productId });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }

  if (updateBody.name && updateBody.name !== product.name && (await productRepository.findOneBy({ name: updateBody.name }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Product with this name already exists');
  }

  Object.assign(product, updateBody);
  const updatedProduct = await productRepository.save(product);
  logger.info(`Product updated: ${updatedProduct.name} (ID: ${updatedProduct.id})`);
  return updatedProduct;
};

/**
 * Delete product by ID
 * @param productId - Product ID
 */
export const deleteProductById = async (productId: string): Promise<void> => {
  const product = await productRepository.findOneBy({ id: productId });
  if (!product) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Product not found');
  }
  await productRepository.remove(product);
  logger.info(`Product deleted: ${product.name} (ID: ${product.id})`);
};