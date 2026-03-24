package com.alx.devops.controller;

import com.alx.devops.config.JwtTokenProvider;
import com.alx.devops.dto.ProductDTO;
import com.alx.devops.exception.ResourceNotFoundException;
import com.alx.devops.model.Role;
import com.alx.devops.model.RoleName;
import com.alx.devops.model.User;
import com.alx.devops.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * API (Integration) tests for {@link ProductController}.
 * Uses {@link WebMvcTest} to test the controller layer, mocking out the service layer.
 * Focuses on HTTP request/response handling, validation, and authorization.
 */
@WebMvcTest(ProductController.class)
@Import({JwtTokenProvider.class}) // Import JwtTokenProvider if it's used for actual token generation/validation setup
@DisplayName("ProductController API Tests")
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @Autowired
    private ObjectMapper objectMapper;

    // Simulate authenticated users for testing authorization
    private String adminToken;
    private String userToken;
    private ProductDTO productDTO;

    @BeforeEach
    void setUp() {
        // Setup ProductDTO for tests
        productDTO = new ProductDTO(1L, "Test Product", "Description", new BigDecimal("100.00"), 10, 1L, "Category1");

        // Simulate admin user authentication
        Set<GrantedAuthority> adminAuthorities = Collections.singleton(new SimpleGrantedAuthority("ROLE_ADMIN"));
        UsernamePasswordAuthenticationToken adminAuth = new UsernamePasswordAuthenticationToken(new User(1L, "admin", "admin@test.com", "password", Collections.singleton(new Role(RoleName.ROLE_ADMIN))), null, adminAuthorities);
        SecurityContextHolder.getContext().setAuthentication(adminAuth);

        // Simulate user authentication
        Set<GrantedAuthority> userAuthorities = Collections.singleton(new SimpleGrantedAuthority("ROLE_USER"));
        UsernamePasswordAuthenticationToken userAuth = new UsernamePasswordAuthenticationToken(new User(2L, "user", "user@test.com", "password", Collections.singleton(new Role(RoleName.ROLE_USER))), null, userAuthorities);
        // We'll set this when needed for user-specific tests

        // Note: For actual JWT token generation for tests, you'd integrate JwtTokenProvider
        // For @WebMvcTest, Spring Security Test context is often enough with mock authentication.
        // If actual JWT parsing/validation is done by the security filter, you might need a real token.
        // For simplicity, we're using Spring Security's TestContextHolder to set up authentication.
        // A more complex setup would involve generating a real JWT token from a JwtTokenProvider.
        JwtTokenProvider tokenProvider = new JwtTokenProvider("aVerySecretKeyForAlxDevOpsProjectThatIsLongEnoughAndSecureSoNoOneCanGuessItEasily", 86400000); // Using the same secret as in app config
        adminToken = tokenProvider.generateToken(adminAuth);
        userToken = tokenProvider.generateToken(userAuth);
    }

    // --- GET /api/products ---
    @Test
    @DisplayName("GET /api/products - Should return all products for authenticated USER")
    void getAllProducts_shouldReturnAllProducts_whenUserAuthenticated() throws Exception {
        List<ProductDTO> products = Arrays.asList(productDTO,
                new ProductDTO(2L, "Product2", "Desc2", new BigDecimal("200.00"), 20, 2L, "Category2"));
        when(productService.getAllProducts()).thenReturn(products);

        mockMvc.perform(get("/api/products")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name", is("Test Product")));
        verify(productService, times(1)).getAllProducts();
    }

    @Test
    @DisplayName("GET /api/products - Should return products by search keyword for authenticated USER")
    void getAllProducts_shouldReturnFilteredProducts_whenUserAuthenticatedAndSearchProvided() throws Exception {
        List<ProductDTO> products = Collections.singletonList(productDTO); // Only productDTO matches "test"
        when(productService.searchProducts("test")).thenReturn(products);

        mockMvc.perform(get("/api/products?search=test")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Test Product")));
        verify(productService, times(1)).searchProducts("test");
        verify(productService, never()).getAllProducts(); // Should not call getAllProducts if search is present
    }

    @Test
    @DisplayName("GET /api/products - Should return 401 if not authenticated")
    void getAllProducts_shouldReturnUnauthorized_whenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        verify(productService, never()).getAllProducts();
    }

    // --- GET /api/products/{id} ---
    @Test
    @DisplayName("GET /api/products/{id} - Should return product by ID for authenticated USER")
    void getProductById_shouldReturnProduct_whenUserAuthenticated() throws Exception {
        when(productService.getProductById(1L)).thenReturn(productDTO);

        mockMvc.perform(get("/api/products/{id}", 1L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.name", is("Test Product")));
        verify(productService, times(1)).getProductById(1L);
    }

    @Test
    @DisplayName("GET /api/products/{id} - Should return 404 if product not found")
    void getProductById_shouldReturnNotFound_whenProductNotFound() throws Exception {
        when(productService.getProductById(anyLong())).thenThrow(new ResourceNotFoundException("Product not found"));

        mockMvc.perform(get("/api/products/{id}", 99L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
        verify(productService, times(1)).getProductById(99L);
    }

    // --- POST /api/products ---
    @Test
    @DisplayName("POST /api/products - Should create product for ADMIN user")
    void createProduct_shouldCreateProduct_whenAdminAuthenticated() throws Exception {
        ProductDTO newProductDTO = new ProductDTO(null, "New Product", "New Desc", new BigDecimal("50.00"), 5, 1L, null);
        ProductDTO createdProductDTO = new ProductDTO(3L, "New Product", "New Desc", new BigDecimal("50.00"), 5, 1L, "Category1");
        when(productService.createProduct(any(ProductDTO.class))).thenReturn(createdProductDTO);

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newProductDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(3)))
                .andExpect(jsonPath("$.name", is("New Product")));
        verify(productService, times(1)).createProduct(any(ProductDTO.class));
    }

    @Test
    @DisplayName("POST /api/products - Should return 403 for non-ADMIN user")
    void createProduct_shouldReturnForbidden_whenUserAuthenticated() throws Exception {
        ProductDTO newProductDTO = new ProductDTO(null, "New Product", "New Desc", new BigDecimal("50.00"), 5, 1L, null);

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newProductDTO)))
                .andExpect(status().isForbidden());
        verify(productService, never()).createProduct(any(ProductDTO.class));
    }

    @Test
    @DisplayName("POST /api/products - Should return 400 for invalid product data")
    void createProduct_shouldReturnBadRequest_whenInvalidProductData() throws Exception {
        ProductDTO invalidProductDTO = new ProductDTO(null, "", "New Desc", new BigDecimal("0.00"), -1, null, null); // Invalid name, price, stock, categoryId

        mockMvc.perform(post("/api/products")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidProductDTO)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
        verify(productService, never()).createProduct(any(ProductDTO.class));
    }

    // --- PUT /api/products/{id} ---
    @Test
    @DisplayName("PUT /api/products/{id} - Should update product for ADMIN user")
    void updateProduct_shouldUpdateProduct_whenAdminAuthenticated() throws Exception {
        ProductDTO updatedProductDTO = new ProductDTO(1L, "Updated Product", "Updated Desc", new BigDecimal("120.00"), 12, 1L, "Category1");
        when(productService.updateProduct(anyLong(), any(ProductDTO.class))).thenReturn(updatedProductDTO);

        mockMvc.perform(put("/api/products/{id}", 1L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProductDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Updated Product")));
        verify(productService, times(1)).updateProduct(anyLong(), any(ProductDTO.class));
    }

    @Test
    @DisplayName("PUT /api/products/{id} - Should return 403 for non-ADMIN user")
    void updateProduct_shouldReturnForbidden_whenUserAuthenticated() throws Exception {
        ProductDTO updatedProductDTO = new ProductDTO(1L, "Updated Product", "Updated Desc", new BigDecimal("120.00"), 12, 1L, "Category1");

        mockMvc.perform(put("/api/products/{id}", 1L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProductDTO)))
                .andExpect(status().isForbidden());
        verify(productService, never()).updateProduct(anyLong(), any(ProductDTO.class));
    }

    @Test
    @DisplayName("PUT /api/products/{id} - Should return 404 if product not found during update")
    void updateProduct_shouldReturnNotFound_whenProductNotFound() throws Exception {
        ProductDTO updatedProductDTO = new ProductDTO(99L, "Updated Product", "Updated Desc", new BigDecimal("120.00"), 12, 1L, "Category1");
        when(productService.updateProduct(anyLong(), any(ProductDTO.class))).thenThrow(new ResourceNotFoundException("Product not found for update"));

        mockMvc.perform(put("/api/products/{id}", 99L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProductDTO)))
                .andExpect(status().isNotFound());
        verify(productService, times(1)).updateProduct(anyLong(), any(ProductDTO.class));
    }

    // --- DELETE /api/products/{id} ---
    @Test
    @DisplayName("DELETE /api/products/{id} - Should delete product for ADMIN user")
    void deleteProduct_shouldDeleteProduct_whenAdminAuthenticated() throws Exception {
        doNothing().when(productService).deleteProduct(anyLong());

        mockMvc.perform(delete("/api/products/{id}", 1L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @DisplayName("DELETE /api/products/{id} - Should return 403 for non-ADMIN user")
    void deleteProduct_shouldReturnForbidden_whenUserAuthenticated() throws Exception {
        mockMvc.perform(delete("/api/products/{id}", 1L)
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        verify(productService, never()).deleteProduct(anyLong());
    }

    @Test
    @DisplayName("DELETE /api/products/{id} - Should return 404 if product not found during delete")
    void deleteProduct_shouldReturnNotFound_whenProductNotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Product not found for delete")).when(productService).deleteProduct(anyLong());

        mockMvc.perform(delete("/api/products/{id}", 99L)
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
        verify(productService, times(1)).deleteProduct(99L);
    }
}