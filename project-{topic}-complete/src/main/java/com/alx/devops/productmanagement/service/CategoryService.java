```java
package com.alx.devops.productmanagement.service;

import com.alx.devops.productmanagement.dto.CategoryDTO;
import com.alx.devops.productmanagement.exception.ResourceNotFoundException;
import com.alx.devops.productmanagement.exception.ValidationException;
import com.alx.devops.productmanagement.model.Category;
import com.alx.devops.productmanagement.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "categories", key = "'allCategories'")
    public List<CategoryDTO> findAllCategories() {
        log.debug("Fetching all categories from database (cache miss or initial load)");
        return categoryRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "category", key = "#id")
    public CategoryDTO findCategoryById(Long id) {
        log.debug("Fetching category by ID: {} from database (cache miss or initial load)", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));
        return convertToDTO(category);
    }

    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true) // Evict all category caches on modification
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        if (categoryRepository.findByName(categoryDTO.getName()).isPresent()) {
            throw new ValidationException("Category with name '" + categoryDTO.getName() + "' already exists.");
        }
        Category category = new Category();
        category.setName(categoryDTO.getName());
        Category savedCategory = categoryRepository.save(category);
        log.info("Category created: {}", savedCategory.getName());
        return convertToDTO(savedCategory);
    }

    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true) // Evict all category caches on modification
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with ID: " + id));

        if (!existingCategory.getName().equals(categoryDTO.getName()) &&
                categoryRepository.findByName(categoryDTO.getName()).isPresent()) {
            throw new ValidationException("Category with name '" + categoryDTO.getName() + "' already exists.");
        }

        existingCategory.setName(categoryDTO.getName());
        Category updatedCategory = categoryRepository.save(existingCategory);
        log.info("Category updated: {}", updatedCategory.getName());
        return convertToDTO(updatedCategory);
    }

    @Transactional
    @CacheEvict(value = {"categories", "category", "products"}, allEntries = true) // Evict product caches too, as category is deleted
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category not found with ID: " + id);
        }
        // TODO: Add logic to handle products associated with this category (e.g., set category to null, or delete products)
        // For now, let's assume cascade delete is handled by DB or user ensures no products are linked.
        categoryRepository.deleteById(id);
        log.info("Category deleted with ID: {}", id);
    }

    private CategoryDTO convertToDTO(Category category) {
        CategoryDTO dto = new CategoryDTO();
        dto.setId(category.getId());
        dto.setName(category.getName());
        return dto;
    }

    // Helper method to convert DTO to Entity (for internal use by other services potentially)
    public Category convertToEntity(CategoryDTO dto) {
        Category category = new Category();
        category.setId(dto.getId()); // ID might be null for new entities
        category.setName(dto.getName());
        return category;
    }
}
```