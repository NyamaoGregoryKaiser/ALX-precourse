```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.CategoryDTO;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.model.Category;
import com.alx.devops.productmanagement.repository.CategoryRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock // Mock CacheManager to observe cache interactions if needed, though @Cacheable handles it
    private CacheManager cacheManager = new CaffeineCacheManager();

    @InjectMocks
    private CategoryService categoryService;

    private Category category1;
    private Category category2;
    private CategoryDTO categoryDTO1;
    private CategoryDTO categoryDTO2;

    @BeforeEach
    void setUp() {
        category1 = new Category();
        category1.setId(1L);
        category1.setName("Electronics");

        category2 = new Category();
        category2.setId(2L);
        category2.setName("Books");

        categoryDTO1 = new CategoryDTO();
        categoryDTO1.setId(1L);
        categoryDTO1.setName("Electronics");

        categoryDTO2 = new CategoryDTO();
        categoryDTO2.setId(2L);
        categoryDTO2.setName("Books");
    }

    @Test
    void findAllCategories_Success() {
        when(categoryRepository.findAll()).thenReturn(Arrays.asList(category1, category2));

        List<CategoryDTO> result = categoryService.findAllCategories();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getName()).isEqualTo("Electronics");
        assertThat(result.get(1).getName()).isEqualTo("Books");
        verify(categoryRepository, times(1)).findAll();
    }

    @Test
    void findCategoryById_Success() {
        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));

        CategoryDTO result = categoryService.findCategoryById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Electronics");
        verify(categoryRepository, times(1)).findById(1L);
    }

    @Test
    void findCategoryById_NotFound_ThrowsResourceNotFoundException() {
        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> categoryService.findCategoryById(99L));

        assertThat(exception.getMessage()).isEqualTo("Category not found with ID: 99");
        verify(categoryRepository, times(1)).findById(99L);
    }

    @Test
    void createCategory_Success() {
        CategoryDTO newCategoryDTO = new CategoryDTO();
        newCategoryDTO.setName("New Category");

        Category savedCategory = new Category();
        savedCategory.setId(3L);
        savedCategory.setName("New Category");

        when(categoryRepository.findByName(newCategoryDTO.getName())).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(savedCategory);

        CategoryDTO result = categoryService.createCategory(newCategoryDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(3L);
        assertThat(result.getName()).isEqualTo("New Category");
        verify(categoryRepository, times(1)).save(any(Category.class));
        verify(categoryRepository, times(1)).findByName("New Category");
    }

    @Test
    void createCategory_DuplicateName_ThrowsValidationException() {
        CategoryDTO newCategoryDTO = new CategoryDTO();
        newCategoryDTO.setName("Electronics");

        when(categoryRepository.findByName(newCategoryDTO.getName())).thenReturn(Optional.of(category1));

        ValidationException exception = assertThrows(ValidationException.class, () -> categoryService.createCategory(newCategoryDTO));

        assertThat(exception.getMessage()).isEqualTo("Category with name 'Electronics' already exists.");
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void updateCategory_Success() {
        CategoryDTO updatedCategoryDTO = new CategoryDTO();
        updatedCategoryDTO.setName("Updated Electronics");

        Category updatedCategoryEntity = new Category();
        updatedCategoryEntity.setId(1L);
        updatedCategoryEntity.setName("Updated Electronics");

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));
        when(categoryRepository.findByName(updatedCategoryDTO.getName())).thenReturn(Optional.empty());
        when(categoryRepository.save(any(Category.class))).thenReturn(updatedCategoryEntity);

        CategoryDTO result = categoryService.updateCategory(1L, updatedCategoryDTO);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getName()).isEqualTo("Updated Electronics");
        verify(categoryRepository, times(1)).findById(1L);
        verify(categoryRepository, times(1)).findByName("Updated Electronics");
        verify(categoryRepository, times(1)).save(any(Category.class));
    }

    @Test
    void updateCategory_NotFound_ThrowsResourceNotFoundException() {
        CategoryDTO updatedCategoryDTO = new CategoryDTO();
        updatedCategoryDTO.setName("Updated Category");

        when(categoryRepository.findById(anyLong())).thenReturn(Optional.empty());

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> categoryService.updateCategory(99L, updatedCategoryDTO));

        assertThat(exception.getMessage()).isEqualTo("Category not found with ID: 99");
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void updateCategory_DuplicateName_ThrowsValidationException() {
        CategoryDTO updatedCategoryDTO = new CategoryDTO();
        updatedCategoryDTO.setName("Books"); // Try to change Electronics to Books

        when(categoryRepository.findById(1L)).thenReturn(Optional.of(category1));
        when(categoryRepository.findByName(updatedCategoryDTO.getName())).thenReturn(Optional.of(category2));

        ValidationException exception = assertThrows(ValidationException.class, () -> categoryService.updateCategory(1L, updatedCategoryDTO));

        assertThat(exception.getMessage()).isEqualTo("Category with name 'Books' already exists.");
        verify(categoryRepository, never()).save(any(Category.class));
    }

    @Test
    void deleteCategory_Success() {
        when(categoryRepository.existsById(1L)).thenReturn(true);
        doNothing().when(categoryRepository).deleteById(1L);

        categoryService.deleteCategory(1L);

        verify(categoryRepository, times(1)).existsById(1L);
        verify(categoryRepository, times(1)).deleteById(1L);
    }

    @Test
    void deleteCategory_NotFound_ThrowsResourceNotFoundException() {
        when(categoryRepository.existsById(anyLong())).thenReturn(false);

        ResourceNotFoundException exception = assertThrows(ResourceNotFoundException.class, () -> categoryService.deleteCategory(99L));

        assertThat(exception.getMessage()).isEqualTo("Category not found with ID: 99");
        verify(categoryRepository, times(1)).existsById(99L);
        verify(categoryRepository, never()).deleteById(anyLong());
    }
}
```