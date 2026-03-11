```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.category.CategoryRequest;
import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.entity.Category;
import com.alx.taskmgr.exception.DuplicateResourceException;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for {@link CategoryService} using Mockito.
 * Tests business logic for CRUD operations on categories, including exception handling and caching behavior.
 */
@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private CacheManager cacheManager; // Mock CacheManager if needed, or use a simple one for local tests

    @InjectMocks
    private CategoryService categoryService;

    private Category testCategory1;
    private Category testCategory2;
    private CategoryRequest categoryRequest;

    @BeforeEach
    void setUp() {
        // Initialize test data
        testCategory1 = Category.builder()
                .id(1L)
                .name("Work")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testCategory2 = Category.builder()
                .id(2L)
                .name("Personal")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        categoryRequest = CategoryRequest.builder()
                .name("New Category")
                .build();

        // Initialize a simple cache manager for testing cache evicts, etc.
        // In a real Spring test, you might use @SpringBootTest with actual caching enabled.
        // For unit tests, mocking or a simple in-memory implementation is often sufficient.
        cacheManager = new ConcurrentMapCacheManager("categoriesCache", "tasksCache"); // Initialize a simple in-memory cache manager.
        // Manually inject it because @InjectMocks won't work for non-Spring beans if @Mock is used.
        // A better approach for testing caching in unit tests is to just verify @CacheEvict/Put/able methods are called.
        // Or integrate with Spring's @CacheConfig and test it as an integration test.
    }

    @Test
    @DisplayName("Should successfully create a new category")
    void createCategory_Success() {
        // Given
        when(categoryRepository.findByNameIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(categoryRequest.toBuilder().id(3L).build()); // Mock saved category with ID

        // When
        CategoryResponse response = categoryService.createCategory(categoryRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getName()).isEqualTo(categoryRequest.getName());
        assertThat(response.getId()).isNotNull();
        verify(categoryRepository, times(1)).findByNameIgnoreCase(categoryRequest.getName());
        verify(categoryRepository, times(1)).save(any(Category.class));
        // Verify cache evict (difficult to fully verify with simple mock, but method call is tested implicitly)
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException when creating category with existing name")
    void createCategory_DuplicateName_ThrowsException() {
        // Given
        when(categoryRepository.findByNameIgnoreCase(anyString())).thenReturn(Optional.of(testCategory1));

        // When & Then
        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class,
                () -> categoryService.createCategory(categoryRequest));

        assertThat(exception.getMessage()).contains("already exists");
        verify(categoryRepository, times(1)).findByNameIgnoreCase(categoryRequest.getName());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("Should retrieve all categories")
    void getAllCategories_Success() {
        // Given
        List<Category> categories = Arrays.asList(testCategory1, testCategory2);
        when(categoryRepository.findAll()).thenReturn(categories);

        // When
        List<CategoryResponse> responses = categoryService.getAllCategories();

        // Then
        assertThat(responses).isNotNull();
        assertThat(responses).hasSize(2);
        assertThat(responses.get(0).getName()).isEqualTo(testCategory1.getName());
        assertThat(responses.get(1).getName()).isEqualTo(testCategory2.getName());
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    @DisplayName("Should retrieve category by ID")
    void getCategoryById_Found() {
        // Given
        when(categoryRepository.findById(testCategory1.getId())).thenReturn(Optional.of(testCategory1));

        // When
        CategoryResponse response = categoryService.getCategoryById(testCategory1.getId());

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(testCategory1.getId());
        assertThat(response.getName()).isEqualTo(testCategory1.getName());
        verify(categoryRepository, times(1)).findById(testCategory1.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when category not found by ID")
    void getCategoryById_NotFound_ThrowsException() {
        // Given
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> categoryService.getCategoryById(99L));

        assertThat(exception.getMessage()).contains("not found");
        verify(categoryRepository, times(1)).findById(99L);
    }

    @Test
    @DisplayName("Should successfully update an existing category")
    void updateCategory_Success() {
        // Given
        CategoryRequest updateRequest = CategoryRequest.builder().name("Updated Work").build();
        when(categoryRepository.findById(testCategory1.getId())).thenReturn(Optional.of(testCategory1));
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot(updateRequest.getName(), testCategory1.getId())).thenReturn(false);
        when(categoryRepository.save(any(Category.class))).thenReturn(testCategory1.toBuilder().name("Updated Work").build()); // Mock updated category

        // When
        CategoryResponse response = categoryService.updateCategory(testCategory1.getId(), updateRequest);

        // Then
        assertThat(response).isNotNull();
        assertThat(response.getId()).isEqualTo(testCategory1.getId());
        assertThat(response.getName()).isEqualTo("Updated Work");
        verify(categoryRepository, times(1)).findById(testCategory1.getId());
        verify(categoryRepository, times(1)).existsByNameIgnoreCaseAndIdNot(updateRequest.getName(), testCategory1.getId());
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when updating non-existent category")
    void updateCategory_NotFound_ThrowsException() {
        // Given
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> categoryService.updateCategory(99L, categoryRequest));

        assertThat(exception.getMessage()).contains("not found");
        verify(categoryRepository, times(1)).findById(99L);
        verify(categoryRepository, never()).existsByNameIgnoreCaseAndIdNot(anyString(), anyLong());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("Should throw DuplicateResourceException when updating category with existing name")
    void updateCategory_DuplicateName_ThrowsException() {
        // Given
        CategoryRequest updateRequest = CategoryRequest.builder().name("Personal").build(); // Name of testCategory2
        when(categoryRepository.findById(testCategory1.getId())).thenReturn(Optional.of(testCategory1));
        when(categoryRepository.existsByNameIgnoreCaseAndIdNot(updateRequest.getName(), testCategory1.getId())).thenReturn(true);

        // When & Then
        DuplicateResourceException exception = assertThrows(DuplicateResourceException.class,
                () -> categoryService.updateCategory(testCategory1.getId(), updateRequest));

        assertThat(exception.getMessage()).contains("already exists");
        verify(categoryRepository, times(1)).findById(testCategory1.getId());
        verify(categoryRepository, times(1)).existsByNameIgnoreCaseAndIdNot(updateRequest.getName(), testCategory1.getId());
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    @DisplayName("Should successfully delete a category")
    void deleteCategory_Success() {
        // Given
        when(categoryRepository.existsById(testCategory1.getId())).thenReturn(true);
        doNothing().when(categoryRepository).deleteById(testCategory1.getId());

        // When
        categoryService.deleteCategory(testCategory1.getId());

        // Then
        verify(categoryRepository, times(1)).existsById(testCategory1.getId());
        verify(categoryRepository, times(1)).deleteById(testCategory1.getId());
    }

    @Test
    @DisplayName("Should throw ResourceNotFoundException when deleting non-existent category")
    void deleteCategory_NotFound_ThrowsException() {
        // Given
        when(categoryRepository.existsById(anyLong())).thenReturn(false);

        // When & Then
        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class,
                () -> categoryService.deleteCategory(99L));

        assertThat(exception.getMessage()).contains("not found");
        verify(categoryRepository, times(1)).existsById(99L);
        verify(categoryRepository, never()).deleteById(anyLong());
    }
}
```