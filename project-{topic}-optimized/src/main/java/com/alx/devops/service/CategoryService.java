package com.alx.devops.service;

import com.alx.devops.dto.CategoryDTO;
import com.alx.devops.exception.ResourceNotFoundException;
import com.alx.devops.model.Category;
import com.alx.devops.repository.CategoryRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Service layer for managing product categories.
 * Handles business logic, data persistence, and caching for categories.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Retrieves all categories.
     * Results are cached to improve performance for frequent read access.
     *
     * @return A list of all CategoryDTOs.
     */
    @Cacheable(value = "categories")
    public List<CategoryDTO> getAllCategories() {
        log.info("Fetching all categories from database.");
        return categoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * Retrieves a category by its ID.
     * Results are cached individually by category ID.
     *
     * @param id The ID of the category.
     * @return The CategoryDTO if found.
     * @throws ResourceNotFoundException if the category is not found.
     */
    @Cacheable(value = "category", key = "#id")
    public CategoryDTO getCategoryById(Long id) {
        log.info("Fetching category with ID: {}", id);
        Optional<Category> categoryOptional = categoryRepository.findById(id);
        return categoryOptional.map(this::convertToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
    }

    /**
     * Creates a new category.
     * Evicts the 'categories' cache to ensure subsequent 'getAllCategories' calls fetch fresh data.
     *
     * @param categoryDTO The DTO containing category data.
     * @return The created CategoryDTO.
     * @throws IllegalArgumentException if a category with the same name already exists.
     */
    @Transactional
    @CacheEvict(value = "categories", allEntries = true)
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        log.info("Creating new category: {}", categoryDTO.getName());
        if (categoryRepository.findByName(categoryDTO.getName()).isPresent()) {
            throw new IllegalArgumentException("Category with name '" + categoryDTO.getName() + "' already exists.");
        }
        Category category = convertToEntity(categoryDTO);
        Category savedCategory = categoryRepository.save(category);
        log.info("Category created with ID: {}", savedCategory.getId());
        return convertToDTO(savedCategory);
    }

    /**
     * Updates an existing category.
     * Evicts the 'categories' cache and the specific category cache by ID.
     *
     * @param id          The ID of the category to update.
     * @param categoryDTO The DTO with updated category data.
     * @return The updated CategoryDTO.
     * @throws ResourceNotFoundException if the category is not found.
     * @throws IllegalArgumentException if the updated name conflicts with an existing category.
     */
    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true) // Invalidate all related caches
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        log.info("Updating category with ID: {}", id);
        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        // Check for name uniqueness if name is changed
        if (!existingCategory.getName().equals(categoryDTO.getName())) {
            if (categoryRepository.findByName(categoryDTO.getName()).isPresent()) {
                throw new IllegalArgumentException("Category with name '" + categoryDTO.getName() + "' already exists.");
            }
        }

        existingCategory.setName(categoryDTO.getName());
        existingCategory.setDescription(categoryDTO.getDescription());
        Category updatedCategory = categoryRepository.save(existingCategory);
        log.info("Category with ID {} updated.", updatedCategory.getId());
        return convertToDTO(updatedCategory);
    }

    /**
     * Deletes a category by its ID.
     * Evicts the 'categories' cache and the specific category cache by ID.
     *
     * @param id The ID of the category to delete.
     * @throws ResourceNotFoundException if the category is not found.
     */
    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true) // Invalidate all related caches
    public void deleteCategory(Long id) {
        log.info("Deleting category with ID: {}", id);
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with id: " + id);
        }
        categoryRepository.deleteById(id);
        log.info("Category with ID {} deleted.", id);
    }

    /**
     * Converts a Category entity to a CategoryDTO.
     *
     * @param category The Category entity.
     * @return The corresponding CategoryDTO.
     */
    private CategoryDTO convertToDTO(Category category) {
        return new CategoryDTO(category.getId(), category.getName(), category.getDescription());
    }

    /**
     * Converts a CategoryDTO to a Category entity.
     *
     * @param categoryDTO The CategoryDTO.
     * @return The corresponding Category entity.
     */
    private Category convertToEntity(CategoryDTO categoryDTO) {
        Category category = new Category();
        category.setId(categoryDTO.getId()); // ID might be null for creation
        category.setName(categoryDTO.getName());
        category.setDescription(categoryDTO.getDescription());
        return category;
    }
}