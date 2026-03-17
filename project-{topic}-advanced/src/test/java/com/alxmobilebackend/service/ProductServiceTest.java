```java
package com.alxmobilebackend.service;

import com.alxmobilebackend.dto.ProductDto;
import com.alxmobilebackend.exception.ResourceNotFoundException;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.model.Product;
import com.alxmobilebackend.repository.ProductRepository;
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
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @InjectMocks
    private ProductService productService;

    private Product testProduct;
    private ProductDto.ProductCreateRequest createRequest;
    private ProductDto.ProductUpdateRequest updateRequest;

    @BeforeEach
    void setUp() {
        testProduct = Product.builder()
                .id(1L)
                .name("Test Product")
                .description("A test product description")
                .price(BigDecimal.valueOf(100.00))
                .stockQuantity(10)
                .imageUrl("http://example.com/test.jpg")
                .build();

        createRequest = ProductDto.ProductCreateRequest.builder()
                .name("New Product")
                .description("Description for new product")
                .price(BigDecimal.valueOf(150.00))
                .stockQuantity(20)
                .imageUrl("http://example.com/new.jpg")
                .build();

        updateRequest = ProductDto.ProductUpdateRequest.builder()
                .name("Updated Product")
                .description("Updated description")
                .price(BigDecimal.valueOf(120.00))
                .stockQuantity(15)
                .build();
    }

    @Test
    @DisplayName("Should create a new product")
    void whenCreateProduct_thenReturnProductResponse() {
        when(productRepository.existsByName(createRequest.getName())).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(testProduct); // Mock save to return a product with an ID

        ProductDto.ProductResponse result = productService.createProduct(createRequest);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo(testProduct.getName());
        assertThat(result.getPrice()).isEqualTo(testProduct.getPrice());
        verify(productRepository, times(1)).existsByName(createRequest.getName());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ValidationException when creating product with existing name")
    void whenCreateProductWithExistingName_thenThrowValidationException() {
        when(productRepository.existsByName(createRequest.getName())).thenReturn(true);

        assertThrows(ValidationException.class, () -> productService.createProduct(createRequest));
        verify(productRepository, times(1)).existsByName(createRequest.getName());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should return product by ID")
    void whenGetProductById_thenReturnProductResponse() {
        when(productRepository.findById(testProduct.getId())).thenReturn(Optional.of(testProduct));

        ProductDto.ProductResponse result = productService.getProductById(testProduct.getId());

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(testProduct.getId());
        assertThat(result.getName()).isEqualTo(testProduct.getName());
        verify(productRepository, times(1)).findById(testProduct.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when product by ID not found")
    void whenGetProductById_thenThrowResourceNotFound() {
        when(productRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(2L));
        verify(productRepository, times(1)).findById(2L);
    }

    @Test
    @DisplayName("Should return all products paginated")
    void whenGetAllProducts_thenReturnPageOfProductResponses() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productPage = new PageImpl<>(List.of(testProduct), pageable, 1);
        when(productRepository.findAll(pageable)).thenReturn(productPage);

        Page<ProductDto.ProductResponse> result = productService.getAllProducts(pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getId()).isEqualTo(testProduct.getId());
        verify(productRepository, times(1)).findAll(pageable);
    }

    @Test
    @DisplayName("Should update product and return updated product DTO")
    void whenUpdateProduct_thenUpdateAndReturnProduct() {
        Product updatedProductEntity = Product.builder()
                .id(testProduct.getId())
                .name(updateRequest.getName())
                .description(updateRequest.getDescription())
                .price(updateRequest.getPrice())
                .stockQuantity(updateRequest.getStockQuantity())
                .imageUrl(testProduct.getImageUrl()) // image URL not updated in request
                .build();

        when(productRepository.findById(testProduct.getId())).thenReturn(Optional.of(testProduct));
        when(productRepository.existsByName(updateRequest.getName())).thenReturn(false);
        when(productRepository.save(any(Product.class))).thenReturn(updatedProductEntity);

        ProductDto.ProductResponse result = productService.updateProduct(testProduct.getId(), updateRequest);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo(updateRequest.getName());
        assertThat(result.getDescription()).isEqualTo(updateRequest.getDescription());
        assertThat(result.getPrice()).isEqualTo(updateRequest.getPrice());
        assertThat(result.getStockQuantity()).isEqualTo(updateRequest.getStockQuantity());
        verify(productRepository, times(1)).findById(testProduct.getId());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent product")
    void whenUpdateProduct_thenThrowResourceNotFound() {
        when(productRepository.findById(2L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(2L, updateRequest));
        verify(productRepository, times(1)).findById(2L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ValidationException when updating with existing product name")
    void whenUpdateProductWithExistingName_thenThrowValidationException() {
        when(productRepository.findById(testProduct.getId())).thenReturn(Optional.of(testProduct));
        when(productRepository.existsByName(updateRequest.getName())).thenReturn(true);

        assertThrows(ValidationException.class, () -> productService.updateProduct(testProduct.getId(), updateRequest));
        verify(productRepository, times(1)).findById(testProduct.getId());
        verify(productRepository, times(1)).existsByName(updateRequest.getName());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should delete product by ID")
    void whenDeleteProduct_thenDeleteProduct() {
        when(productRepository.existsById(testProduct.getId())).thenReturn(true);
        doNothing().when(productRepository).deleteById(testProduct.getId());

        productService.deleteProduct(testProduct.getId());

        verify(productRepository, times(1)).existsById(testProduct.getId());
        verify(productRepository, times(1)).deleteById(testProduct.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent product")
    void whenDeleteProduct_thenThrowResourceNotFound() {
        when(productRepository.existsById(2L)).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(2L));
        verify(productRepository, times(1)).existsById(2L);
        verify(productRepository, never()).deleteById(anyLong());
    }
}
```

#### Integration Tests & API Tests

These tests use Spring Boot's test slice annotations (`@SpringBootTest`, `@WebMvcTest`) and `MockMvc` or `TestRestTemplate` to simulate HTTP requests.