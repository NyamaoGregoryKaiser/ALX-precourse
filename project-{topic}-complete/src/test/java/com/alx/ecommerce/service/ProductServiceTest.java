package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.product.ProductRequest;
import com.alx.ecommerce.dto.product.ProductResponse;
import com.alx.ecommerce.exception.ResourceNotFoundException;
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

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ProductService.
 */
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
    private ProductRequest productRequest;

    @BeforeEach
    void setUp() {
        category = Category.builder().id(1L).name("Electronics").description("Electronic devices").build();
        product = Product.builder()
                .id(1L)
                .name("Laptop")
                .description("Powerful laptop")
                .price(BigDecimal.valueOf(1200.00))
                .stockQuantity(5)
                .category(category)
                .build();
        productRequest = new ProductRequest();
        productRequest.setName("Laptop");
        productRequest.setDescription("Powerful laptop");
        productRequest.setPrice(BigDecimal.valueOf(1200.00));
        productRequest.setStockQuantity(5);
        productRequest.setCategoryId(1L);
    }

    @Test
    @DisplayName("Should create product successfully")
    void shouldCreateProductSuccessfully() {
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        ProductResponse response = productService.createProduct(productRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Laptop");
        assertThat(response.getCategoryName()).isEqualTo("Electronics");
        verify(categoryRepository, times(1)).findById(anyLong());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating product with non-existent category")
    void shouldThrowResourceNotFoundExceptionWhenCreatingProductWithNonExistentCategory() {
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(productRequest));

        verify(categoryRepository, times(1)).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should get all products successfully")
    void shouldGetAllProductsSuccessfully() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<Product> productPage = new PageImpl<>(List.of(product), pageable, 1);
        when(productRepository.findAll(any(Pageable.class))).thenReturn(productPage);

        Page<ProductResponse> responsePage = productService.getAllProducts(0, 10, "id", "asc");

        assertThat(responsePage).isNotNull();
        assertThat(responsePage.getContent()).hasSize(1);
        assertThat(responsePage.getContent().get(0).getName()).isEqualTo("Laptop");
        verify(productRepository, times(1)).findAll(any(Pageable.class));
    }

    @Test
    @DisplayName("Should get product by ID successfully")
    void shouldGetProductByIdSuccessfully() {
        when(productRepository.findByIdWithCategory(anyLong())).thenReturn(Optional.of(product));

        ProductResponse response = productService.getProductById(1L);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Laptop");
        verify(productRepository, times(1)).findByIdWithCategory(anyLong());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when getting product by non-existent ID")
    void shouldThrowResourceNotFoundExceptionWhenGettingProductByNonExistentId() {
        when(productRepository.findByIdWithCategory(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(99L));

        verify(productRepository, times(1)).findByIdWithCategory(anyLong());
    }

    @Test
    @DisplayName("Should update product successfully")
    void shouldUpdateProductSuccessfully() {
        Product updatedProduct = Product.builder()
                .id(1L)
                .name("Updated Laptop")
                .description("Updated description")
                .price(BigDecimal.valueOf(1300.00))
                .stockQuantity(10)
                .category(category)
                .build();
        ProductRequest updateRequest = new ProductRequest();
        updateRequest.setName("Updated Laptop");
        updateRequest.setDescription("Updated description");
        updateRequest.setPrice(BigDecimal.valueOf(1300.00));
        updateRequest.setStockQuantity(10);
        updateRequest.setCategoryId(1L);

        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product));
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(updatedProduct);

        ProductResponse response = productService.updateProduct(1L, updateRequest);

        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getName()).isEqualTo("Updated Laptop");
        assertThat(response.getDescription()).isEqualTo("Updated description");
        verify(productRepository, times(1)).findById(anyLong());
        verify(categoryRepository, times(1)).findById(anyLong());
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent product")
    void shouldThrowResourceNotFoundExceptionWhenUpdatingNonExistentProduct() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(99L, productRequest));

        verify(productRepository, times(1)).findById(anyLong());
        verify(categoryRepository, never()).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating product with non-existent category")
    void shouldThrowResourceNotFoundExceptionWhenUpdatingProductWithNonExistentCategory() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product));
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(1L, productRequest));

        verify(productRepository, times(1)).findById(anyLong());
        verify(categoryRepository, times(1)).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should delete product successfully")
    void shouldDeleteProductSuccessfully() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product));
        doNothing().when(productRepository).delete(any(Product.class));

        productService.deleteProduct(1L);

        verify(productRepository, times(1)).findById(anyLong());
        verify(productRepository, times(1)).delete(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent product")
    void shouldThrowResourceNotFoundExceptionWhenDeletingNonExistentProduct() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(99L));

        verify(productRepository, times(1)).findById(anyLong());
        verify(productRepository, never()).delete(any(Product.class));
    }

    @Test
    @DisplayName("Should search products by query")
    void shouldSearchProductsByQuery() {
        when(productRepository.searchProducts(anyString())).thenReturn(List.of(product));

        List<ProductResponse> results = productService.searchProducts("laptop");

        assertThat(results).isNotNull();
        assertThat(results).hasSize(1);
        assertThat(results.get(0).getName()).isEqualTo("Laptop");
        verify(productRepository, times(1)).searchProducts(anyString());
    }

    @Test
    @DisplayName("ProductResponse should correctly calculate average rating and review count")
    void productResponseShouldCalculateAverageRatingAndReviewCount() {
        // Test with no reviews
        product.setReviews(Collections.emptySet());
        ProductResponse responseWithoutReviews = productService.mapToProductResponse(product);
        assertThat(responseWithoutReviews.getAverageRating()).isEqualTo(0.0);
        assertThat(responseWithoutReviews.getReviewCount()).isEqualTo(0L);

        // Test with reviews
        product.setReviews(Set.of(
                Review.builder().rating(5).build(),
                Review.builder().rating(4).build(),
                Review.builder().rating(3).build()
        ));
        ProductResponse responseWithReviews = productService.mapToProductResponse(product);
        assertThat(responseWithReviews.getAverageRating()).isEqualTo(4.0); // (5+4+3)/3 = 4
        assertThat(responseWithReviews.getReviewCount()).isEqualTo(3L);
    }
}