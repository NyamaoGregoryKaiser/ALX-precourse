```typescript
import { Request, Response } from 'express';
import { ProductService } from '../services/ProductService';
import logger from '../utils/logger';

const productService = new ProductService();

/**
 * Controller for handling Product-related API requests.
 * Routes requests to the ProductService and sends back appropriate responses.
 */
export class ProductController {
  /**
   * Get all products. Accessible to any authenticated user.
   * @param req Express Request object
   * @param res Express Response object
   */
  async getAllProducts(req: Request, res: Response): Promise<Response> {
    try {
      const products = await productService.getAllProducts();
      return res.status(200).json(products);
    } catch (error: any) {
      logger.error(`Error fetching all products: ${error.message}`);
      return res.status(500).json({ message: 'Failed to fetch products', error: error.message });
    }
  }

  /**
   * Get a single product by ID. Accessible to any authenticated user.
   * @param req Express Request object (expects productId in params)
   * @param res Express Response object
   */
  async getProductById(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    try {
      const product = await productService.getProductById(id);
      if (!product) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.status(200).json(product);
    } catch (error: any) {
      logger.error(`Error fetching product by ID ${id}: ${error.message}`);
      return res.status(500).json({ message: 'Failed to fetch product', error: error.message });
    }
  }

  /**
   * Create a new product. Requires 'user' or 'admin' role.
   * @param req Express Request object (expects name, description, price in body)
   * @param res Express Response object
   */
  async createProduct(req: Request, res: Response): Promise<Response> {
    const { name, description, price } = req.body;
    const user = req.user!; // Authenticated user is available via middleware

    if (!name || !price) {
      logger.warn('Product creation failed: Missing name or price.');
      return res.status(400).json({ message: 'Name and price are required for a product' });
    }

    try {
      const newProduct = await productService.createProduct(name, description, price, user);
      if (!newProduct) {
        return res.status(409).json({ message: 'Product with this name already exists' });
      }
      return res.status(201).json({ message: 'Product created successfully', product: newProduct });
    } catch (error: any) {
      logger.error(`Error creating product: ${error.message}`, { name, userId: user.id });
      return res.status(500).json({ message: 'Failed to create product', error: error.message });
    }
  }

  /**
   * Update an existing product. Requires 'admin' role or product ownership.
   * @param req Express Request object (expects productId in params, update data in body)
   * @param res Express Response object
   */
  async updateProduct(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const updateData = req.body;
    const user = req.user!; // Authenticated user

    try {
      const existingProduct = await productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Authorization check: Only admin or the product owner can update
      if (user.role !== 'admin' && existingProduct.userId !== user.id) {
        logger.warn(`Unauthorized product update attempt: User ${user.email} (ID: ${user.id}) tried to update product ID ${id} (owner: ${existingProduct.userId})`);
        return res.status(403).json({ message: 'Forbidden: You can only update products you own or as an administrator' });
      }

      const updatedProduct = await productService.updateProduct(id, updateData);
      if (!updatedProduct) {
        // This could mean not found, or name conflict if name was updated
        return res.status(404).json({ message: 'Product not found or name already exists' });
      }
      return res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    } catch (error: any) {
      logger.error(`Error updating product ${id}: ${error.message}`, { updateData, userId: user.id });
      return res.status(500).json({ message: 'Failed to update product', error: error.message });
    }
  }

  /**
   * Delete a product by ID. Requires 'admin' role or product ownership.
   * @param req Express Request object (expects productId in params)
   * @param res Express Response object
   */
  async deleteProduct(req: Request, res: Response): Promise<Response> {
    const { id } = req.params;
    const user = req.user!; // Authenticated user

    try {
      const existingProduct = await productService.getProductById(id);
      if (!existingProduct) {
        return res.status(404).json({ message: 'Product not found' });
      }

      // Authorization check: Only admin or the product owner can delete
      if (user.role !== 'admin' && existingProduct.userId !== user.id) {
        logger.warn(`Unauthorized product deletion attempt: User ${user.email} (ID: ${user.id}) tried to delete product ID ${id} (owner: ${existingProduct.userId})`);
        return res.status(403).json({ message: 'Forbidden: You can only delete products you own or as an administrator' });
      }

      const success = await productService.deleteProduct(id);
      if (!success) {
        return res.status(404).json({ message: 'Product not found' });
      }
      return res.status(204).send(); // No content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting product ${id}: ${error.message}`, { userId: user.id });
      return res.status(500).json({ message: 'Failed to delete product', error: error.message });
    }
  }
}
```