```java
package com.alx.pm.controller;

import com.alx.pm.dto.CategoryDTO;
import com.alx.pm.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
@Tag(name = "Category Management", description = "API for managing product categories")
public class CategoryController {

    private final CategoryService categoryService;

    @Operation(summary = "Get all categories",
               responses = @ApiResponse(responseCode = "200", description = "List of categories retrieved successfully"))
    @GetMapping
    public ResponseEntity<List<CategoryDTO>> getAllCategories() {
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    @Operation(summary = "Get a category by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Category found"),
                   @ApiResponse(responseCode = "404", description = "Category not found")
               })
    @GetMapping("/{id}")
    public ResponseEntity<CategoryDTO> getCategoryById(@PathVariable Long id) {
        CategoryDTO category = categoryService.getCategoryById(id);
        return ResponseEntity.ok(category);
    }

    @Operation(summary = "Create a new category",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Category created successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input")
               })
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can create categories
    @PostMapping
    public ResponseEntity<CategoryDTO> createCategory(@Valid @RequestBody CategoryDTO categoryDTO) {
        CategoryDTO createdCategory = categoryService.createCategory(categoryDTO);
        return new ResponseEntity<>(createdCategory, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing category",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Category updated successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "404", description = "Category not found")
               })
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can update categories
    @PutMapping("/{id}")
    public ResponseEntity<CategoryDTO> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryDTO categoryDTO) {
        CategoryDTO updatedCategory = categoryService.updateCategory(id, categoryDTO);
        return ResponseEntity.ok(updatedCategory);
    }

    @Operation(summary = "Delete a category by ID",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Category deleted successfully"),
                   @ApiResponse(responseCode = "404", description = "Category not found")
               })
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can delete categories
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
```