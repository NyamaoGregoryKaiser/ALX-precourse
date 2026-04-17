package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.product.ProductRequest;
import com.alx.ecommerce.dto.product.ProductResponse;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.repository.CategoryRepository;
import com.alx.ecommerce.repository.ProductRepository;
import com.alx.ecommerce.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service for managing products.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Creates a new product.
     *
     * @param productRequest The product request DTO.
     * @return The created product response DTO.
     * @throws ResourceNotFoundException if the category is not found.
     */
    @Transactional
    @CacheEvict(value = AppConstants.PRODUCTS_CACHE, allEntries = true) // Clear all products cache on creation
    public ProductResponse createProduct(ProductRequest productRequest) {
        log.info("Creating product: {}", productRequest.getName());
        Category category = categoryRepository.findById(productRequest.getCategoryId())
                .orElseThrow(() -> {
                    log.warn("Product creation failed: Category not found with ID: {}", productRequest.getCategoryId());
                    return new ResourceNotFoundException("Category", "id", productRequest.getCategoryId());
                });

        Product product = Product.builder()
                .name(productRequest.getName())
                .description(productRequest.getDescription())
                .price(productRequest.getPrice())
                .stockQuantity(productRequest.getStockQuantity())
                .imageUrl(productRequest.getImageUrl())
                .category(category)
                .build();

        Product savedProduct = productRepository.save(product);
        return mapToProductResponse(savedProduct);
    }

    /**
     * Retrieves all products with pagination and sorting.
     *
     * @param pageNo   Page number.
     * @param pageSize Page size.
     * @param sortBy   Field to sort by.
     * @param sortDir  Sort direction (asc/desc).
     * @return A page of product response DTOs.
     */
    @Cacheable(AppConstants.PRODUCTS_CACHE) // Cache all products
    public Page<ProductResponse> getAllProducts(int pageNo, int pageSize, String sortBy, String sortDir) {
        log.debug("Fetching all products with pageNo: {}, pageSize: {}, sortBy: {}, sortDir: {}", pageNo, pageSize, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);
        Page<Product> products = productRepository.findAll(pageable); // Can optimize with findAllWithCategories() if needed
        return products.map(this::mapToProductResponse);
    }

    /**
     * Retrieves a product by its ID.
     *
     * @param id The ID of the product.
     * @return The found product response DTO.
     * @throws ResourceNotFoundException if the product is not found.
     */
    @Cacheable(value = AppConstants.PRODUCT_BY_ID_CACHE, key = "#id") // Cache individual product by ID
    public ProductResponse getProductById(Long id) {
        log.debug("Fetching product by ID: {}", id);
        Product product = productRepository.findByIdWithCategory(id) // Use optimized query
                .orElseThrow(() -> {
                    log.warn("Product not found with ID: {}", id);
                    return new ResourceNotFoundException("Product", "id", id);
                });
        return mapToProductResponse(product);
    }

    /**
     * Updates an existing product.
     *
     * @param id            The ID of the product to update.
     * @param productRequest The updated product details DTO.
     * @return The updated product response DTO.
     * @throws ResourceNotFoundException if the product or category is not found.
     */
    @Transactional
    @CachePut(value = AppConstants.PRODUCT_BY_ID_CACHE, key = "#id") // Update cache for specific product
    @CacheEvict(value = AppConstants.PRODUCTS_CACHE, allEntries = true) // Clear all products cache as list might change
    public ProductResponse updateProduct(Long id, ProductRequest productRequest) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product update failed: Product not found with ID: {}", id);
                    return new ResourceNotFoundException("Product", "id", id);
                });

        Category category = categoryRepository.findById(productRequest.getCategoryId())
                .orElseThrow(() -> {
                    log.warn("Product update failed: Category not found with ID: {} for product ID: {}", productRequest.getCategoryId(), id);
                    return new ResourceNotFoundException("Category", "id", productRequest.getCategoryId());
                });

        product.setName(productRequest.getName());
        product.setDescription(productRequest.getDescription());
        product.setPrice(productRequest.getPrice());
        product.setStockQuantity(productRequest.getStockQuantity());
        product.setImageUrl(productRequest.getImageUrl());
        product.setCategory(category);

        log.info("Updating product with ID: {}", id);
        Product updatedProduct = productRepository.save(product);
        return mapToProductResponse(updatedProduct);
    }

    /**
     * Deletes a product by its ID.
     *
     * @param id The ID of the product to delete.
     * @throws ResourceNotFoundException if the product is not found.
     */
    @Transactional
    @CacheEvict(value = {AppConstants.PRODUCTS_CACHE, AppConstants.PRODUCT_BY_ID_CACHE}, key = "#id") // Clear product from caches
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Product deletion failed: Product not found with ID: {}", id);
                    return new ResourceNotFoundException("Product", "id", id);
                });
        log.info("Deleting product with ID: {}", id);
        productRepository.delete(product);
    }

    /**
     * Searches for products by name or description.
     *
     * @param query The search query string.
     * @return A list of matching product response DTOs.
     */
    public List<ProductResponse> searchProducts(String query) {
        log.debug("Searching products with query: {}", query);
        List<Product> products = productRepository.searchProducts(query);
        return products.stream().map(this::mapToProductResponse).collect(Collectors.toList());
    }

    /**
     * Maps a Product entity to a ProductResponse DTO.
     *
     * @param product The Product entity.
     * @return The corresponding ProductResponse DTO.
     */
    private ProductResponse mapToProductResponse(Product product) {
        ProductResponse response = new ProductResponse();
        response.setId(product.getId());
        response.setName(product.getName());
        response.setDescription(product.getDescription());
        response.setPrice(product.getPrice());
        response.setStockQuantity(product.getStockQuantity());
        response.setImageUrl(product.getImageUrl());
        response.setCategoryId(product.getCategory().getId());
        response.setCategoryName(product.getCategory().getName());
        response.setCreatedAt(product.getCreatedAt());
        response.setUpdatedAt(product.getUpdatedAt());

        // Calculate average rating and review count
        if (product.getReviews() != null && !product.getReviews().isEmpty()) {
            Double averageRating = product.getReviews().stream()
                    .mapToInt(review -> review.getRating())
                    .average()
                    .orElse(0.0);
            response.setAverageRating(Math.round(averageRating * 100.0) / 100.0); // Round to 2 decimal places
            response.setReviewCount((long) product.getReviews().size());
        } else {
            response.setAverageRating(0.0);
            response.setReviewCount(0L);
        }
        return response;
    }
}