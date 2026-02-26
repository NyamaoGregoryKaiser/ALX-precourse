import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from '../../../src/api/v1/services/product.service';
import { AppDataSource } from '../../../src/database/data-source';
import { Product } from '../../../src/database/entities/Product.entity';
import { Category } from '../../../src/database/entities/Category.entity';
import { AppError } from '../../../src/utils/AppError';
import * as redisUtils from '../../../src/utils/redis';

// Mock TypeORM Repositories
const mockProductRepository = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
};

const mockCategoryRepository = {
  findOneBy: jest.fn(),
};

// Mock AppDataSource to return our mock repositories
jest.mock('../../../src/database/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn((entity) => {
      if (entity === Product) return mockProductRepository;
      if (entity === Category) return mockCategoryRepository;
      return {};
    }),
    isInitialized: true,
  },
}));

// Mock Redis utility functions
jest.mock('../../../src/utils/redis', () => ({
  getFromCache: jest.fn(),
  setToCache: jest.fn(),
  deleteFromCache: jest.fn(),
}));

describe('Product Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    const productData = {
      name: 'New Product',
      description: 'A brand new item.',
      price: 99.99,
      stock: 50,
      imageUrl: 'http://example.com/new.jpg',
      categoryId: 'category-uuid-1',
    };
    const mockCategory = { id: 'category-uuid-1', name: 'Electronics' } as Category;
    const mockCreatedProduct = { id: 'product-uuid-1', ...productData, category: mockCategory } as Product;

    it('should successfully create a new product with a category', async () => {
      (mockCategoryRepository.findOneBy as jest.Mock).mockResolvedValue(mockCategory);
      (mockProductRepository.create as jest.Mock).mockReturnValue(mockCreatedProduct);
      (mockProductRepository.save as jest.Mock).mockResolvedValue(mockCreatedProduct);
      (redisUtils.deleteFromCache as jest.Mock).mockResolvedValue(undefined);

      const result = await createProduct(productData);

      expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: productData.categoryId });
      expect(mockProductRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...productData,
        category: mockCategory,
      }));
      expect(mockProductRepository.save).toHaveBeenCalledWith(mockCreatedProduct);
      expect(redisUtils.deleteFromCache).toHaveBeenCalledWith('all_products');
      expect(result).toEqual(mockCreatedProduct);
    });

    it('should successfully create a new product without a category', async () => {
      const productDataWithoutCategory = { ...productData, categoryId: undefined };
      const mockCreatedProductWithoutCategory = { id: 'product-uuid-2', ...productDataWithoutCategory, category: undefined } as Product;

      (mockCategoryRepository.findOneBy as jest.Mock).mockResolvedValue(null); // No category found
      (mockProductRepository.create as jest.Mock).mockReturnValue(mockCreatedProductWithoutCategory);
      (mockProductRepository.save as jest.Mock).mockResolvedValue(mockCreatedProductWithoutCategory);

      const result = await createProduct(productDataWithoutCategory);

      expect(mockCategoryRepository.findOneBy).not.toHaveBeenCalled(); // Should not be called if categoryId is undefined
      expect(mockProductRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        ...productDataWithoutCategory,
        category: undefined,
      }));
      expect(result).toEqual(mockCreatedProductWithoutCategory);
    });

    it('should throw AppError if categoryId is provided but category not found', async () => {
      (mockCategoryRepository.findOneBy as jest.Mock).mockResolvedValue(null); // Category not found

      await expect(createProduct(productData)).rejects.toThrow(
        new AppError(`Category with ID ${productData.categoryId} not found.`, 404)
      );
      expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: productData.categoryId });
      expect(mockProductRepository.create).not.toHaveBeenCalled();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getAllProducts', () => {
    const mockProducts = [
      { id: 'p1', name: 'Product 1', price: 10, category: { id: 'c1', name: 'Cat1' } },
      { id: 'p2', name: 'Product 2', price: 20, category: { id: 'c2', name: 'Cat2' } },
    ] as Product[];

    it('should return all products from cache if available', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(JSON.stringify(mockProducts));

      const result = await getAllProducts({});

      expect(redisUtils.getFromCache).toHaveBeenCalledWith('all_products');
      expect(mockProductRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });

    it('should return all products from database and cache them if not in cache', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (mockProductRepository.find as jest.Mock).mockResolvedValue(mockProducts);
      (redisUtils.setToCache as jest.Mock).mockResolvedValue(undefined);

      const result = await getAllProducts({});

      expect(redisUtils.getFromCache).toHaveBeenCalledWith('all_products');
      expect(mockProductRepository.find).toHaveBeenCalledWith({ relations: ['category'] });
      expect(redisUtils.setToCache).toHaveBeenCalledWith('all_products', mockProducts, expect.any(Number));
      expect(result).toEqual(mockProducts);
    });

    it('should filter products by categoryId', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (mockProductRepository.find as jest.Mock).mockResolvedValue([mockProducts[0]]); // Return only product 1 for cat1
      (redisUtils.setToCache as jest.Mock).mockResolvedValue(undefined);

      const result = await getAllProducts({ categoryId: 'c1' });

      expect(mockProductRepository.find).toHaveBeenCalledWith({
        where: { category: { id: 'c1' } },
        relations: ['category']
      });
      expect(redisUtils.setToCache).toHaveBeenCalledWith('products_category_c1', [mockProducts[0]], expect.any(Number));
      expect(result).toEqual([mockProducts[0]]);
    });
  });

  describe('getProductById', () => {
    const productId = 'product-uuid-1';
    const mockProduct = { id: productId, name: 'Test Product', price: 100 } as Product;

    it('should return a product from cache if available', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(JSON.stringify(mockProduct));

      const result = await getProductById(productId);

      expect(redisUtils.getFromCache).toHaveBeenCalledWith(`product_${productId}`);
      expect(mockProductRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual(mockProduct);
    });

    it('should return a product from database and cache it if not in cache', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(mockProduct);
      (redisUtils.setToCache as jest.Mock).mockResolvedValue(undefined);

      const result = await getProductById(productId);

      expect(redisUtils.getFromCache).toHaveBeenCalledWith(`product_${productId}`);
      expect(mockProductRepository.findOne).toHaveBeenCalledWith({
        where: { id: productId },
        relations: ['category', 'reviews', 'reviews.user']
      });
      expect(redisUtils.setToCache).toHaveBeenCalledWith(`product_${productId}`, mockProduct, expect.any(Number));
      expect(result).toEqual(mockProduct);
    });

    it('should throw AppError if product not found', async () => {
      (redisUtils.getFromCache as jest.Mock).mockResolvedValue(null);
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(getProductById(productId)).rejects.toThrow(
        new AppError(`Product with ID ${productId} not found.`, 404)
      );
      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(redisUtils.setToCache).not.toHaveBeenCalled();
    });
  });

  describe('updateProduct', () => {
    const productId = 'product-uuid-1';
    const updateData = { name: 'Updated Product', price: 109.99, categoryId: 'cat-id-2' };
    const mockExistingProduct = { id: productId, name: 'Old Name', price: 99.99, stock: 50, category: { id: 'cat-id-1', name: 'Cat1' } } as Product;
    const mockCategory = { id: 'cat-id-2', name: 'Cat2' } as Category;
    const mockUpdatedProduct = { ...mockExistingProduct, ...updateData, category: mockCategory } as Product;

    it('should successfully update a product with new category', async () => {
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(mockExistingProduct);
      (mockCategoryRepository.findOneBy as jest.Mock).mockResolvedValue(mockCategory);
      (mockProductRepository.save as jest.Mock).mockResolvedValue(mockUpdatedProduct);
      (redisUtils.deleteFromCache as jest.Mock).mockResolvedValue(undefined);

      const result = await updateProduct(productId, updateData);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { id: productId } });
      expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: updateData.categoryId });
      expect(mockProductRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockExistingProduct,
        ...updateData,
        category: mockCategory,
      }));
      expect(redisUtils.deleteFromCache).toHaveBeenCalledWith([
        `product_${productId}`,
        'all_products',
        `products_category_${mockExistingProduct.category!.id}`,
        `products_category_${mockCategory.id}`
      ]);
      expect(result).toEqual(mockUpdatedProduct);
    });

    it('should successfully update a product without changing category', async () => {
      const updateDataWithoutCategory = { name: 'Updated Product', price: 109.99 };
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(mockExistingProduct);
      (mockProductRepository.save as jest.Mock).mockResolvedValue({ ...mockExistingProduct, ...updateDataWithoutCategory });
      (redisUtils.deleteFromCache as jest.Mock).mockResolvedValue(undefined);

      const result = await updateProduct(productId, updateDataWithoutCategory);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { id: productId } });
      expect(mockCategoryRepository.findOneBy).not.toHaveBeenCalled();
      expect(mockProductRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        ...mockExistingProduct,
        ...updateDataWithoutCategory,
      }));
      expect(redisUtils.deleteFromCache).toHaveBeenCalledWith([
        `product_${productId}`,
        'all_products',
        `products_category_${mockExistingProduct.category!.id}`
      ]);
      expect(result).toEqual({ ...mockExistingProduct, ...updateDataWithoutCategory });
    });

    it('should throw AppError if product not found', async () => {
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(updateProduct(productId, updateData)).rejects.toThrow(
        new AppError(`Product with ID ${productId} not found.`, 404)
      );
      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(redisUtils.deleteFromCache).not.toHaveBeenCalled();
    });

    it('should throw AppError if categoryId is provided but new category not found', async () => {
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(mockExistingProduct);
      (mockCategoryRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      await expect(updateProduct(productId, updateData)).rejects.toThrow(
        new AppError(`Category with ID ${updateData.categoryId} not found.`, 404)
      );
      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockCategoryRepository.findOneBy).toHaveBeenCalledWith({ id: updateData.categoryId });
      expect(mockProductRepository.save).not.toHaveBeenCalled();
      expect(redisUtils.deleteFromCache).not.toHaveBeenCalled();
    });
  });

  describe('deleteProduct', () => {
    const productId = 'product-uuid-1';
    const mockProductToDelete = { id: productId, name: 'Product to delete', category: { id: 'c1', name: 'Cat1' } } as Product;

    it('should successfully delete a product', async () => {
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(mockProductToDelete);
      (mockProductRepository.remove as jest.Mock).mockResolvedValue(undefined);
      (redisUtils.deleteFromCache as jest.Mock).mockResolvedValue(undefined);

      await deleteProduct(productId);

      expect(mockProductRepository.findOne).toHaveBeenCalledWith({ where: { id: productId }, relations: ['category'] });
      expect(mockProductRepository.remove).toHaveBeenCalledWith(mockProductToDelete);
      expect(redisUtils.deleteFromCache).toHaveBeenCalledWith([
        `product_${productId}`,
        'all_products',
        `products_category_${mockProductToDelete.category!.id}`
      ]);
    });

    it('should throw AppError if product not found', async () => {
      (mockProductRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(deleteProduct(productId)).rejects.toThrow(
        new AppError(`Product with ID ${productId} not found.`, 404)
      );
      expect(mockProductRepository.findOne).toHaveBeenCalled();
      expect(mockProductRepository.remove).not.toHaveBeenCalled();
      expect(redisUtils.deleteFromCache).not.toHaveBeenCalled();
    });
  });
});