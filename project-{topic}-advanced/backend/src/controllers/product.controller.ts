import { Request, Response, NextFunction } from 'express';
import { ProductService } from '../services/product.service';
import { catchAsync } from '../utils/catchAsync.util';
import { logger } from '../utils/logger.util';
import { CreateProductDTO, UpdateProductDTO } from '../types/product.d';

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getAllProducts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { categoryId, search, page = '1', limit = '10' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    logger.debug('Fetching all products', { categoryId, search, page: pageNum, limit: limitNum });

    const { products, total } = await this.productService.getAllProducts({
      categoryId: categoryId as string,
      search: search as string,
      page: pageNum,
      limit: limitNum,
    });
    res.status(200).json({ products, total, page: pageNum, limit: limitNum });
  });

  getProductById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    logger.debug('Fetching product by ID', { productId: id });
    const product = await this.productService.getProductById(id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  });

  createProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const productData: CreateProductDTO = req.body;
    logger.debug('Creating new product', { productName: productData.name });
    const newProduct = await this.productService.createProduct(productData);
    res.status(201).json(newProduct);
  });

  updateProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const productData: UpdateProductDTO = req.body;
    logger.debug('Updating product', { productId: id, updateData: productData });
    const updatedProduct = await this.productService.updateProduct(id, productData);
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(updatedProduct);
  });

  deleteProduct = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    logger.debug('Deleting product', { productId: id });
    await this.productService.deleteProduct(id);
    res.status(204).send(); // No content
  });
}