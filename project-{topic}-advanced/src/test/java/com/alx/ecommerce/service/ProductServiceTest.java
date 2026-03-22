```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.CategoryDTO;
import com.alx.ecommerce.dto.ProductDTOs;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.mapper.ProductMapper;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.repository.CategoryRepository;
import com.alx.ecommerce.repository.ProductRepository;
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
import org.springframework.data.domain.Sort;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ProductMapper productMapper;

    @InjectMocks
    private ProductService productService;

    private Category electronicsCategory;
    private Product laptop;
    private ProductDTOs.ProductResponse laptopResponse;

    @BeforeEach
    void setUp() {
        electronicsCategory = Category.builder()
                .id(1L).name("Electronics").description("Electronic gadgets").build();

        laptop = Product.builder()
                .id(UUID.randomUUID()).name("Laptop X").description("Powerful laptop")
                .price(new BigDecimal("1200.00")).stockQuantity(50).category(electronicsCategory)
                .imageUrl("http://example.com/laptop.jpg").build();

        laptopResponse = ProductDTOs.ProductResponse.builder()
                .id(laptop.getId()).name("Laptop X").description("Powerful laptop")
                .price(new BigDecimal("1200.00")).stockQuantity(50)
                .category(CategoryDTO.builder().id(1L).name("Electronics").build())
                .imageUrl("http://example.com/laptop.jpg").build();
    }

    @Test
    @DisplayName("Should create a product successfully")
    void shouldCreateProductSuccessfully() {
        ProductDTOs.CreateProductRequest createRequest = new ProductDTOs.CreateProductRequest();
        createRequest.setName("New Phone");
        createRequest.setDescription("Latest model");
        createRequest.setPrice(new BigDecimal("999.99"));
        createRequest.setStockQuantity(100);
        createRequest.setCategoryId(1L);

        Product newProduct = Product.builder()
                .id(UUID.randomUUID()).name("New Phone").description("Latest model")
                .price(new BigDecimal("999.99")).stockQuantity(100).category(electronicsCategory)
                .build();

        ProductDTOs.ProductResponse newProductResponse = ProductDTOs.ProductResponse.builder()
                .id(newProduct.getId()).name("New Phone").description("Latest model")
                .price(new BigDecimal("999.99")).stockQuantity(100)
                .category(CategoryDTO.builder().id(1L).name("Electronics").build())
                .build();

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(electronicsCategory));
        when(productMapper.toProduct(createRequest)).thenReturn(newProduct);
        when(productRepository.save(any(Product.class))).thenReturn(newProduct);
        when(productMapper.toProductResponse(newProduct)).thenReturn(newProductResponse);

        ProductDTOs.ProductResponse result = productService.createProduct(createRequest);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("New Phone");
        verify(categoryRepository, times(1)).findById(1L);
        verify(productMapper, times(1)).toProduct(createRequest);
        verify(productRepository, times(1)).save(any(Product.class));
        verify(productMapper, times(1)).toProductResponse(newProduct);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating product with non-existent category")
    void shouldThrowExceptionWhenCreatingProductWithNonExistentCategory() {
        ProductDTOs.CreateProductRequest createRequest = new ProductDTOs.CreateProductRequest();
        createRequest.setCategoryId(99L); // Non-existent category

        when(categoryRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(createRequest));
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should retrieve product by ID")
    void shouldGetProductById() {
        when(productRepository.findById(laptop.getId())).thenReturn(Optional.of(laptop));
        when(productMapper.toProductResponse(laptop)).thenReturn(laptopResponse);

        ProductDTOs.ProductResponse result = productService.getProductById(laptop.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(laptop.getId());
        assertThat(result.getName()).isEqualTo("Laptop X");
        verify(productRepository, times(1)).findById(laptop.getId());
        verify(productMapper, times(1)).toProductResponse(laptop);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when product not found by ID")
    void shouldThrowExceptionWhenProductNotFoundById() {
        UUID nonExistentId = UUID.randomUUID();
        when(productRepository.findById(nonExistentId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(nonExistentId));
        verify(productRepository, times(1)).findById(nonExistentId);
        verify(productMapper, never()).toProductResponse(any(Product.class));
    }

    @Test
    @DisplayName("Should retrieve all products with pagination")
    void shouldGetAllProductsWithPagination() {
        Pageable pageable = PageRequest.of(0, 10, Sort.by("name").ascending());
        Page<Product> productPage = new PageImpl<>(Collections.singletonList(laptop), pageable, 1);
        Page<ProductDTOs.ProductResponse> productResponsePage = new PageImpl<>(Collections.singletonList(laptopResponse), pageable, 1);

        when(productRepository.findAll(pageable)).thenReturn(productPage);
        when(productMapper.toProductResponse(laptop)).thenReturn(laptopResponse);

        Page<ProductDTOs.ProductResponse> result = productService.getAllProducts(pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Laptop X");
        verify(productRepository, times(1)).findAll(pageable);
        verify(productMapper, times(1)).toProductResponse(laptop);
    }

    @Test
    @DisplayName("Should retrieve products by category ID")
    void shouldGetProductsByCategoryId() {
        List<Product> products = Collections.singletonList(laptop);
        when(productRepository.findByCategoryId(1L)).thenReturn(products);
        when(productMapper.toProductResponse(laptop)).thenReturn(laptopResponse);

        List<ProductDTOs.ProductResponse> result = productService.getProductsByCategoryId(1L);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Laptop X");
        verify(productRepository, times(1)).findByCategoryId(1L);
        verify(productMapper, times(1)).toProductResponse(laptop);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when no products found for category ID")
    void shouldThrowExceptionWhenNoProductsFoundForCategoryId() {
        when(productRepository.findByCategoryId(99L)).thenReturn(Collections.emptyList());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductsByCategoryId(99L));
        verify(productRepository, times(1)).findByCategoryId(99L);
    }

    @Test
    @DisplayName("Should update product successfully")
    void shouldUpdateProductSuccessfully() {
        ProductDTOs.UpdateProductRequest updateRequest = new ProductDTOs.UpdateProductRequest();
        updateRequest.setPrice(new BigDecimal("1150.00"));
        updateRequest.setStockQuantity(45);
        updateRequest.setCategoryId(1L); // Same category ID

        Product updatedProduct = Product.builder()
                .id(laptop.getId()).name("Laptop X").description("Powerful laptop")
                .price(new BigDecimal("1150.00")).stockQuantity(45).category(electronicsCategory)
                .imageUrl("http://example.com/laptop.jpg").build();

        ProductDTOs.ProductResponse updatedProductResponse = ProductDTOs.ProductResponse.builder()
                .id(laptop.getId()).name("Laptop X").description("Powerful laptop")
                .price(new BigDecimal("1150.00")).stockQuantity(45)
                .category(CategoryDTO.builder().id(1L).name("Electronics").build())
                .imageUrl("http://example.com/laptop.jpg").build();

        when(productRepository.findById(laptop.getId())).thenReturn(Optional.of(laptop));
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(electronicsCategory));
        doAnswer(invocation -> {
            Product targetProduct = invocation.getArgument(1);
            targetProduct.setPrice(updateRequest.getPrice());
            targetProduct.setStockQuantity(updateRequest.getStockQuantity());
            return null;
        }).when(productMapper).updateProductFromDto(updateRequest, laptop);
        when(productRepository.save(laptop)).thenReturn(updatedProduct);
        when(productMapper.toProductResponse(updatedProduct)).thenReturn(updatedProductResponse);

        ProductDTOs.ProductResponse result = productService.updateProduct(laptop.getId(), updateRequest);

        assertThat(result).isNotNull();
        assertThat(result.getPrice()).isEqualByComparingTo("1150.00");
        assertThat(result.getStockQuantity()).isEqualTo(45);
        verify(productRepository, times(1)).findById(laptop.getId());
        verify(productMapper, times(1)).updateProductFromDto(updateRequest, laptop);
        verify(productRepository, times(1)).save(laptop);
    }

    @Test
    @DisplayName("Should delete product successfully")
    void shouldDeleteProductSuccessfully() {
        when(productRepository.existsById(laptop.getId())).thenReturn(true);
        doNothing().when(productRepository).deleteById(laptop.getId());

        productService.deleteProduct(laptop.getId());

        verify(productRepository, times(1)).existsById(laptop.getId());
        verify(productRepository, times(1)).deleteById(laptop.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent product")
    void shouldThrowExceptionWhenDeletingNonExistentProduct() {
        UUID nonExistentId = UUID.randomUUID();
        when(productRepository.existsById(nonExistentId)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(nonExistentId));
        verify(productRepository, times(1)).existsById(nonExistentId);
        verify(productRepository, never()).deleteById(any(UUID.class));
    }

    @Test
    @DisplayName("Should decrease product stock")
    void shouldDecreaseProductStock() {
        when(productRepository.findById(laptop.getId())).thenReturn(Optional.of(laptop));
        when(productRepository.save(any(Product.class))).thenReturn(laptop);

        productService.updateProductStock(laptop.getId(), -10);

        assertThat(laptop.getStockQuantity()).isEqualTo(40);
        verify(productRepository, times(1)).findById(laptop.getId());
        verify(productRepository, times(1)).save(laptop);
    }

    @Test
    @DisplayName("Should increase product stock")
    void shouldIncreaseProductStock() {
        when(productRepository.findById(laptop.getId())).thenReturn(Optional.of(laptop));
        when(productRepository.save(any(Product.class))).thenReturn(laptop);

        productService.updateProductStock(laptop.getId(), 20);

        assertThat(laptop.getStockQuantity()).isEqualTo(70);
        verify(productRepository, times(1)).findById(laptop.getId());
        verify(productRepository, times(1)).save(laptop);
    }

    @Test
    @DisplayName("Should throw IllegalArgumentException when decreasing stock below zero")
    void shouldThrowExceptionWhenDecreasingStockBelowZero() {
        when(productRepository.findById(laptop.getId())).thenReturn(Optional.of(laptop));

        assertThrows(IllegalArgumentException.class, () -> productService.updateProductStock(laptop.getId(), -60));

        assertThat(laptop.getStockQuantity()).isEqualTo(50); // Stock should not change
        verify(productRepository, times(1)).findById(laptop.getId());
        verify(productRepository, never()).save(any(Product.class));
    }
}
```