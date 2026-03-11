package com.alx.ecommerce.product.service;

import com.alx.ecommerce.common.exceptions.ResourceNotFoundException;
import com.alx.ecommerce.product.dto.CategoryDTO;
import com.alx.ecommerce.product.model.Category;
import com.alx.ecommerce.product.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private static final Logger logger = LoggerFactory.getLogger(CategoryService.class);
    private final CategoryRepository categoryRepository;

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryDTO createCategory(CategoryDTO categoryDTO) {
        if (categoryRepository.existsByName(categoryDTO.getName())) {
            throw new IllegalArgumentException("Category with name " + categoryDTO.getName() + " already exists.");
        }
        Category category = Category.builder()
                .name(categoryDTO.getName())
                .description(categoryDTO.getDescription())
                .imageUrl(categoryDTO.getImageUrl())
                .build();
        Category savedCategory = categoryRepository.save(category);
        logger.info("Category created: {}", savedCategory.getName());
        return convertToDto(savedCategory);
    }

    @Cacheable(value = "categories")
    public List<CategoryDTO> getAllCategories() {
        logger.debug("Fetching all categories from database (or cache if available)");
        return categoryRepository.findAll().stream()
                .map(this::convertToDto)
                .collect(Collectors.toList());
    }

    @Cacheable(value = "categories", key = "#id")
    public CategoryDTO getCategoryById(Long id) {
        logger.debug("Fetching category by ID: {} from database (or cache if available)", id);
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));
        return convertToDto(category);
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO) {
        Category existingCategory = categoryRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Category", "id", id));

        // Check if new name already exists for a *different* category
        if (!existingCategory.getName().equalsIgnoreCase(categoryDTO.getName()) && categoryRepository.existsByName(categoryDTO.getName())) {
            throw new IllegalArgumentException("Category with name " + categoryDTO.getName() + " already exists.");
        }

        existingCategory.setName(categoryDTO.getName());
        existingCategory.setDescription(categoryDTO.getDescription());
        existingCategory.setImageUrl(categoryDTO.getImageUrl());
        Category updatedCategory = categoryRepository.save(existingCategory);
        logger.info("Category updated: {}", updatedCategory.getName());
        return convertToDto(updatedCategory);
    }

    @CacheEvict(value = "categories", allEntries = true)
    @Transactional
    public void deleteCategory(Long id) {
        if (!categoryRepository.existsById(id)) {
            throw new ResourceNotFoundException("Category", "id", id);
        }
        categoryRepository.deleteById(id);
        logger.info("Category deleted with ID: {}", id);
    }

    private CategoryDTO convertToDto(Category category) {
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .imageUrl(category.getImageUrl())
                .createdAt(category.getCreatedAt())
                .updatedAt(category.getUpdatedAt())
                .build();
    }
}