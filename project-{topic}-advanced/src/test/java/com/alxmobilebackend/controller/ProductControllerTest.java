```java
package com.alxmobilebackend.controller;

import com.alxmobilebackend.dto.ProductDto;
import com.alxmobilebackend.exception.ResourceNotFoundException;
import com.alxmobilebackend.exception.ValidationException;
import com.alxmobilebackend.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static com.alxmobilebackend.util.Constants.PRODUCTS_PATH;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ProductController.class)
@ActiveProfiles("test")
class ProductControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ProductService productService;

    // Mock the SecurityService because it's referenced in @PreAuthorize, even if not directly used in ProductController
    @MockBean(name = "securityService")
    private SecurityService securityService;

    @Test
    @DisplayName("Should create product - ADMIN role")
    @WithMockUser(roles = {"ADMIN"})
    void createProduct_admin_success() throws Exception {
        ProductDto.ProductCreateRequest createRequest = ProductDto.ProductCreateRequest.builder()
                .name("New Product")
                .price(BigDecimal.valueOf(100.00))
                .stockQuantity(10)
                .build();

        ProductDto.ProductResponse response = ProductDto.ProductResponse.builder()
                .id(1L)
                .name("New Product")
                .price(BigDecimal.valueOf(100.00))
                .stockQuantity(10)
                .build();

        when(productService.createProduct(any(ProductDto.ProductCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post(PRODUCTS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("New Product"));
    }

    @Test
    @DisplayName("Should forbid creating product - USER role")
    @WithMockUser(roles = {"USER"})
    void createProduct_user_forbidden() throws Exception {
        ProductDto.ProductCreateRequest createRequest = ProductDto.ProductCreateRequest.builder()
                .name("New Product")
                .price(BigDecimal.valueOf(100.00))
                .stockQuantity(10)
                .build();

        mockMvc.perform(post(PRODUCTS_PATH)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should get product by ID - USER role")
    @WithMockUser(roles = {"USER"})
    void getProductById_user_success() throws Exception {
        ProductDto.ProductResponse response = ProductDto.ProductResponse.builder()
                .id(1L)
                .name("Test Product")
                .price(BigDecimal.valueOf(50.00))
                .stockQuantity(5)
                .build();

        when(productService.getProductById(1L)).thenReturn(response);

        mockMvc.perform(get(PRODUCTS_PATH + "/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Test Product"));
    }

    @Test
    @DisplayName("Should return 404 when product not found")
    @WithMockUser(roles = {"USER"})
    void getProductById_notFound() throws Exception {
        when(productService.getProductById(anyLong())).thenThrow(new ResourceNotFoundException("Product not found"));

        mockMvc.perform(get(PRODUCTS_PATH + "/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Product not found"));
    }

    @Test
    @DisplayName("Should get all products - ADMIN role")
    @WithMockUser(roles = {"ADMIN"})
    void getAllProducts_admin_success() throws Exception {
        ProductDto.ProductResponse response1 = ProductDto.ProductResponse.builder().id(1L).name("P1").build();
        ProductDto.ProductResponse response2 = ProductDto.ProductResponse.builder().id(2L).name("P2").build();
        Page<ProductDto.ProductResponse> page = new PageImpl<>(List.of(response1, response2), PageRequest.of(0, 10), 2);

        when(productService.getAllProducts(any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get(PRODUCTS_PATH)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2))
                .andExpect(jsonPath("$.content[0].name").value("P1"));
    }

    @Test
    @DisplayName("Should update product - ADMIN role")
    @WithMockUser(roles = {"ADMIN"})
    void updateProduct_admin_success() throws Exception {
        ProductDto.ProductUpdateRequest updateRequest = ProductDto.ProductUpdateRequest.builder()
                .name("Updated Product Name")
                .price(BigDecimal.valueOf(110.00))
                .build();

        ProductDto.ProductResponse response = ProductDto.ProductResponse.builder()
                .id(1L)
                .name("Updated Product Name")
                .price(BigDecimal.valueOf(110.00))
                .stockQuantity(10)
                .build();

        when(productService.updateProduct(anyLong(), any(ProductDto.ProductUpdateRequest.class))).thenReturn(response);

        mockMvc.perform(put(PRODUCTS_PATH + "/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Updated Product Name"));
    }

    @Test
    @DisplayName("Should forbid updating product - USER role")
    @WithMockUser(roles = {"USER"})
    void updateProduct_user_forbidden() throws Exception {
        ProductDto.ProductUpdateRequest updateRequest = ProductDto.ProductUpdateRequest.builder().name("Updated").build();

        mockMvc.perform(put(PRODUCTS_PATH + "/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Should delete product - ADMIN role")
    @WithMockUser(roles = {"ADMIN"})
    void deleteProduct_admin_success() throws Exception {
        doNothing().when(productService).deleteProduct(anyLong());

        mockMvc.perform(delete(PRODUCTS_PATH + "/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());

        verify(productService, times(1)).deleteProduct(1L);
    }

    @Test
    @DisplayName("Should forbid deleting product - USER role")
    @WithMockUser(roles = {"USER"})
    void deleteProduct_user_forbidden() throws Exception {
        mockMvc.perform(delete(PRODUCTS_PATH + "/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        verify(productService, never()).deleteProduct(anyLong());
    }
}
```

