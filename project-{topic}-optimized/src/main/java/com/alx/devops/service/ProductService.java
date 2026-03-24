package com.alx.devops.service;

import com.alx.devops.dto.ProductDTO;
import com.alx.devops.exception.ResourceNotFoundException;
import com.alx.devops.model.Category;
import com.alx.devops.model.Product;
import com.alx.devops.repository.CategoryRepository;
import com.alx.devops.repository.ProductRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service layer for managing products.
 * Handles business logic, data persistence, and caching for products.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    /**
     * Retrieves all products.
     * Results are cached to improve performance for frequent read access.
     *
     * @return A list of all ProductDTOs.
     */
    @Cacheable(value = "products")
    public List<ProductDTO> getAllProducts() {
        log.info("Fetching all products from database.");
        return productRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a product by its ID.
     * Results are cached individually by product ID.
     *
     * @param id The ID of the product.
     * @return The ProductDTO if found.
     * @throws ResourceNotFoundException if the product is not found.
     */
    @Cacheable(value = "product", key = "#id")
    public ProductDTO getProductById(Long id) {
        log.info("Fetching product with ID: {}", id);
        Optional<Product> productOptional = productRepository.findById(id);
        return productOptional.map(this::convertToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    /**
     * Creates a new product.
     * Evicts the 'products' cache to ensure subsequent 'getAllProducts' calls fetch fresh data.
     *
     * @param productDTO The DTO containing product data.
     * @return The created ProductDTO.
     * @throws ResourceNotFoundException if the specified category does not exist.
     */
    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Invalidate all product caches
    public ProductDTO createProduct(ProductDTO productDTO) {
        log.info("Creating new product: {}", productDTO.getName());
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));

        Product product = convertToEntity(productDTO, category);
        Product savedProduct = productRepository.save(product);
        log.info("Product created with ID: {}", savedProduct.getId());
        return convertToDTO(savedProduct);
    }

    /**
     * Updates an existing product.
     * Evicts the 'products' cache and the specific product cache by ID.
     *
     * @param id         The ID of the product to update.
     * @param productDTO The DTO with updated product data.
     * @return The updated ProductDTO.
     * @throws ResourceNotFoundException if the product or specified category is not found.
     */
    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Invalidate all product caches
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        log.info("Updating product with ID: {}", id);
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));

        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + productDTO.getCategoryId()));

        existingProduct.setName(productDTO.getName());
        existingProduct.setDescription(productDTO.getDescription());
        existingProduct.setPrice(productDTO.getPrice());
        existingProduct.setStockQuantity(productDTO.getStockQuantity());
        existingProduct.setCategory(category); // Update category if changed

        Product updatedProduct = productRepository.save(existingProduct);
        log.info("Product with ID {} updated.", updatedProduct.getId());
        return convertToDTO(updatedProduct);
    }

    /**
     * Deletes a product by its ID.
     * Evicts the 'products' cache and the specific product cache by ID.
     *
     * @param id The ID of the product to delete.
     * @throws ResourceNotFoundException if the product is not found.
     */
    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Invalidate all product caches
    public void deleteProduct(Long id) {
        log.info("Deleting product with ID: {}", id);
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found with id: " + id);
        }
        productRepository.deleteById(id);
        log.info("Product with ID {} deleted.", id);
    }

    /**
     * Searches for products by keyword in name or description.
     *
     * @param keyword The keyword to search for.
     * @return A list of matching ProductDTOs.
     */
    public List<ProductDTO> searchProducts(String keyword) {
        log.info("Searching products with keyword: {}", keyword);
        if (!StringUtils.hasText(keyword)) {
            return getAllProducts(); // Return all products if keyword is empty
        }
        return productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(keyword, keyword)
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }


    /**
     * Converts a Product entity to a ProductDTO.
     *
     * @param product The Product entity.
     * @return The corresponding ProductDTO.
     */
    private ProductDTO convertToDTO(Product product) {
        return new ProductDTO(
                product.getId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getStockQuantity(),
                product.getCategory().getId(),
                product.getCategory().getName()
        );
    }

    /**
     * Converts a ProductDTO to a Product entity.
     *
     * @param productDTO The ProductDTO.
     * @param category   The Category entity associated with the product.
     * @return The corresponding Product entity.
     */
    private Product convertToEntity(ProductDTO productDTO, Category category) {
        Product product = new Product();
        product.setId(productDTO.getId()); // ID might be null for creation
        product.setName(productDTO.getName());
        product.setDescription(productDTO.getDescription());
        product.setPrice(productDTO.getPrice());
        product.setStockQuantity(productDTO.getStockQuantity());
        product.setCategory(category);
        return product;
    }
}