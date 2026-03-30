```java
package com.alx.devops.productmanagement.controller;

import com.alx.devops.productmanagement.config.JwtAuthFilter;
import com.alx.devops.productmanagement.config.RateLimitingFilter;
import com.alx.devops.productmanagement.config.SecurityConfig;
import com.alx.devops.productmanagement.dto.ProductDTO;
import com.alx.devops.productmanagement.exception.GlobalExceptionHandler;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.service.ProductService;
import com.alx.devops.productmanagement.service.UserDetailsServiceImpl;
import com.alx.devops.productmanagement.util.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private UserDetailsServiceImpl userDetailsService;
    @MockBean
    private JwtAuthFilter jwtAuthFilter;
    @MockBean
    private JwtUtil jwtUtil;
    @MockBean
    private RateLimitingFilter rateLimitingFilter;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() throws Exception {
        when(rateLimitingFilter.shouldNotFilter(any())).thenReturn(true);
    }

    @Test
    @WithMockUser(roles = "USER") // Authenticated as a regular user
    void testGetAllProducts_Success() throws Exception {
        ProductDTO prod1 = new ProductDTO();
        prod1.setId(1L); prod1.setName("Laptop"); prod1.setPrice(BigDecimal.valueOf(1200)); prod1.setCategoryId(1L); prod1.setCategoryName("Electronics");
        ProductDTO prod2 = new ProductDTO();
        prod2.setId(2L); prod2.setName("Book"); prod2.setPrice(BigDecimal.valueOf(25)); prod2.setCategoryId(2L); prod2.setCategoryName("Books");
        List<ProductDTO> products = Arrays.asList(prod1, prod2);

        when(productService.findAllProducts()).thenReturn(products);

        mockMvc.perform(get("/api/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(2))
                .andExpect(jsonPath("$[0].name").value("Laptop"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetProductById_Success() throws Exception {
        ProductDTO product = new ProductDTO();
        product.setId(1L);
        product.setName("Laptop");
        product.setPrice(BigDecimal.valueOf(1200));
        product.setCategoryId(1L);
        product.setCategoryName("Electronics");

        when(productService.findProductById(1L)).thenReturn(product);

        mockMvc.perform(get("/api/products/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Laptop"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetProductById_NotFound() throws Exception {
        when(productService.findProductById(anyLong())).thenThrow(new ResourceNotFoundException("Product not found"));

        mockMvc.perform(get("/api/products/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found"));
    }

    @Test
    @WithMockUser(roles = "ADMIN") // Admin user can create
    void testCreateProduct_Success() throws Exception {
        ProductDTO newProduct = new ProductDTO();
        newProduct.setName("New Phone");
        newProduct.setDescription("A shiny new phone");
        newProduct.setPrice(BigDecimal.valueOf(700));
        newProduct.setCategoryId(1L);

        ProductDTO createdProduct = new ProductDTO();
        createdProduct.setId(3L);
        createdProduct.setName("New Phone");
        createdProduct.setPrice(BigDecimal.valueOf(700));
        createdProduct.setCategoryId(1L);
        createdProduct.setCategoryName("Electronics");

        when(productService.createProduct(any(ProductDTO.class))).thenReturn(createdProduct);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3L))
                .andExpect(jsonPath("$.name").value("New Phone"));
    }

    @Test
    @WithMockUser(roles = "USER") // Regular user cannot create
    void testCreateProduct_AccessDenied() throws Exception {
        ProductDTO newProduct = new ProductDTO();
        newProduct.setName("New Phone");
        newProduct.setPrice(BigDecimal.valueOf(700));
        newProduct.setCategoryId(1L);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newProduct)))
                .andExpect(status().isForbidden());
        verify(productService, never()).createProduct(any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateProduct_InvalidInput() throws Exception {
        ProductDTO invalidProduct = new ProductDTO(); // Missing name, invalid price
        invalidProduct.setName("");
        invalidProduct.setPrice(BigDecimal.valueOf(-100));
        invalidProduct.setCategoryId(1L);

        mockMvc.perform(post("/api/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidProduct)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists())
                .andExpect(jsonPath("$.price").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateProduct_Success() throws Exception {
        ProductDTO updatedProduct = new ProductDTO();
        updatedProduct.setName("Updated Laptop");
        updatedProduct.setDescription("Powerful updated laptop");
        updatedProduct.setPrice(BigDecimal.valueOf(1300));
        updatedProduct.setCategoryId(1L);

        ProductDTO returnedProduct = new ProductDTO();
        returnedProduct.setId(1L);
        returnedProduct.setName("Updated Laptop");
        returnedProduct.setPrice(BigDecimal.valueOf(1300));
        returnedProduct.setCategoryId(1L);
        returnedProduct.setCategoryName("Electronics");

        when(productService.updateProduct(eq(1L), any(ProductDTO.class))).thenReturn(returnedProduct);

        mockMvc.perform(put("/api/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProduct)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Updated Laptop"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testUpdateProduct_AccessDenied() throws Exception {
        ProductDTO updatedProduct = new ProductDTO();
        updatedProduct.setName("Updated Laptop");
        updatedProduct.setPrice(BigDecimal.valueOf(1300));
        updatedProduct.setCategoryId(1L);

        mockMvc.perform(put("/api/products/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProduct)))
                .andExpect(status().isForbidden());
        verify(productService, never()).updateProduct(anyLong(), any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateProduct_NotFound() throws Exception {
        ProductDTO updatedProduct = new ProductDTO();
        updatedProduct.setName("Updated Laptop");
        updatedProduct.setPrice(BigDecimal.valueOf(1300));
        updatedProduct.setCategoryId(1L);

        when(productService.updateProduct(eq(99L), any(ProductDTO.class)))
                .thenThrow(new ResourceNotFoundException("Product not found with ID: 99"));

        mockMvc.perform(put("/api/products/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedProduct)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found with ID: 99"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteProduct_Success() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/products/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testDeleteProduct_AccessDenied() throws Exception {
        mockMvc.perform(delete("/api/products/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        verify(productService, never()).deleteProduct(anyLong());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteProduct_NotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Product not found with ID: 99")).when(productService).deleteProduct(99L);

        mockMvc.perform(delete("/api/products/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found with ID: 99"));
        verify(productService, times(1)).deleteProduct(99L);
    }
}
```