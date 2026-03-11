```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.category.CategoryRequest;
import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.entity.Category;
import com.alx.taskmgr.exception.DuplicateResourceException;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Service class for managing task categories.
 * Provides business logic for CRUD operations on categories, including caching.
 */
@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Creates a new category.
     * Checks if a category with the same name already exists (case-insensitive).
     *
     * @param request The CategoryRequest containing the new category's name.
     * @return The created CategoryResponse.
     * @throws DuplicateResourceException If a category with the given name already exists.
     */
    @Transactional
    @CacheEvict(value = "categoriesCache", allEntries = true) // Clear cache on new category creation
    public CategoryResponse createCategory(CategoryRequest request) {
        // Check for duplicate category name
        categoryRepository.findByNameIgnoreCase(request.getName()).ifPresent(category -> {
            throw new DuplicateResourceException("Category with name '" + request.getName() + "' already exists.");
        });

        Category category = Category.builder()
                .name(request.getName())
                .build();
        Category savedCategory = categoryRepository.save(category);
        return mapToResponse(savedCategory);
    }

    /**
     * Retrieves all categories.
     * This method's result is cached to improve performance for frequent reads.
     *
     * @return A list of all CategoryResponse.
     */
    @Cacheable(value = "categoriesCache") // Cache the result of this method
    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllCategories() {
        return categoryRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a category by its ID.
     *
     * @param id The ID of the category to retrieve.
     * @return The CategoryResponse for the found category.
     * @throws ResourceNotFoundException If no category with the given ID is found.
     */
    @Transactional(readOnly = true)
    public CategoryResponse getCategoryById(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        return mapToResponse(category);
    }

    /**
     * Updates an existing category.
     * Checks for duplicate names (excluding the current category itself).
     *
     * @param id      The ID of the category to update.
     * @param request The CategoryRequest with updated category data.
     * @return The updated CategoryResponse.
     * @throws ResourceNotFoundException If no category with the given ID is found.
     * @throws DuplicateResourceException If the updated name conflicts with an existing category.
     */
    @Transactional
    @CacheEvict(value = "categoriesCache", allEntries = true) // Clear cache on category update
    public CategoryResponse updateCategory(Long id, CategoryRequest request) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        // Check for duplicate name, excluding the current category
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(request.getName(), id)) {
            throw new DuplicateResourceException("Category with name '" + request.getName() + "' already exists.");
        }

        category.setName(request.getName());
        Category updatedCategory = categoryRepository.save(category);
        return mapToResponse(updatedCategory);
    }

    /**
     * Deletes a category by its ID.
     * Note: This will also cascade delete all associated tasks due to CascadeType.ALL and orphanRemoval=true in Category entity.
     *
     * @param id The ID of the category to delete.
     * @throws ResourceNotFoundException If no category with the given ID is found.
     */
    @Transactional
    @CacheEvict(value = "categoriesCache", allEntries = true) // Clear cache on category deletion
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with ID: " + id);
        }
        categoryRepository.deleteById(id);
    }

    /**
     * Helper method to map a Category entity to a CategoryResponse DTO.
     *
     * @param category The Category entity.
     * @return The corresponding CategoryResponse DTO.
     */
    private CategoryResponse mapToResponse(Category category) {
        return CategoryResponse.builder()
                .id(category.getId())
                .name(category.getName())
                .build();
    }
}
```