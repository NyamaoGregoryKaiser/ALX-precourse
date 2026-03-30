```java
package com.alx.devops.productmanagement.controller;

import com.alx.devops.productmanagement.config.JwtAuthFilter;
import com.alx.devops.productmanagement.config.RateLimitingFilter;
import com.alx.devops.productmanagement.config.SecurityConfig;
import com.alx.devops.productmanagement.dto.CategoryDTO;
import com.alx.devops.productmanagement.exception.GlobalExceptionHandler;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.service.CategoryService;
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

import java.util.Arrays;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(CategoryController.class)
@Import({SecurityConfig.class, GlobalExceptionHandler.class})
public class CategoryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private CategoryService categoryService;

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
    void testGetAllCategories_Success() throws Exception {
        CategoryDTO cat1 = new CategoryDTO(); cat1.setId(1L); cat1.setName("Electronics");
        CategoryDTO cat2 = new CategoryDTO(); cat2.setId(2L); cat2.setName("Books");
        List<CategoryDTO> categories = Arrays.asList(cat1, cat2);

        when(categoryService.findAllCategories()).thenReturn(categories);

        mockMvc.perform(get("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.size()").value(2))
                .andExpect(jsonPath("$[0].name").value("Electronics"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetCategoryById_Success() throws Exception {
        CategoryDTO category = new CategoryDTO();
        category.setId(1L);
        category.setName("Electronics");

        when(categoryService.findCategoryById(1L)).thenReturn(category);

        mockMvc.perform(get("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Electronics"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testGetCategoryById_NotFound() throws Exception {
        when(categoryService.findCategoryById(anyLong())).thenThrow(new ResourceNotFoundException("Category not found"));

        mockMvc.perform(get("/api/categories/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found"));
    }

    @Test
    @WithMockUser(roles = "ADMIN") // Admin user can create
    void testCreateCategory_Success() throws Exception {
        CategoryDTO newCategory = new CategoryDTO();
        newCategory.setName("New Category");

        CategoryDTO createdCategory = new CategoryDTO();
        createdCategory.setId(3L);
        createdCategory.setName("New Category");

        when(categoryService.createCategory(any(CategoryDTO.class))).thenReturn(createdCategory);

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(3L))
                .andExpect(jsonPath("$.name").value("New Category"));
    }

    @Test
    @WithMockUser(roles = "USER") // Regular user cannot create
    void testCreateCategory_AccessDenied() throws Exception {
        CategoryDTO newCategory = new CategoryDTO();
        newCategory.setName("New Category");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isForbidden());
        verify(categoryService, never()).createCategory(any(CategoryDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateCategory_InvalidInput() throws Exception {
        CategoryDTO invalidCategory = new CategoryDTO(); // Missing name
        invalidCategory.setName("");

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidCategory)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.name").exists());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testCreateCategory_DuplicateName() throws Exception {
        CategoryDTO newCategory = new CategoryDTO();
        newCategory.setName("Electronics");

        when(categoryService.createCategory(any(CategoryDTO.class))).thenThrow(new ValidationException("Category with name 'Electronics' already exists."));

        mockMvc.perform(post("/api/categories")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(newCategory)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Category with name 'Electronics' already exists."));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateCategory_Success() throws Exception {
        CategoryDTO updatedCategory = new CategoryDTO();
        updatedCategory.setName("Updated Category");

        CategoryDTO returnedCategory = new CategoryDTO();
        returnedCategory.setId(1L);
        returnedCategory.setName("Updated Category");

        when(categoryService.updateCategory(eq(1L), any(CategoryDTO.class))).thenReturn(returnedCategory);

        mockMvc.perform(put("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedCategory)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(1L))
                .andExpect(jsonPath("$.name").value("Updated Category"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void testUpdateCategory_AccessDenied() throws Exception {
        CategoryDTO updatedCategory = new CategoryDTO();
        updatedCategory.setName("Updated Category");

        mockMvc.perform(put("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedCategory)))
                .andExpect(status().isForbidden());
        verify(categoryService, never()).updateCategory(anyLong(), any(CategoryDTO.class));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testUpdateCategory_NotFound() throws Exception {
        CategoryDTO updatedCategory = new CategoryDTO();
        updatedCategory.setName("Updated Category");

        when(categoryService.updateCategory(eq(99L), any(CategoryDTO.class)))
                .thenThrow(new ResourceNotFoundException("Category not found with ID: 99"));

        mockMvc.perform(put("/api/categories/99")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updatedCategory)))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found with ID: 99"));
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteCategory_Success() throws Exception {
        doNothing().when(categoryService).deleteCategory(1L);

        mockMvc.perform(delete("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
        verify(categoryService, times(1)).deleteCategory(1L);
    }

    @Test
    @WithMockUser(roles = "USER")
    void testDeleteCategory_AccessDenied() throws Exception {
        mockMvc.perform(delete("/api/categories/1")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        verify(categoryService, never()).deleteCategory(anyLong());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void testDeleteCategory_NotFound() throws Exception {
        doThrow(new ResourceNotFoundException("Category not found with ID: 99")).when(categoryService).deleteCategory(99L);

        mockMvc.perform(delete("/api/categories/99")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Category not found with ID: 99"));
        verify(categoryService, times(1)).deleteCategory(99L);
    }
}
```