```java
package com.alx.taskmgr.service;

import com.alx.taskmgr.dto.CategoryDTO;
import com.alx.taskmgr.exception.ResourceNotFoundException;
import com.alx.taskmgr.model.Category;
import com.alx.taskmgr.model.User;
import com.alx.taskmgr.repository.CategoryRepository;
import com.alx.taskmgr.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    @Cacheable(value = "categories", key = "#userId")
    public List<CategoryDTO> getAllCategories(Long userId) {
        return categoryRepository.findByUserId(userId).stream()
                .map(this::mapCategoryToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    @Cacheable(value = "category", key = "#id")
    public CategoryDTO getCategoryById(Long id, Long userId) {
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        return mapCategoryToDTO(category);
    }

    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true) // Evict all related caches on modification
    public CategoryDTO createCategory(CategoryDTO categoryDTO, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));

        if (categoryRepository.existsByNameAndUserId(categoryDTO.getName(), userId)) {
            throw new IllegalArgumentException("Category with name '" + categoryDTO.getName() + "' already exists for this user.");
        }

        Category category = Category.builder()
                .name(categoryDTO.getName())
                .description(categoryDTO.getDescription())
                .user(user)
                .build();
        return mapCategoryToDTO(categoryRepository.save(category));
    }

    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true)
    public CategoryDTO updateCategory(Long id, CategoryDTO categoryDTO, Long userId) {
        Category existingCategory = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));

        if (categoryRepository.existsByNameAndUserId(categoryDTO.getName(), userId) &&
                !existingCategory.getName().equals(categoryDTO.getName())) {
            throw new IllegalArgumentException("Category with name '" + categoryDTO.getName() + "' already exists for this user.");
        }

        existingCategory.setName(categoryDTO.getName());
        existingCategory.setDescription(categoryDTO.getDescription());
        return mapCategoryToDTO(categoryRepository.save(existingCategory));
    }

    @Transactional
    @CacheEvict(value = {"categories", "category"}, allEntries = true)
    public void deleteCategory(Long id, Long userId) {
        Category category = categoryRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Category not found with id: " + id));
        categoryRepository.delete(category);
    }

    private CategoryDTO mapCategoryToDTO(Category category) {
        return CategoryDTO.builder()
                .id(category.getId())
                .name(category.getName())
                .description(category.getDescription())
                .userId(category.getUser().getId())
                .build();
    }
}
```