#### Performance Tests

**Description:**
Performance tests are usually conducted using specialized tools (e.g., Apache JMeter, Gatling, k6, Locust) outside of the application's codebase. They involve simulating a large number of concurrent users and requests to measure response times, throughput, and resource utilization under load.

**Conceptual Setup (JMeter Example):**

1.  **Install JMeter:** Download and install Apache JMeter.
2.  **Create Test Plan:**
    *   **Thread Group:** Configure number of users (threads), ramp-up period, and loop count.
    *   **HTTP Request Defaults:** Set server name (e.g., `localhost`), port (e.g., `8080`), and protocol.
    *   **HTTP Request Samplers:**
        *   **Login Request:** Send `POST /api/v1/auth/login` with username/password. Use JSON Extractor to get the JWT token.
        *   **Header Manager:** Add `Authorization: Bearer ${JWT_TOKEN}` using a variable extracted from login.
        *   **Get Products:** Send `GET /api/v1/products`.
        *   **Get Product by ID:** Send `GET /api/v1/products/${productId}` (use CSV Data Set Config for `productId` to vary requests).
        *   **Create Order (less frequent):** Send `POST /api/v1/orders`.
    *   **Listeners:** Add "View Results Tree" (for debugging), "Summary Report," "Aggregate Report," and "Graph Results" (for analysis).
3.  **Run Test:** Execute the test plan.
4.  **Analyze Results:**
    *   **Throughput:** Requests per second.
    *   **Latency/Response Time:** Average, median, 90th/95th/99th percentile.
    *   **Error Rate:** Percentage of failed requests.
    *   **Resource Usage:** Monitor CPU, memory, network I/O on the backend server (e.g., using `htop`, `Grafana/Prometheus`).

**Code-Level Considerations for Performance:**
*   **Caching (`@Cacheable`, `@CachePut`, `@CacheEvict`):** Already implemented in `UserService` and `ProductService`. This significantly reduces database load for frequently accessed data.
*   **Database Indexing:** Ensured by `V1__Initial_schema.sql`.
*   **Efficient Queries:** JPA `Repository` methods are generally optimized. For complex queries, `@Query` annotations with custom HQL/SQL can be used.
*   **Asynchronous Processing (`@EnableAsync`, `@Async`):** Not explicitly used for core API calls in this example, but can offload long-running tasks (e.g., email notifications, complex data processing) from the main request thread.
*   **Rate Limiting:** Implemented to protect against abuse and ensure fair resource usage.

---

### 5. Documentation