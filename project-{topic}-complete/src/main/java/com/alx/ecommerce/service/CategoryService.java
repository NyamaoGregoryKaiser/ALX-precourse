package com.alx.ecommerce.service;

import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.repository.CategoryRepository;
import com.alx.ecommerce.util.AppConstants;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service for managing product categories.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    /**
     * Creates a new category.
     *
     * @param category The category to create.
     * @return The created category.
     * @throws IllegalArgumentException if a category with the same name already exists.
     */
    @Transactional
    @CacheEvict(value = AppConstants.CATEGORIES_CACHE, allEntries = true) // Clear all categories cache on creation
    public Category createCategory(Category category) {
        if (categoryRepository.existsByName(category.getName())) {
            log.warn("Category creation failed: Category with name '{}' already exists.", category.getName());
            throw new IllegalArgumentException("Category with name '" + category.getName() + "' already exists.");
        }
        log.info("Creating category: {}", category.getName());
        return categoryRepository.save(category);
    }

    /**
     * Retrieves all categories with pagination and sorting.
     *
     * @param pageNo   Page number.
     * @param pageSize Page size.
     * @param sortBy   Field to sort by.
     * @param sortDir  Sort direction (asc/desc).
     * @return A page of categories.
     */
    @Cacheable(AppConstants.CATEGORIES_CACHE) // Cache all categories
    public Page<Category> getAllCategories(int pageNo, int pageSize, String sortBy, String sortDir) {
        log.debug("Fetching all categories with pageNo: {}, pageSize: {}, sortBy: {}, sortDir: {}", pageNo, pageSize, sortBy, sortDir);
        Sort sort = sortDir.equalsIgnoreCase(Sort.Direction.ASC.name()) ? Sort.by(sortBy).ascending() : Sort.by(sortBy).descending();
        Pageable pageable = PageRequest.of(pageNo, pageSize, sort);
        return categoryRepository.findAll(pageable);
    }

    /**
     * Retrieves a category by its ID.
     *
     * @param id The ID of the category.
     * @return The found category.
     * @throws ResourceNotFoundException if the category is not found.
     */
    @Cacheable(value = AppConstants.CATEGORY_BY_ID_CACHE, key = "#id") // Cache individual category by ID
    public Category getCategoryById(Long id) {
        log.debug("Fetching category by ID: {}", id);
        return categoryRepository.findById(id)
                .orElseThrow(() -> {
                    log.warn("Category not found with ID: {}", id);
                    return new ResourceNotFoundException("Category", "id", id);
                });
    }

    /**
     * Updates an existing category.
     *
     * @param id          The ID of the category to update.
     * @param categoryDetails The updated category details.
     * @return The updated category.
     * @throws ResourceNotFoundException if the category is not found.
     * @throws IllegalArgumentException  if another category with the updated name already exists.
     */
    @Transactional
    @CachePut(value = AppConstants.CATEGORY_BY_ID_CACHE, key = "#id") // Update cache for specific category
    @CacheEvict(value = AppConstants.CATEGORIES_CACHE, allEntries = true) // Clear all categories cache as list might change
    public Category updateCategory(Long id, Category categoryDetails) {
        Category category = getCategoryById(id); // Uses cached getById

        if (!category.getName().equals(categoryDetails.getName()) && categoryRepository.existsByName(categoryDetails.getName())) {
            log.warn("Category update failed: Category with name '{}' already exists for ID: {}.", categoryDetails.getName(), id);
            throw new IllegalArgumentException("Category with name '" + categoryDetails.getName() + "' already exists.");
        }

        category.setName(categoryDetails.getName());
        category.setDescription(categoryDetails.getDescription());
        log.info("Updating category with ID: {}", id);
        return categoryRepository.save(category);
    }

    /**
     * Deletes a category by its ID.
     *
     * @param id The ID of the category to delete.
     * @throws ResourceNotFoundException if the category is not found.
     */
    @Transactional
    @CacheEvict(value = {AppConstants.CATEGORIES_CACHE, AppConstants.CATEGORY_BY_ID_CACHE}, key = "#id") // Clear category from caches
    public void deleteCategory(Long id) {
        Category category = getCategoryById(id); // Uses cached getById
        log.info("Deleting category with ID: {}", id);
        categoryRepository.delete(category);
    }
}