package com.alx.ecommerce.product.service;

import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.product.dto.ProductDTO;
import com.alx.ecommerce.product.model.Category;
import com.alx.ecommerce.product.model.Product;
import com.alx.ecommerce.product.repository.CategoryRepository;
import com.alx.ecommerce.product.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProductService productService;

    private Category category;
    private Product product;
    private ProductDTO productDTO;

    @BeforeEach
    void setUp() {
        category = Category.builder()
                .id(1L)
                .name("Electronics")
                .description("Electronic devices")
                .imageUrl("cat_url")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        product = Product.builder()
                .id(101L)
                .name("Laptop")
                .sku("LAP001")
                .description("Powerful gaming laptop")
                .price(new BigDecimal("1200.00"))
                .stockQuantity(10)
                .imageUrl("laptop_url")
                .category(category)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        productDTO = ProductDTO.builder()
                .id(101L)
                .name("Laptop")
                .sku("LAP001")
                .description("Powerful gaming laptop")
                .price(new BigDecimal("1200.00"))
                .stockQuantity(10)
                .imageUrl("laptop_url")
                .categoryId(1L)
                .categoryName("Electronics")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should create a new product successfully")
    void createProduct_Success() {
        ProductDTO newProductDTO = ProductDTO.builder()
                .name("New Phone")
                .sku("PHN002")
                .description("Latest smartphone")
                .price(new BigDecimal("800.00"))
                .stockQuantity(50)
                .categoryId(1L)
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.findBySku("PHN002")).thenReturn(Optional.empty());
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> {
            Product savedProduct = invocation.getArgument(0);
            savedProduct.setId(102L);
            savedProduct.setCreatedAt(LocalDateTime.now());
            savedProduct.setUpdatedAt(LocalDateTime.now());
            return savedProduct;
        });

        ProductDTO result = productService.createProduct(newProductDTO);

        assertNotNull(result);
        assertEquals("New Phone", result.getName());
        assertEquals(102L, result.getId());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw exception if category not found when creating product")
    void createProduct_CategoryNotFound_ThrowsException() {
        ProductDTO newProductDTO = ProductDTO.builder().categoryId(99L).build();
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(newProductDTO));
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should retrieve product by ID successfully")
    void getProductById_Success() {
        when(productRepository.findById(101L)).thenReturn(Optional.of(product));

        ProductDTO result = productService.getProductById(101L);

        assertNotNull(result);
        assertEquals(product.getName(), result.getName());
        assertEquals(product.getSku(), result.getSku());
    }

    @Test
    @DisplayName("Should throw exception if product not found by ID")
    void getProductById_NotFound_ThrowsException() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(999L));
    }

    @Test
    @DisplayName("Should retrieve all products with pagination")
    void getAllProducts_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productPage = new PageImpl<>(List.of(product), pageable, 1);
        when(productRepository.findAll(pageable)).thenReturn(productPage);

        Page<ProductDTO> result = productService.getAllProducts(pageable);

        assertNotNull(result);
        assertFalse(result.isEmpty());
        assertEquals(1, result.getTotalElements());
        assertEquals(product.getName(), result.getContent().get(0).getName());
    }

    @Test
    @DisplayName("Should update an existing product successfully")
    void updateProduct_Success() {
        ProductDTO updatedProductDTO = ProductDTO.builder()
                .name("Updated Laptop")
                .sku("LAP001")
                .description("Updated description")
                .price(new BigDecimal("1300.00"))
                .stockQuantity(8)
                .categoryId(1L)
                .build();

        when(productRepository.findById(101L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.findBySku("LAP001")).thenReturn(Optional.of(product)); // SKU hasn't changed
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductDTO result = productService.updateProduct(101L, updatedProductDTO);

        assertNotNull(result);
        assertEquals("Updated Laptop", result.getName());
        assertEquals(new BigDecimal("1300.00"), result.getPrice());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should delete a product successfully")
    void deleteProduct_Success() {
        when(productRepository.existsById(101L)).thenReturn(true);
        doNothing().when(productRepository).deleteById(101L);

        assertDoesNotThrow(() -> productService.deleteProduct(101L));
        verify(productRepository, times(1)).deleteById(101L);
    }

    @Test
    @DisplayName("Should throw exception if product not found when deleting")
    void deleteProduct_NotFound_ThrowsException() {
        when(productRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(999L));
        verify(productRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Should return products by category ID")
    void getProductsByCategoryId_Success() {
        when(categoryRepository.existsById(1L)).thenReturn(true);
        when(productRepository.findByCategoryId(1L)).thenReturn(List.of(product));

        List<ProductDTO> results = productService.getProductsByCategoryId(1L);

        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals(1, results.size());
        assertEquals("Laptop", results.get(0).getName());
    }

    @Test
    @DisplayName("Should return empty list for category with no products but existing category ID")
    void getProductsByCategoryId_NoProductsButCategoryExists_ReturnsEmptyList() {
        when(categoryRepository.existsById(1L)).thenReturn(true);
        when(productRepository.findByCategoryId(1L)).thenReturn(Collections.emptyList());

        List<ProductDTO> results = productService.getProductsByCategoryId(1L);

        assertNotNull(results);
        assertTrue(results.isEmpty());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException for non-existent category ID")
    void getProductsByCategoryId_CategoryNotFound_ThrowsException() {
        when(categoryRepository.existsById(99L)).thenReturn(false);
        when(productRepository.findByCategoryId(99L)).thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductsByCategoryId(99L));
    }

    @Test
    @DisplayName("Should search products by keyword")
    void searchProducts_Success() {
        when(productRepository.searchProducts(anyString())).thenReturn(List.of(product));

        List<ProductDTO> results = productService.searchProducts("laptop");

        assertNotNull(results);
        assertFalse(results.isEmpty());
        assertEquals(1, results.size());
        assertEquals("Laptop", results.get(0).getName());
    }
}