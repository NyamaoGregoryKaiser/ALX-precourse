```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.ProductDTO;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.model.Category;
import com.alx.devops.productmanagement.model.Product;
import com.alx.devops.productmanagement.repository.CategoryRepository;
import com.alx.devops.productmanagement.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private CacheManager cacheManager = new CaffeineCacheManager();

    @InjectMocks
    private ProductService productService;

    private Category electronics;
    private Product laptop;
    private Product smartphone;
    private ProductDTO laptopDTO;
    private ProductDTO smartphoneDTO;

    @BeforeEach
    void setUp() {
        electronics = new Category();
        electronics.setId(1L);
        electronics.setName("Electronics");

        laptop = new Product();
        laptop.setId(101L);
        laptop.setName("Laptop Pro");
        laptop.setDescription("High performance laptop");
        laptop.setPrice(BigDecimal.valueOf(1500.00));
        laptop.setCategory(electronics);

        smartphone = new Product();
        smartphone.setId(102L);
        smartphone.setName("Smartphone X");
        smartphone.setDescription("Latest model smartphone");
        smartphone.setPrice(BigDecimal.valueOf(900.00));
        smartphone.setCategory(electronics);

        laptopDTO = new ProductDTO();
        laptopDTO.setId(101L);
        laptopDTO.setName("Laptop Pro");
        laptopDTO.setDescription("High performance laptop");
        laptopDTO.setPrice(BigDecimal.valueOf(1500.00));
        laptopDTO.setCategoryId(1L);
        laptopDTO.setCategoryName("Electronics");

        smartphoneDTO = new ProductDTO();
        smartphoneDTO.setId(102L);
        smartphoneDTO.setName("Smartphone X");
        smartphoneDTO.setDescription("Latest model smartphone");
        smartphoneDTO.setPrice(BigDecimal.valueOf(900.00));
        smartphoneDTO.setCategoryId(1L);
        smartphoneDTO.setCategoryName("Electronics");
    }

    @Test
    void findAllProducts_Success() {
        when(productRepository.findAllWithCategory()).thenReturn(Arrays.asList(laptop, smartphone));

        List<ProductDTO> result = productService.findAllProducts();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Laptop Pro");
        assertThat(result.get(1).getName()).isEqualTo("Smartphone X");
        verify(productRepository, times(1)).findAllWithCategory();
    }

    @Test
    void findProductById_Success() {
        when(productRepository.findByIdWithCategory(101L)).thenReturn(Optional.of(laptop));

        ProductDTO result = productService.findProductById(101L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getName()).isEqualTo("Laptop Pro");
        assertThat(result.getCategoryName()).isEqualTo("Electronics");
        verify(productRepository, times(1)).findByIdWithCategory(101L);
    }

    @Test
    void findProductById_NotFound_ThrowsResourceNotFoundException() {
        when(productRepository.findByIdWithCategory(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> productService.findProductById(999L));

        assertThat(exception.getMessage()).isEqualTo("Product not found with ID: 999");
        verify(productRepository, times(1)).findByIdWithCategory(999L);
    }

    @Test
    void createProduct_Success() {
        ProductDTO newProductDTO = new ProductDTO();
        newProductDTO.setName("Tablet Pro");
        newProductDTO.setDescription("New tablet model");
        newProductDTO.setPrice(BigDecimal.valueOf(700.00));
        newProductDTO.setCategoryId(1L);

        Product savedProduct = new Product();
        savedProduct.setId(103L);
        savedProduct.setName("Tablet Pro");
        savedProduct.setDescription("New tablet model");
        savedProduct.setPrice(BigDecimal.valueOf(700.00));
        savedProduct.setCategory(electronics);

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(electronics));
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);

        ProductDTO result = productService.createProduct(newProductDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(103L);
        assertThat(result.getName()).isEqualTo("Tablet Pro");
        assertThat(result.getCategoryName()).isEqualTo("Electronics");
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void createProduct_CategoryNotFound_ThrowsResourceNotFoundException() {
        ProductDTO newProductDTO = new ProductDTO();
        newProductDTO.setCategoryId(99L); // Non-existent category

        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(newProductDTO));

        assertThat(exception.getMessage()).isEqualTo("Category not found with ID: 99");
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void updateProduct_Success() {
        ProductDTO updatedProductDTO = new ProductDTO();
        updatedProductDTO.setName("Laptop Pro Max");
        updatedProductDTO.setDescription("Even higher performance laptop");
        updatedProductDTO.setPrice(BigDecimal.valueOf(1700.00));
        updatedProductDTO.setCategoryId(1L);

        Product updatedProductEntity = new Product();
        updatedProductEntity.setId(101L);
        updatedProductEntity.setName("Laptop Pro Max");
        updatedProductEntity.setDescription("Even higher performance laptop");
        updatedProductEntity.setPrice(BigDecimal.valueOf(1700.00));
        updatedProductEntity.setCategory(electronics);

        when(productRepository.findById(101L)).thenReturn(Optional.of(laptop));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(electronics));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProductEntity);

        ProductDTO result = productService.updateProduct(101L, updatedProductDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getName()).isEqualTo("Laptop Pro Max");
        assertThat(result.getPrice()).isEqualByComparingTo(BigDecimal.valueOf(1700.00));
        verify(productRepository, times(1)).findById(101L);
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    void updateProduct_ProductNotFound_ThrowsResourceNotFoundException() {
        ProductDTO updatedProductDTO = new ProductDTO();
        updatedProductDTO.setCategoryId(1L);

        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(999L, updatedProductDTO));

        assertThat(exception.getMessage()).isEqualTo("Product not found with ID: 999");
        verify(productRepository, times(1)).findById(999L);
        verify(categoryRepository, never()).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void updateProduct_CategoryNotFound_ThrowsResourceNotFoundException() {
        ProductDTO updatedProductDTO = new ProductDTO();
        updatedProductDTO.setCategoryId(99L); // Non-existent category

        when(productRepository.findById(101L)).thenReturn(Optional.of(laptop));
        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(101L, updatedProductDTO));

        assertThat(exception.getMessage()).isEqualTo("Category not found with ID: 99");
        verify(productRepository, times(1)).findById(101L);
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    void deleteProduct_Success() {
        when(productRepository.existsById(101L)).thenReturn(true);
        doNothing().when(productRepository).deleteById(101L);

        productService.deleteProduct(101L);

        verify(productRepository, times(1)).existsById(101L);
        verify(productRepository, times(1)).deleteById(101L);
    }

    @Test
    void deleteProduct_NotFound_ThrowsResourceNotFoundException() {
        when(productRepository.existsById(anyLong())).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(999L));

        assertThat(exception.getMessage()).isEqualTo("Product not found with ID: 999");
        verify(productRepository, times(1)).existsById(999L);
        verify(productRepository, never()).deleteById(anyLong());
    }
}
```