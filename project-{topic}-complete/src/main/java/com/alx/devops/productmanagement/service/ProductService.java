```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.ProductDTO;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.model.Category;
import com.alx.devops.productmanagement.model.Product;
import com.alx.devops.productmanagement.repository.CategoryRepository;
import com.alx.devops.productmanagement.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "products", key = "'allProducts'")
    public List<ProductDTO> findAllProducts() {
        log.debug("Fetching all products from database (cache miss or initial load)");
        return productRepository.findAllWithCategory().stream() // Using custom query to fetch category eagerly
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "product", key = "#id")
    public ProductDTO findProductById(Long id) {
        log.debug("Fetching product by ID: {} from database (cache miss or initial load)", id);
        Product product = productRepository.findByIdWithCategory(id) // Using custom query to fetch category eagerly
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return convertToDTO(product);
    }

    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Evict all product caches on modification
    public ProductDTO createProduct(ProductDTO productDTO) {
        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + productDTO.getCategoryId()));

        Product product = new Product();
        product.setName(productDTO.getName());
        product.setDescription(productDTO.getDescription());
        product.setPrice(productDTO.getPrice());
        product.setCategory(category);

        Product savedProduct = productRepository.save(product);
        log.info("Product created: {}", savedProduct.getName());
        return convertToDTO(savedProduct);
    }

    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Evict all product caches on modification
    public ProductDTO updateProduct(Long id, ProductDTO productDTO) {
        Product existingProduct = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        Category category = categoryRepository.findById(productDTO.getCategoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + productDTO.getCategoryId()));

        existingProduct.setName(productDTO.getName());
        existingProduct.setDescription(productDTO.getDescription());
        existingProduct.setPrice(productDTO.getPrice());
        existingProduct.setCategory(category);

        Product updatedProduct = productRepository.save(existingProduct);
        log.info("Product updated: {}", updatedProduct.getName());
        return convertToDTO(updatedProduct);
    }

    @Transactional
    @CacheEvict(value = {"products", "product"}, allEntries = true) // Evict all product caches on modification
    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new ResourceNotFoundException("Product not found with ID: " + id);
        }
        productRepository.deleteById(id);
        log.info("Product deleted with ID: {}", id);
    }

    private ProductDTO convertToDTO(Product product) {
        ProductDTO dto = new ProductDTO();
        dto.setId(product.getId());
        dto.setName(product.getName());
        dto.setDescription(product.getDescription());
        dto.setPrice(product.getPrice());
        dto.setCategoryId(product.getCategory().getId());
        dto.setCategoryName(product.getCategory().getName());
        return dto;
    }
}
```