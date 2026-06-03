```java
package com.alx.pm.controller;

import com.alx.pm.dto.ProductDTO;
import com.alx.pm.exception.ResourceNotFoundException;
import com.alx.pm.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ProductService productService;

    @MockBean
    private Bucket rateLimitingBucket; // Mock the rate limiting bucket

    @Autowired
    private ObjectMapper objectMapper;

    private ProductDTO productDTO;

    @BeforeEach
    void setUp() {
        productDTO = new ProductDTO(1L, "Test Product", "Description", 10.0, 100, 1L, "Category1", null, null);

        // Mock the rate limiting bucket to always allow requests by default
        ConsumptionProbe probe = mock(ConsumptionProbe.class);
        when(probe.isConsumed()).thenReturn(true);
        when(rateLimitingBucket.tryConsumeAndReturnRemaining(anyLong())).thenReturn(probe);
    }

    @Test
    @WithMockUser // Authenticated user
    void getAllProducts_success() throws Exception {
        List<ProductDTO> products = Collections.singletonList(productDTO);
        PageImpl<ProductDTO> page = new PageImpl<>(products, PageRequest.of(0, 10), 1);
        when(productService.getAllProducts(any(Pageable.class), any(), any(), any(), any())).thenReturn(page);

        mockMvc.perform(get("/api/products")
                        .param("page", "0")
                        .param("size", "10")
                        .param("sort", "name,asc")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].name").value(productDTO.getName()));

        verify(productService, times(1)).getAllProducts(any(Pageable.class), eq(null), eq(null), eq(null), eq(null));
    }

    @Test
    @WithMockUser // Authenticated user
    void getAllProducts_rateLimited() throws Exception {
        ConsumptionProbe probe = mock(ConsumptionProbe.class);
        when(probe.isConsumed()).thenReturn(false);
        when(probe.getNanosToWaitForRefill()).thenReturn(1_000_000_000L); // 1 second
        when(rateLimitingBucket.tryConsumeAndReturnRemaining(anyLong())).thenReturn(probe);

        mockMvc.perform(get("/api/products")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$").doesNotExist())
                .andExpect(status().header("X-Rate-Limit-Retry-After-Seconds", "1"));

        verify(productService, never()).getAllProducts(any(Pageable.class), any(), any(), any(), any());
    }

    @Test
    @WithMockUser // Authenticated user
    void getProductById_success() throws Exception {
        when(productService.getProductById(1L)).thenReturn(productDTO);

        mockMvc.perform(get("/api/products/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(productDTO.getName()));

        verify(productService, times(1)).getProductById(1L);
    }

    @Test
    @WithMockUser // Authenticated user
    void getProductById_notFound() throws Exception {
        when(productService.getProductById(anyLong())).thenThrow(new ResourceNotFoundException("Product", "id", 1L));

        mockMvc.perform(get("/api/products/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());

        verify(productService, times(1)).getProductById(1L);
    }

    @Test
    @WithMockUser(roles = {"ADMIN"}) // Admin user for creating
    void createProduct_success() throws Exception {
        when(productService.createProduct(any(ProductDTO.class))).thenReturn(productDTO);

        mockMvc.perform(post("/api/products")
                        .with(csrf()) // Include CSRF token for POST requests
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value(productDTO.getName()));

        verify(productService, times(1)).createProduct(any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = {"USER"}) // Non-admin user for creating
    void createProduct_forbidden() throws Exception {
        mockMvc.perform(post("/api/products")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isForbidden());

        verify(productService, never()).createProduct(any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"}) // Admin user for updating
    void updateProduct_success() throws Exception {
        when(productService.updateProduct(eq(1L), any(ProductDTO.class))).thenReturn(productDTO);

        mockMvc.perform(put("/api/products/{id}", 1L)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value(productDTO.getName()));

        verify(productService, times(1)).updateProduct(eq(1L), any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = {"USER"}) // Non-admin user for updating
    void updateProduct_forbidden() throws Exception {
        mockMvc.perform(put("/api/products/{id}", 1L)
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productDTO)))
                .andExpect(status().isForbidden());

        verify(productService, never()).updateProduct(anyLong(), any(ProductDTO.class));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"}) // Admin user for deleting
    void deleteProduct_success() throws Exception {
        doNothing().when(productService).deleteProduct(1L);

        mockMvc.perform(delete("/api/products/{id}", 1L)
                        .with(csrf()))
                .andExpect(status().isNoContent());

        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @WithMockUser(roles = {"USER"}) // Non-admin user for deleting
    void deleteProduct_forbidden() throws Exception {
        mockMvc.perform(delete("/api/products/{id}", 1L)
                        .with(csrf()))
                .andExpect(status().isForbidden());

        verify(productService, never()).deleteProduct(anyLong());
    }
}
```