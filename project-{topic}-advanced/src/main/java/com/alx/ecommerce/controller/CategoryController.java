```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.CategoryDTO;
import com.alx.ecommerce.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
@Tag(name = "Categories", description = "Product category management operations")
@Slf4j
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Create a new category (Admin only)",
               description = "Adds a new product category. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryDTO categoryDTO) {
        log.info("Received request to create category: {}", categoryDTO.getName());
        CategoryDTO createdCategory = categoryService.createCategory(categoryDTO);
        return new ResponseEntity<>(createdCategory, HttpStatus.CREATED);
    }

    @Operation(summary = "Get category by ID",
               description = "Retrieves details of a single category by its ID.")
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@Parameter(description = "ID of the category to retrieve") @PathVariable Long id) {
        log.debug("Received request to get category by ID: {}", id);
        CategoryDTO category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(category);
    }

    @Operation(summary = "Get all categories",
               description = "Retrieves a list of all product categories.")
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        log.debug("Received request to get all categories.");
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    @Operation(summary = "Update an existing category (Admin only)",
               description = "Updates details of an existing category. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@Parameter(description = "ID of the category to update") @PathVariable Long id,
                                                      @Valid @RequestBody CategoryDTO categoryDTO) {
        log.info("Received request to update category with ID: {}", id);
        CategoryDTO updatedCategory = categoryService.updateCategory(id, categoryDTO);
        return ResponseEntity.ok(updatedCategory);
    }

    @Operation(summary = "Delete a category (Admin only)",
               description = "Deletes a category. Requires ADMIN role. Note: Products in this category might become un-categorized or deleted depending on DB constraints.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@Parameter(description = "ID of the category to delete") @PathVariable Long id) {
        log.info("Received request to delete category with ID: {}", id);
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
```