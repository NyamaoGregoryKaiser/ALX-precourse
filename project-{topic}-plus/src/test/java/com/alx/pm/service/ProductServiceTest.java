```java
package com.alx.pm.service;

import com.alx.pm.dto.ProductDTO;
import com.alx.pm.entity.Category;
import com.alx.pm.entity.Product;
import com.alx.pm.exception.ResourceNotFoundException;
import com.alx.pm.repository.CategoryRepository;
import com.alx.pm.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProductService productService;

    private Product product;
    private ProductDTO productDTO;
    private Category category;

    @BeforeEach
    void setUp() {
        category = new Category(1L, "Electronics", LocalDateTime.now(), LocalDateTime.now());
        product = new Product(1L, "Laptop", "Powerful laptop", 1200.0, 50, category, LocalDateTime.now(), LocalDateTime.now());
        productDTO = new ProductDTO(1L, "Laptop", "Powerful laptop", 1200.0, 50, 1L, "Electronics", LocalDateTime.now(), LocalDateTime.now());
    }

    @Test
    void getAllProducts_returnsPaginatedProducts() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productsPage = new PageImpl<>(Collections.singletonList(product), pageable, 1);
        when(productRepository.findByCriteria(any(), any(), any(), any(), eq(pageable))).thenReturn(productsPage);

        Page<ProductDTO> result = productService.getAllProducts(pageable, null, null, null, null);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(productDTO.getName(), result.getContent().get(0).getName());
        verify(productRepository, times(1)).findByCriteria(any(), any(), any(), any(), eq(pageable));
    }

    @Test
    void getProductById_existingId_returnsProduct() {
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));

        ProductDTO result = productService.getProductById(1L);

        assertNotNull(result);
        assertEquals(productDTO.getName(), result.getName());
        verify(productRepository, times(1)).findById(1L);
    }

    @Test
    void getProductById_nonExistingId_throwsResourceNotFoundException() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(99L));
        verify(productRepository, times(1)).findById(99L);
    }

    @Test
    void createProduct_validProduct_returnsCreatedProduct() {
        ProductDTO newProductDTO = new ProductDTO(null, "New Product", "Desc", 100.0, 10, 1L, null, null, null);
        Product newProduct = new Product(2L, "New Product", "Desc", 100.0, 10, category, LocalDateTime.now(), LocalDateTime.now());

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(newProduct);

        ProductDTO result = productService.createProduct(newProductDTO);

        assertNotNull(result);
        assertEquals(newProduct.getName(), result.getName());
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void createProduct_invalidCategoryId_throwsResourceNotFoundException() {
        ProductDTO newProductDTO = new ProductDTO(null, "New Product", "Desc", 100.0, 10, 99L, null, null, null);
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(newProductDTO));
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void updateProduct_existingId_returnsUpdatedProduct() {
        ProductDTO updatedProductDTO = new ProductDTO(1L, "Updated Laptop", "Updated Desc", 1300.0, 60, 1L, null, null, null);
        Product updatedProduct = new Product(1L, "Updated Laptop", "Updated Desc", 1300.0, 60, category, LocalDateTime.now(), LocalDateTime.now());

        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        ProductDTO result = productService.updateProduct(1L, updatedProductDTO);

        assertNotNull(result);
        assertEquals(updatedProductDTO.getName(), result.getName());
        verify(productRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void updateProduct_nonExistingId_throwsResourceNotFoundException() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(99L, productDTO));
        verify(productRepository, times(1)).findById(99L);
        verify(categoryRepository, never()).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void deleteProduct_existingId_deletesProduct() {
        when(productRepository.existsById(1L)).thenReturn(true);
        doNothing().when(productRepository).deleteById(1L);

        productService.deleteProduct(1L);

        verify(productRepository, times(1)).existsById(1L);
        verify(productRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteProduct_nonExistingId_throwsResourceNotFoundException() {
        when(productRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(99L));
        verify(productRepository, times(1)).existsById(99L);
        verify(productRepository, never()).deleteById(anyLong());
    }
}
```