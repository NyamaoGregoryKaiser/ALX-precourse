```java
package com.alx.ecommerce.service;

import com.alx.ecommerce.dto.CategoryDTO;
import com.alx.ecommerce.exception.ResourceNotFoundException;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {

    private final CategoryRepository categoryRepository;

    @Transactional
    @CacheEvict(value = {"categories", "allCategories"}, allEntries = true)
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        log.info("Creating new category: {}", categoryDTO.getName());
        if (categoryRepository.existsByNameIgnoreCase(categoryDTO.getName())) {
            throw new DataIntegrityViolationException("Category with name '" + categoryDTO.getName() + "' already exists.");
        }

        Category category = Category.builder()
                .name(categoryDTO.getName())
                .description(categoryDTO.getDescription())
                .build();

        Category savedCategory = categoryRepository.save(category);
        log.info("Category created successfully: {}", savedCategory.getName());
        return CategoryDTO.builder()
                .id(savedCategory.getId())
                .name(savedCategory.getName())
                .description(savedCategory.getDescription())
                .createdAt(savedCategory.getCreatedAt())
                .updatedAt(savedCategory.getUpdatedAt())
                .build();
    }

    @Cacheable(value = "categories", key = "#id")
    public CategoryDTO getCategoryById(Long id) {
        log.debug("Fetching category by ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }

    @Cacheable(value = "allCategories")
    public List<CategoryDTO> getAllCategories() {
        log.debug("Fetching all categories.");
        return categoryRepository.findAll().stream()
                .map(category -> CategoryDTO.builder()
                        .id(category.getId())
                        .name(category.getName())
                        .description(category.getDescription())
                        .createdAt(category.getCreatedAt())
                        .updatedAt(category.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());
    }

    @Transactional
    @CacheEvict(value = {"categories", "allCategories", "productsByCategory"}, allEntries = true)
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        log.info("Updating category with ID: {}", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));

        if (categoryDTO.getName() != null && !categoryDTO.getName().equalsIgnoreCase(category.getName())) {
            if (categoryRepository.existsByNameIgnoreCase(categoryDTO.getName())) {
                throw new DataIntegrityViolationException("Category with name '" + categoryDTO.getName() + "' already exists.");
            }
            category.setName(categoryDTO.getName());
        }
        if (categoryDTO.getDescription() != null) {
            category.setDescription(categoryDTO.getDescription());
        }

        Category updatedCategory = categoryRepository.save(category);
        log.info("Category {} updated successfully.", id);
        return CategoryDTO.builder()
                .id(updatedCategory.getId())
                .name(updatedCategory.getName())
                .description(updatedCategory.getDescription())
                .createdAt(updatedCategory.getCreatedAt())
                .updatedAt(updatedCategory.getUpdatedAt())
                .build();
    }

    @Transactional
    @CacheEvict(value = {"categories", "allCategories", "productsByCategory"}, allEntries = true)
    public void deleteCategory(Long id) {
        log.info("Deleting category with ID: {}", id);
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category", "id", id);
        }
        categoryRepository.deleteById(id);
        log.info("Category with ID {} deleted successfully.", id);
    }
}
```