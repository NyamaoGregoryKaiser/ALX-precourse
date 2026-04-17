package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.product.ProductRequest;
import com.alx.ecommerce.dto.product.ProductResponse;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.model.Product;
import com.alx.ecommerce.service.ProductService;
import com.alx.ecommerce.util.AppConstants;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration tests for ProductController.
 * Uses @SpringBootTest and @AutoConfigureMockMvc to test controller layer in isolation but with full Spring context.
 * @MockBean is used to mock the service layer.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    private ProductRequest productRequest;
    private ProductResponse productResponse;
    private Category category;

    @BeforeEach
    void setUp() {
        category = Category.builder().id(1L).name("Electronics").description("Electronic devices").build();

        productRequest = new ProductRequest();
        productRequest.setName("Test Laptop");
        productRequest.setDescription("A powerful testing laptop.");
        productRequest.setPrice(BigDecimal.valueOf(1200.00));
        productRequest.setStockQuantity(10);
        productRequest.setCategoryId(1L);

        productResponse = new ProductResponse();
        productResponse.setId(1L);
        productResponse.setName("Test Laptop");
        productResponse.setDescription("A powerful testing laptop.");
        productResponse.setPrice(BigDecimal.valueOf(1200.00));
        productResponse.setStockQuantity(10);
        productResponse.setCategoryId(1L);
        productResponse.setCategoryName("Electronics");
        productResponse.setCreatedAt(LocalDateTime.now());
        productResponse.setUpdatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("ADMIN: Should create a new product")
    @WithMockUser(roles = {"ADMIN"})
    void createProduct_AsAdmin_ShouldReturnCreated() throws Exception {
        when(productService.createProduct(any(ProductRequest.class))).thenReturn(productResponse);

        mockMvc.perform(post(AppConstants.API_V1_BASE_URL + "/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.name", is("Test Laptop")));

        verify(productService, times(1)).createProduct(any(ProductRequest.class));
    }

    @Test
    @DisplayName("USER: Should not create a new product (Forbidden)")
    @WithMockUser(roles = {"USER"})
    void createProduct_AsUser_ShouldReturnForbidden() throws Exception {
        mockMvc.perform(post(AppConstants.API_V1_BASE_URL + "/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isForbidden());

        verify(productService, never()).createProduct(any(ProductRequest.class));
    }

    @Test
    @DisplayName("UNAUTHORIZED: Should not create a new product (Unauthorized)")
    void createProduct_NoAuth_ShouldReturnUnauthorized() throws Exception {
        mockMvc.perform(post(AppConstants.API_V1_BASE_URL + "/products")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(productRequest)))
                .andExpect(status().isUnauthorized());

        verify(productService, never()).createProduct(any(ProductRequest.class));
    }

    @Test
    @DisplayName("ANY AUTHENTICATED: Should get all products")
    @WithMockUser(roles = {"USER"})
    void getAllProducts_AnyAuthenticated_ShouldReturnOk() throws Exception {
        PageImpl<ProductResponse> productPage = new PageImpl<>(List.of(productResponse), PageRequest.of(0, 10), 1);
        when(productService.getAllProducts(anyInt(), anyInt(), anyString(), anyString())).thenReturn(productPage);

        mockMvc.perform(get(AppConstants.API_V1_BASE_URL + "/products")
                        .param("pageNo", "0")
                        .param("pageSize", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].name", is("Test Laptop")));

        verify(productService, times(1)).getAllProducts(0, 10, "id", "asc");
    }

    @Test
    @DisplayName("ANY AUTHENTICATED: Should get product by ID")
    @WithMockUser(roles = {"USER"})
    void getProductById_AnyAuthenticated_ShouldReturnOk() throws Exception {
        when(productService.getProductById(anyLong())).thenReturn(productResponse);

        mockMvc.perform(get(AppConstants.API_V1_BASE_URL + "/products/{id}", 1L))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.name", is("Test Laptop")));

        verify(productService, times(1)).getProductById(1L);
    }

    @Test
    @DisplayName("ADMIN: Should update a product")
    @WithMockUser(roles = {"ADMIN"})
    void updateProduct_AsAdmin_ShouldReturnOk() throws Exception {
        ProductRequest updateRequest = new ProductRequest();
        updateRequest.setName("Updated Laptop");
        updateRequest.setDescription("Updated description.");
        updateRequest.setPrice(BigDecimal.valueOf(1300.00));
        updateRequest.setStockQuantity(12);
        updateRequest.setCategoryId(1L);

        ProductResponse updatedResponse = new ProductResponse();
        updatedResponse.setId(1L);
        updatedResponse.setName("Updated Laptop");
        updatedResponse.setDescription("Updated description.");
        updatedResponse.setPrice(BigDecimal.valueOf(1300.00));
        updatedResponse.setStockQuantity(12);
        updatedResponse.setCategoryId(1L);
        updatedResponse.setCategoryName("Electronics");
        updatedResponse.setCreatedAt(LocalDateTime.now().minusDays(1));
        updatedResponse.setUpdatedAt(LocalDateTime.now());

        when(productService.updateProduct(anyLong(), any(ProductRequest.class))).thenReturn(updatedResponse);

        mockMvc.perform(put(AppConstants.API_V1_BASE_URL + "/products/{id}", 1L)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(1)))
                .andExpect(jsonPath("$.name", is("Updated Laptop")));

        verify(productService, times(1)).updateProduct(anyLong(), any(ProductRequest.class));
    }

    @Test
    @DisplayName("ADMIN: Should delete a product")
    @WithMockUser(roles = {"ADMIN"})
    void deleteProduct_AsAdmin_ShouldReturnNoContent() throws Exception {
        doNothing().when(productService).deleteProduct(anyLong());

        mockMvc.perform(delete(AppConstants.API_V1_BASE_URL + "/products/{id}", 1L))
                .andExpect(status().isNoContent());

        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @DisplayName("ANY AUTHENTICATED: Should search products")
    @WithMockUser(roles = {"USER"})
    void searchProducts_AnyAuthenticated_ShouldReturnOk() throws Exception {
        ProductResponse searchResult = new ProductResponse();
        searchResult.setId(2L);
        searchResult.setName("Search Result Product");
        searchResult.setDescription("Description with keyword");
        searchResult.setPrice(BigDecimal.valueOf(50.00));
        searchResult.setStockQuantity(5);
        searchResult.setCategoryId(1L);
        searchResult.setCategoryName("Electronics");

        when(productService.searchProducts(anyString())).thenReturn(List.of(searchResult));

        mockMvc.perform(get(AppConstants.API_V1_BASE_URL + "/products/search")
                        .param("q", "keyword"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Search Result Product")));

        verify(productService, times(1)).searchProducts("keyword");
    }
}