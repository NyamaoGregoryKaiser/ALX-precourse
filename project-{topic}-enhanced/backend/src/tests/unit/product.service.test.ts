```typescript
import { ProductService } from '../../services/ProductService';
import { ProductRepository } from '../../repositories/ProductRepository';
import { User } from '../../entities/User';
import { Product } from '../../entities/Product';
import * as cache from '../../utils/cache';

// Mock ProductRepository and cache utility
jest.mock('../../repositories/ProductRepository', () => ({
  ProductRepository: {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findProductByName: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('../../utils/cache', () => ({
  getCache: jest.fn(),
  setCache: jest.fn(),
  deleteCache: jest.fn(),
}));

describe('ProductService', () => {
  let productService: ProductService;
  let mockUser: User;
  let mockProduct: Product;
  let mockProducts: Product[];

  beforeEach(() => {
    productService = new ProductService();

    mockUser = new User();
    mockUser.id = 'user-1-uuid';
    mockUser.email = 'user1@example.com';
    mockUser.password = 'hashed_pass';
    mockUser.role = 'user';

    mockProduct = new Product();
    mockProduct.id = 'product-1-uuid';
    mockProduct.name = 'Test Product';
    mockProduct.description = 'A test product description.';
    mockProduct.price = 99.99;
    mockProduct.isActive = true;
    mockProduct.userId = mockUser.id;
    mockProduct.user = mockUser;

    mockProducts = [
      mockProduct,
      { ...mockProduct, id: 'product-2-uuid', name: 'Another Product', userId: 'user-2-uuid', user: { ...mockUser, id: 'user-2-uuid', email: 'user2@example.com' } } as Product,
    ];

    jest.clearAllMocks();
    (ProductRepository.create as jest.Mock).mockReturnValue(mockProduct);
    (ProductRepository.save as jest.Mock).mockResolvedValue(mockProduct);
    (ProductRepository.delete as jest.Mock).mockResolvedValue({ affected: 1 });
    (cache.deleteCache as jest.Mock).mockReturnValue(1);
  });

  // --- getAllProducts Tests ---
  describe('getAllProducts', () => {
    it('should return products from cache if available', async () => {
      (cache.getCache as jest.Mock).mockReturnValue(mockProducts);

      const result = await productService.getAllProducts();

      expect(cache.getCache).toHaveBeenCalledWith('allProducts');
      expect(ProductRepository.find).not.toHaveBeenCalled();
      expect(result).toEqual(mockProducts);
    });

    it('should fetch products from DB and cache them if not in cache', async () => {
      (cache.getCache as jest.Mock).mockReturnValue(undefined);
      (ProductRepository.find as jest.Mock).mockResolvedValue(mockProducts);

      const result = await productService.getAllProducts();

      expect(cache.getCache).toHaveBeenCalledWith('allProducts');
      expect(ProductRepository.find).toHaveBeenCalledWith({ relations: ['user'] });
      expect(cache.setCache).toHaveBeenCalledWith('allProducts', mockProducts);
      expect(result).toEqual(mockProducts);
    });

    it('should return empty array if no products found in DB and not in cache', async () => {
      (cache.getCache as jest.Mock).mockReturnValue(undefined);
      (ProductRepository.find as jest.Mock).mockResolvedValue([]);

      const result = await productService.getAllProducts();

      expect(cache.getCache).toHaveBeenCalledWith('allProducts');
      expect(ProductRepository.find).toHaveBeenCalledWith({ relations: ['user'] });
      expect(cache.setCache).toHaveBeenCalledWith('allProducts', []);
      expect(result).toEqual([]);
    });
  });

  // --- getProductById Tests ---
  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      (ProductRepository.findOne as jest.Mock).mockResolvedValue(mockProduct);

      const result = await productService.getProductById(mockProduct.id);

      expect(ProductRepository.findOne).toHaveBeenCalledWith({ where: { id: mockProduct.id }, relations: ['user'] });
      expect(result).toEqual(mockProduct);
    });

    it('should return null if product not found by ID', async () => {
      (ProductRepository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await productService.getProductById('non-existent-id');

      expect(ProductRepository.findOne).toHaveBeenCalledWith({ where: { id: 'non-existent-id' }, relations: ['user'] });
      expect(result).toBeNull();
    });
  });

  // --- createProduct Tests ---
  describe('createProduct', () => {
    it('should create a new product successfully', async () => {
      (ProductRepository.findProductByName as jest.Mock).mockResolvedValue(null);

      const newProductData = { name: 'New Product', description: 'Desc', price: 10.00 };
      const result = await productService.createProduct(
        newProductData.name,
        newProductData.description,
        newProductData.price,
        mockUser
      );

      expect(ProductRepository.findProductByName).toHaveBeenCalledWith(newProductData.name);
      expect(ProductRepository.create).toHaveBeenCalledWith({
        name: newProductData.name,
        description: newProductData.description,
        price: newProductData.price,
        user: mockUser,
        userId: mockUser.id,
      });
      expect(ProductRepository.save).toHaveBeenCalledWith(mockProduct);
      expect(cache.deleteCache).toHaveBeenCalledWith('allProducts');
      expect(result).toEqual(mockProduct);
    });

    it('should return null if product name already exists', async () => {
      (ProductRepository.findProductByName as jest.Mock).mockResolvedValue(mockProduct);

      const result = await productService.createProduct(
        mockProduct.name,
        'Desc',
        10.00,
        mockUser
      );

      expect(ProductRepository.findProductByName).toHaveBeenCalledWith(mockProduct.name);
      expect(result).toBeNull();
      expect(ProductRepository.save).not.toHaveBeenCalled();
      expect(cache.deleteCache).not.toHaveBeenCalled();
    });
  });

  // --- updateProduct Tests ---
  describe('updateProduct', () => {
    it('should update an existing product successfully', async () => {
      (ProductRepository.findOneBy as jest.Mock).mockResolvedValue(mockProduct);
      (ProductRepository.findProductByName as jest.Mock).mockResolvedValue(null); // No name conflict

      const updateData = { price: 109.99, isActive: false };
      const updatedProduct = { ...mockProduct, ...updateData };
      (ProductRepository.save as jest.Mock).mockResolvedValue(updatedProduct);

      const result = await productService.updateProduct(mockProduct.id, updateData);

      expect(ProductRepository.findOneBy).toHaveBeenCalledWith({ id: mockProduct.id });
      expect(ProductRepository.save).toHaveBeenCalledWith(expect.objectContaining(updateData));
      expect(cache.deleteCache).toHaveBeenCalledWith('allProducts');
      expect(result).toEqual(updatedProduct);
    });

    it('should return null if product not found for update', async () => {
      (ProductRepository.findOneBy as jest.Mock).mockResolvedValue(null);

      const result = await productService.updateProduct('non-existent-id', { price: 50.00 });

      expect(ProductRepository.findOneBy).toHaveBeenCalledWith({ id: 'non-existent-id' });
      expect(result).toBeNull();
      expect(ProductRepository.save).not.toHaveBeenCalled();
      expect(cache.deleteCache).not.toHaveBeenCalled();
    });

    it('should return null if updated name conflicts with another product', async () => {
      const existingProductWithSameName = { ...mockProduct, id: 'another-product-id' } as Product;
      (ProductRepository.findOneBy as jest.Mock).mockResolvedValue(mockProduct); // Product to update
      (ProductRepository.findProductByName as jest.Mock).mockResolvedValue(existingProductWithSameName); // Conflict

      const result = await productService.updateProduct(mockProduct.id, { name: 'Existing Product Name' });

      expect(ProductRepository.findOneBy).toHaveBeenCalledWith({ id: mockProduct.id });
      expect(ProductRepository.findProductByName).toHaveBeenCalledWith('Existing Product Name');
      expect(result).toBeNull();
      expect(ProductRepository.save).not.toHaveBeenCalled();
      expect(cache.deleteCache).not.toHaveBeenCalled();
    });
  });

  // --- deleteProduct Tests ---
  describe('deleteProduct', () => {
    it('should delete a product successfully', async () => {
      const result = await productService.deleteProduct(mockProduct.id);

      expect(ProductRepository.delete).toHaveBeenCalledWith(mockProduct.id);
      expect(cache.deleteCache).toHaveBeenCalledWith('allProducts');
      expect(result).toBe(true);
    });

    it('should return false if product not found for deletion', async () => {
      (ProductRepository.delete as jest.Mock).mockResolvedValue({ affected: 0 });

      const result = await productService.deleteProduct('non-existent-id');

      expect(ProductRepository.delete).toHaveBeenCalledWith('non-existent-id');
      expect(cache.deleteCache).not.toHaveBeenCalled(); // No deletion, no cache invalidation
      expect(result).toBe(false);
    });
  });
});
```