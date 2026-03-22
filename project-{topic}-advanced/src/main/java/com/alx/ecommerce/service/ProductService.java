```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.ProductDTOs;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.mapper.ProductMapper;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.repository.CategoryRepository;
import com.alx.ecommerce.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;

    @Transactional
    @CacheEvict(value = {"products", "allProducts"}, allEntries = true)
    public ProductDTOs.ProductResponse createProduct(ProductDTOs.CreateProductRequest request) {
        log.info("Creating new product: {}", request.getName());
        Category category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));

        Product product = productMapper.toProduct(request);
        product.setCategory(category);

        Product savedProduct = productRepository.save(product);
        log.info("Product created successfully: {}", savedProduct.getId());
        return productMapper.toProductResponse(savedProduct);
    }

    @Cacheable(value = "products", key = "#id")
    public ProductDTOs.ProductResponse getProductById(UUID id) {
        log.debug("Fetching product by ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return productMapper.toProductResponse(product);
    }

    @Cacheable(value = "allProducts", key = "#pageable.pageNumber + '_' + #pageable.pageSize + '_' + #pageable.sort")
    public Page<ProductDTOs.ProductResponse> getAllProducts(Pageable pageable) {
        log.debug("Fetching all products with page: {}, size: {}", pageable.getPageNumber(), pageable.getPageSize());
        return productRepository.findAll(pageable)
                .map(productMapper::toProductResponse);
    }

    @Cacheable(value = "productsByCategory", key = "#categoryId")
    public List<ProductDTOs.ProductResponse> getProductsByCategoryId(Long categoryId) {
        log.debug("Fetching products by category ID: {}", categoryId);
        List<Product> products = productRepository.findByCategoryId(categoryId);
        if (products.isEmpty()) {
            throw new ResourceNotFoundException("No products found for category ID", "id", categoryId);
        }
        return products.stream()
                .map(productMapper::toProductResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"products", "allProducts", "productsByCategory"}, allEntries = true)
    public ProductDTOs.ProductResponse updateProduct(UUID id, ProductDTOs.UpdateProductRequest request) {
        log.info("Updating product with ID: {}", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        // Update category if a new categoryId is provided
        if (request.getCategoryId() != null && !request.getCategoryId().equals(product.getCategory().getId())) {
            Category newCategory = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new ResourceNotFoundException("Category", "id", request.getCategoryId()));
            product.setCategory(newCategory);
            log.debug("Product {} category updated to {}", id, newCategory.getName());
        }

        productMapper.updateProductFromDto(request, product);
        Product updatedProduct = productRepository.save(product);
        log.info("Product {} updated successfully.", id);
        return productMapper.toProductResponse(updatedProduct);
    }

    @Transactional
    @CacheEvict(value = {"products", "allProducts", "productsByCategory"}, allEntries = true)
    public void deleteProduct(UUID id) {
        log.info("Deleting product with ID: {}", id);
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        productRepository.deleteById(id);
        log.info("Product with ID {} deleted successfully.", id);
    }

    @Transactional
    @CacheEvict(value = {"products", "allProducts"}, key = "#productId")
    public void updateProductStock(UUID productId, int quantityChange) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", productId));

        if (quantityChange < 0) {
            product.decreaseStock(Math.abs(quantityChange));
        } else {
            product.increaseStock(quantityChange);
        }
        productRepository.save(product);
        log.info("Product {} stock updated by {}. New stock: {}", productId, quantityChange, product.getStockQuantity());
    }
}
```