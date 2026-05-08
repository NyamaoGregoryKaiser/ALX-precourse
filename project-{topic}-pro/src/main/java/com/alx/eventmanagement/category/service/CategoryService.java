```java
package com.alx.eventmanagement.category.service;

import com.alx.eventmanagement.category.dto.CategoryDTO;
import com.alx.eventmanagement.category.dto.CreateCategoryDTO;
import com.alx.eventmanagement.category.model.Category;
import com.alx.eventmanagement.category.repository.CategoryRepository;
import com.alx.eventmanagement.common.exception.BadRequestException;
import com.alx.eventmanagement.common.exception.ResourceNotFoundException;
import com.alx.eventmanagement.util.MapperUtil;
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

    @Cacheable(value = "eventCategories")
    public List<CategoryDTO> getAllCategories() {
        log.debug("Fetching all categories from database (not cache)");
        return categoryRepository.findAll().stream()
                .map(MapperUtil::toCategoryDTO)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "eventCategories", key = "#id")
    public CategoryDTO getCategoryById(Long id) {
        log.debug("Fetching category by ID: {} from database (not cache)", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        return MapperUtil.toCategoryDTO(category);
    }

    @Transactional
    @CacheEvict(value = "eventCategories", allEntries = true) // Clear all categories cache on creation
    public CategoryDTO createCategory(CreateCategoryDTO createCategoryDTO) {
        if (categoryRepository.existsByName(createCategoryDTO.getName())) {
            throw new BadRequestException("Category with name '" + createCategoryDTO.getName() + "' already exists.");
        }
        Category category = Category.builder()
                .name(createCategoryDTO.getName())
                .description(createCategoryDTO.getDescription())
                .build();
        log.info("Creating new category: {}", category.getName());
        return MapperUtil.toCategoryDTO(categoryRepository.save(category));
    }

    @Transactional
    @CacheEvict(value = "eventCategories", allEntries = true) // Clear all categories cache on update
    public CategoryDTO updateCategory(Long id, CreateCategoryDTO updateCategoryDTO) {
        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));

        if (!existingCategory.getName().equalsIgnoreCase(updateCategoryDTO.getName()) &&
                categoryRepository.existsByName(updateCategoryDTO.getName())) {
            throw new BadRequestException("Category with name '" + updateCategoryDTO.getName() + "' already exists.");
        }

        existingCategory.setName(updateCategoryDTO.getName());
        existingCategory.setDescription(updateCategoryDTO.getDescription());
        log.info("Updating category with ID {}: {}", id, existingCategory.getName());
        return MapperUtil.toCategoryDTO(categoryRepository.save(existingCategory));
    }

    @Transactional
    @CacheEvict(value = "eventCategories", allEntries = true) // Clear all categories cache on deletion
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category", "id", id);
        }
        log.info("Deleting category with ID: {}", id);
        categoryRepository.deleteById(id);
    }

    // Internal method to retrieve category entity
    public Category getCategoryEntityById(Long id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
    }
}
```