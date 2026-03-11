package com.alx.ecommerce.product.service;

import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.product.dto.ProductDTO;
import com.alx.ecommerce.product.model.Category;
import com.alx.ecommerce.product.model.Product;
import com.alx.ecommerce.product.repository.CategoryRepository;
import com.alx.ecommerce.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProductService {

    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @CacheEvict(value = {"products", "productById", "productsByCategory"}, allEntries = true)
    @Transactional
    public ProductDTO createProduct(ProductDTO productDTO) {
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", productDTO.getCategoryId()));

        if (productRepository.findBySku(productDTO.getSku()).isPresent()) {
            throw new IllegalArgumentException("Product with SKU " + productDTO.getSku() + " already exists.");
        }

        Product product = Product.builder()
                .name(productDTO.getName())
                .sku(productDTO.getSku())
                .description(productDTO.getDescription())
                .price(productDTO.getPrice())
                .stockQuantity(productDTO.getStockQuantity())
                .imageUrl(productDTO.getImageUrl())
                .category(category)
                .build();
        Product savedProduct = productRepository.save(product);
        logger.info("Product created: {} (SKU: {})", savedProduct.getName(), savedProduct.getSku());
        return convertToDto(savedProduct);
    }

    @Cacheable(value = "products", key = "{#pageable.pageNumber, #pageable.pageSize, #pageable.sort}")
    public Page<ProductDTO> getAllProducts(Pageable pageable) {
        logger.debug("Fetching all products from database (or cache if available)");
        return productRepository.findAll(pageable).map(this::convertToDto);
    }

    @Cacheable(value = "productById", key = "#id")
    public ProductDTO getProductById(Long id) {
        logger.debug("Fetching product by ID: {} from database (or cache if available)", id);
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));
        return convertToDto(product);
    }

    @Cacheable(value = "productsByCategory", key = "#categoryId")
    public List<ProductDTO> getProductsByCategoryId(Long categoryId) {
        logger.debug("Fetching products by category ID: {} from database (or cache if available)", categoryId);
        List<Product> products = productRepository.findByCategoryId(categoryId);
        if (products.isEmpty() && !categoryRepository.existsById(categoryId)) {
            throw new ResourceNotFoundException("Category", "id", categoryId);
        }
        return products.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    public List<ProductDTO> searchProducts(String keyword) {
        logger.debug("Searching products with keyword: {}", keyword);
        List<Product> products = productRepository.searchProducts(keyword);
        return products.stream().map(this::convertToDto).collect(Collectors.toList());
    }

    @CacheEvict(value = {"products", "productById", "productsByCategory"}, allEntries = true)
    @Transactional
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product", "id", id));

        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", productDTO.getCategoryId()));

        if (!existingProduct.getSku().equalsIgnoreCase(productDTO.getSku()) && productRepository.findBySku(productDTO.getSku()).isPresent()) {
            throw new IllegalArgumentException("Product with SKU " + productDTO.getSku() + " already exists.");
        }

        existingProduct.setName(productDTO.getName());
        existingProduct.setSku(productDTO.getSku());
        existingProduct.setDescription(productDTO.getDescription());
        existingProduct.setPrice(productDTO.getPrice());
        existingProduct.setStockQuantity(productDTO.getStockQuantity());
        existingProduct.setImageUrl(productDTO.getImageUrl());
        existingProduct.setCategory(category);
        Product updatedProduct = productRepository.save(existingProduct);
        logger.info("Product updated: {} (SKU: {})", updatedProduct.getName(), updatedProduct.getSku());
        return convertToDto(updatedProduct);
    }

    @CacheEvict(value = {"products", "productById", "productsByCategory"}, allEntries = true)
    @Transactional
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product", "id", id);
        }
        productRepository.deleteById(id);
        logger.info("Product deleted with ID: {}", id);
    }

    private ProductDTO convertToDto(Product product) {
        return ProductDTO.builder()
                .id(product.getId())
                .name(product.getName())
                .sku(product.getSku())
                .description(product.getDescription())
                .price(product.getPrice())
                .stockQuantity(product.getStockQuantity())
                .imageUrl(product.getImageUrl())
                .categoryId(product.getCategory().getId())
                .categoryName(product.getCategory().getName())
                .createdAt(product.getCreatedAt())
                .updatedAt(product.getUpdatedAt())
                .build();
    }
}