```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.config.JwtService;
import com.alx.ecommerce.dto.AuthDTOs;
import com.alx.ecommerce.dto.ProductDTOs;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.model.User;
import com.alx.ecommerce.repository.CategoryRepository;
import com.alx.ecommerce.repository.ProductRepository;
import com.alx.ecommerce.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.RedisContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.math.BigDecimal;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Testcontainers
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ProductControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("testuser")
            .withPassword("testpass");

    @Container
    static RedisContainer redis = new RedisContainer(RedisContainer.DEFAULT_IMAGE_NAME + ":7.0.12-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379).toString());
        registry.add("jwt.secret", () -> "veryStrongAndSecretKeyForJwtTestingOnly12345");
        registry.add("jwt.expiration", () -> "3600000"); // 1 hour
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private Category testCategory;
    private Product existingProduct;
    private String adminToken;
    private String customerToken;

    @BeforeEach
    void setUp() throws Exception {
        // Clear database before each test
        productRepository.deleteAll();
        categoryRepository.deleteAll();
        userRepository.deleteAll();

        // Create test category
        testCategory = Category.builder().name("Test Category").description("Category for integration tests").build();
        testCategory = categoryRepository.save(testCategory);

        // Create existing product
        existingProduct = Product.builder()
                .name("Test Product")
                .description("Description for test product")
                .price(new BigDecimal("99.99"))
                .stockQuantity(100)
                .category(testCategory)
                .imageUrl("http://example.com/test_product.jpg")
                .build();
        existingProduct = productRepository.save(existingProduct);

        // Create admin user
        User adminUser = User.builder()
                .username("adminuser")
                .email("admin@test.com")
                .passwordHash(passwordEncoder.encode("adminpass"))
                .role(User.Role.ADMIN)
                .build();
        userRepository.save(adminUser);
        adminToken = jwtService.generateToken(adminUser);

        // Create customer user
        User customerUser = User.builder()
                .username("customeruser")
                .email("customer@test.com")
                .passwordHash(passwordEncoder.encode("customerpass"))
                .role(User.Role.CUSTOMER)
                .build();
        userRepository.save(customerUser);
        customerToken = jwtService.generateToken(customerUser);
    }

    @Test
    @DisplayName("Should create product when authenticated as ADMIN")
    void shouldCreateProductAsAdmin() throws Exception {
        ProductDTOs.CreateProductRequest createRequest = new ProductDTOs.CreateProductRequest();
        createRequest.setName("New Product");
        createRequest.setDescription("New product description");
        createRequest.setPrice(new BigDecimal("150.00"));
        createRequest.setStockQuantity(50);
        createRequest.setCategoryId(testCategory.getId());
        createRequest.setImageUrl("http://example.com/new_product.jpg");

        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.name").value("New Product"))
                .andExpect(jsonPath("$.category.id").value(testCategory.getId()));

        assertThat(productRepository.findByNameContainingIgnoreCase("New Product")).hasSize(1);
    }

    @Test
    @DisplayName("Should NOT create product when authenticated as CUSTOMER")
    void shouldNotCreateProductAsCustomer() throws Exception {
        ProductDTOs.CreateProductRequest createRequest = new ProductDTOs.CreateProductRequest();
        createRequest.setName("Customer Product");
        createRequest.setPrice(new BigDecimal("10.00"));
        createRequest.setStockQuantity(10);
        createRequest.setCategoryId(testCategory.getId());

        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should get product by ID without authentication")
    void shouldGetProductByIdWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/products/{id}", existingProduct.getId())
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(existingProduct.getId().toString()))
                .andExpect(jsonPath("$.name").value("Test Product"));
    }

    @Test
    @DisplayName("Should get all products without authentication")
    void shouldGetAllProductsWithoutAuth() throws Exception {
        mockMvc.perform(get("/api/v1/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].name").value("Test Product"));
    }

    @Test
    @DisplayName("Should update product when authenticated as ADMIN")
    void shouldUpdateProductAsAdmin() throws Exception {
        ProductDTOs.UpdateProductRequest updateRequest = new ProductDTOs.UpdateProductRequest();
        updateRequest.setPrice(new BigDecimal("110.50"));
        updateRequest.setStockQuantity(90);

        mockMvc.perform(put("/api/v1/products/{id}", existingProduct.getId())
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.price").value(110.50))
                .andExpect(jsonPath("$.stockQuantity").value(90));

        Product updatedProduct = productRepository.findById(existingProduct.getId()).get();
        assertThat(updatedProduct.getPrice()).isEqualByComparingTo("110.50");
        assertThat(updatedProduct.getStockQuantity()).isEqualTo(90);
    }

    @Test
    @DisplayName("Should NOT update product when authenticated as CUSTOMER")
    void shouldNotUpdateProductAsCustomer() throws Exception {
        ProductDTOs.UpdateProductRequest updateRequest = new ProductDTOs.UpdateProductRequest();
        updateRequest.setPrice(new BigDecimal("120.00"));

        mockMvc.perform(put("/api/v1/products/{id}", existingProduct.getId())
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should delete product when authenticated as ADMIN")
    void shouldDeleteProductAsAdmin() throws Exception {
        mockMvc.perform(delete("/api/v1/products/{id}", existingProduct.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isNoContent());

        assertThat(productRepository.findById(existingProduct.getId())).isNotPresent();
    }

    @Test
    @DisplayName("Should NOT delete product when authenticated as CUSTOMER")
    void shouldNotDeleteProductAsCustomer() throws Exception {
        mockMvc.perform(delete("/api/v1/products/{id}", existingProduct.getId())
                        .header("Authorization", "Bearer " + customerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should return 404 for non-existent product")
    void shouldReturnNotFoundForNonExistentProduct() throws Exception {
        UUID nonExistentId = UUID.randomUUID();
        mockMvc.perform(get("/api/v1/products/{id}", nonExistentId)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found with id : '" + nonExistentId + "'"));
    }

    @Test
    @DisplayName("Should return 400 for invalid product creation request")
    void shouldReturnBadRequestForInvalidCreateProduct() throws Exception {
        ProductDTOs.CreateProductRequest createRequest = new ProductDTOs.CreateProductRequest();
        createRequest.setName(""); // Invalid name
        createRequest.setPrice(new BigDecimal("-10.00")); // Invalid price
        createRequest.setStockQuantity(null); // Missing stock
        createRequest.setCategoryId(testCategory.getId());

        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.errors.name").exists())
                .andExpect(jsonPath("$.errors.price").exists())
                .andExpect(jsonPath("$.errors.stockQuantity").exists());
    }

    @Test
    @DisplayName("Should handle invalid JWT token")
    void shouldHandleInvalidJwtToken() throws Exception {
        mockMvc.perform(post("/api/v1/products")
                        .header("Authorization", "Bearer invalid-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductDTOs.CreateProductRequest())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token: JWT strings must contain exactly 3 period characters. The last two parts of a JWT string (separated by '.') are a header.payload and a signature.")); // Specific error message from JJWT library.
    }
}
```