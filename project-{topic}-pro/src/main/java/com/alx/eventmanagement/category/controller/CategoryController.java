```java
package com.alx.eventmanagement.category.controller;

import com.alx.eventmanagement.category.dto.CategoryDTO;
import com.alx.eventmanagement.category.dto.CreateCategoryDTO;
import com.alx.eventmanagement.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Categories", description = "API for managing event categories")
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Get all event categories", description = "Returns a list of all event categories, cached for performance.")
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        log.info("Request to get all categories");
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    @Operation(summary = "Get category by ID", description = "Returns a single category by its ID, cached for performance.")
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        log.info("Request to get category by ID: {}", id);
        CategoryDTO category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(category);
    }

    @Operation(summary = "Create a new category", description = "Requires ADMIN role. Clears category cache on creation.")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CreateCategoryDTO createCategoryDTO) {
        log.info("Request to create new category: {}", createCategoryDTO.getName());
        CategoryDTO newCategory = categoryService.createCategory(createCategoryDTO);
        return new ResponseEntity<>(newCategory, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing category", description = "Requires ADMIN role. Clears category cache on update.")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @Valid @RequestBody CreateCategoryDTO updateCategoryDTO) {
        log.info("Request to update category with ID: {}", id);
        CategoryDTO updatedCategory = categoryService.updateCategory(id, updateCategoryDTO);
        return ResponseEntity.ok(updatedCategory);
    }

    @Operation(summary = "Delete a category", description = "Requires ADMIN role. Clears category cache on deletion.")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "bearerAuth")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        log.info("Request to delete category with ID: {}", id);
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
```