package com.alx.devops.service;

import com.alx.devops.dto.ProductDTO;
import com.alx.devops.exception.ResourceNotFoundException;
import com.alx.devops.model.Category;
import com.alx.devops.model.Product;
import com.alx.devops.repository.CategoryRepository;
import com.alx.devops.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link ProductService}.
 * Mocks repository dependencies to test service layer logic in isolation.
 * Aims for high code coverage on service methods.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("ProductService Unit Tests")
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @InjectMocks
    private ProductService productService;

    private Category category;
    private Product product1;
    private Product product2;
    private ProductDTO productDTO1;
    private ProductDTO productDTO2;

    @BeforeEach
    void setUp() {
        category = new Category(1L, "Electronics", "Electronic devices", null);
        product1 = new Product(1L, "Laptop", "Powerful laptop", new BigDecimal("1200.00"), 10, category);
        product2 = new Product(2L, "Mouse", "Wireless mouse", new BigDecimal("25.00"), 50, category);

        productDTO1 = new ProductDTO(1L, "Laptop", "Powerful laptop", new BigDecimal("1200.00"), 10, 1L, "Electronics");
        productDTO2 = new ProductDTO(2L, "Mouse", "Wireless mouse", new BigDecimal("25.00"), 50, 1L, "Electronics");
    }

    @Test
    @DisplayName("Should retrieve all products")
    void getAllProducts_shouldReturnAllProducts() {
        when(productRepository.findAll()).thenReturn(Arrays.asList(product1, product2));

        List<ProductDTO> result = productService.getAllProducts();

        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Laptop");
        assertThat(result.get(1).getName()).isEqualTo("Mouse");
        verify(productRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should retrieve product by ID")
    void getProductById_shouldReturnProduct_whenFound() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product1));

        ProductDTO result = productService.getProductById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("Laptop");
        assertThat(result.getId()).isEqualTo(1L);
        verify(productRepository, times(1)).findById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when product by ID is not found")
    void getProductById_shouldThrowResourceNotFound_whenNotFound() {
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.getProductById(99L));
        verify(productRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should create a new product")
    void createProduct_shouldCreateProduct() {
        ProductDTO newProductDTO = new ProductDTO(null, "Keyboard", "Mechanical keyboard", new BigDecimal("75.00"), 20, 1L, null);
        Product newProduct = new Product(null, "Keyboard", "Mechanical keyboard", new BigDecimal("75.00"), 20, category);
        Product savedProduct = new Product(3L, "Keyboard", "Mechanical keyboard", new BigDecimal("75.00"), 20, category);

        when(categoryRepository.findById(anyLong())).thenReturn(Optional.of(category));
        when(productRepository.save(any(Product.class))).thenReturn(savedProduct);

        ProductDTO result = productService.createProduct(newProductDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(3L);
        assertThat(result.getName()).isEqualTo("Keyboard");
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when creating product with non-existent category")
    void createProduct_shouldThrowResourceNotFound_whenCategoryNotFound() {
        ProductDTO newProductDTO = new ProductDTO(null, "Keyboard", "Mechanical keyboard", new BigDecimal("75.00"), 20, 99L, null);
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.createProduct(newProductDTO));
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should update an existing product")
    void updateProduct_shouldUpdateProduct_whenFound() {
        ProductDTO updatedProductDTO = new ProductDTO(1L, "Laptop Pro", "New generation laptop", new BigDecimal("1500.00"), 15, 1L, "Electronics");
        Category newCategory = new Category(2L, "Books", "Book category", null);
        Product updatedProductEntity = new Product(1L, "Laptop Pro", "New generation laptop", new BigDecimal("1500.00"), 15, newCategory);

        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product1));
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.of(newCategory)); // Assume category ID might change
        when(productRepository.save(any(Product.class))).thenReturn(updatedProductEntity);

        ProductDTO result = productService.updateProduct(1L, updatedProductDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Laptop Pro");
        assertThat(result.getPrice()).isEqualTo(new BigDecimal("1500.00"));
        assertThat(result.getStockQuantity()).isEqualTo(15);
        assertThat(result.getCategoryId()).isEqualTo(2L);
        verify(productRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findById(1L);
        verify(productRepository, times(1)).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent product")
    void updateProduct_shouldThrowResourceNotFound_whenProductNotFound() {
        ProductDTO updatedProductDTO = new ProductDTO(99L, "NonExistent", "Desc", new BigDecimal("100"), 1, 1L, "Cat");
        when(productRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(99L, updatedProductDTO));
        verify(productRepository, times(1)).findById(99L);
        verify(categoryRepository, never()).findById(anyLong());
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating product with non-existent category")
    void updateProduct_shouldThrowResourceNotFound_whenCategoryNotFound() {
        ProductDTO updatedProductDTO = new ProductDTO(1L, "Laptop Pro", "Desc", new BigDecimal("1500.00"), 15, 99L, "NonExistentCat");
        when(productRepository.findById(anyLong())).thenReturn(Optional.of(product1));
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> productService.updateProduct(1L, updatedProductDTO));
        verify(productRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findById(99L);
        verify(productRepository, never()).save(any(Product.class));
    }

    @Test
    @DisplayName("Should delete a product")
    void deleteProduct_shouldDeleteProduct_whenFound() {
        when(productRepository.existsById(anyLong())).thenReturn(true);
        doNothing().when(productRepository).deleteById(anyLong());

        productService.deleteProduct(1L);

        verify(productRepository, times(1)).existsById(1L);
        verify(productRepository, times(1)).deleteById(1L);
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent product")
    void deleteProduct_shouldThrowResourceNotFound_whenNotFound() {
        when(productRepository.existsById(anyLong())).thenReturn(false);

        assertThrows(ResourceNotFoundException.class, () -> productService.deleteProduct(99L));
        verify(productRepository, times(1)).existsById(99L);
        verify(productRepository, never()).deleteById(anyLong());
    }

    @Test
    @DisplayName("Should search products by keyword in name or description")
    void searchProducts_shouldReturnMatchingProducts() {
        when(productRepository.findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(anyString(), anyString()))
                .thenReturn(List.of(product1));

        List<ProductDTO> result = productService.searchProducts("laptop");

        assertThat(result).isNotNull();
        assertThat(result).hasSize(1);
        assertThat(result.get(0).getName()).isEqualTo("Laptop");
        verify(productRepository, times(1)).findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase("laptop", "laptop");
    }

    @Test
    @DisplayName("Should return all products if search keyword is empty")
    void searchProducts_shouldReturnAllProducts_whenKeywordIsEmpty() {
        when(productRepository.findAll()).thenReturn(Arrays.asList(product1, product2));

        List<ProductDTO> result = productService.searchProducts("");

        assertThat(result).isNotNull();
        assertThat(result).hasSize(2);
        verify(productRepository, never()).findByNameContainingIgnoreCaseOrDescriptionContainingIgnoreCase(anyString(), anyString());
        verify(productRepository, times(1)).findAll();
    }
}