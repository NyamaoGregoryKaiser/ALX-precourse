```java
package com.alx.taskmgr.controller;

import com.alx.taskmgr.dto.category.CategoryRequest;
import com.alx.taskmgr.dto.category.CategoryResponse;
import com.alx.taskmgr.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for managing task categories.
 * Provides CRUD operations for categories.
 * Access to create, update, delete is restricted to ADMIN role.
 */
@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth") // Indicates that this endpoint requires authentication
@Tag(name = "Categories", description = "Operations related to task categories")
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Creates a new task category.
     * Requires ADMIN role.
     *
     * @param request The CategoryRequest containing the category name.
     * @return ResponseEntity with the created CategoryResponse.
     */
    @Operation(summary = "Create a new category (Admin only)",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Category created successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = CategoryResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or category name already exists"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Requires ADMIN role")
               })
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> createCategory(@Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.createCategory(request);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    /**
     * Retrieves all task categories.
     * Accessible by authenticated users (USER or ADMIN).
     * This endpoint is cached.
     *
     * @return ResponseEntity with a list of CategoryResponse.
     */
    @Operation(summary = "Get all categories",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Successfully retrieved categories",
                                content = @Content(mediaType = "application/json", schema = @Schema(type = "array", implementation = CategoryResponse.class))),
                   @ApiResponse(responseCode = "401", description = "Unauthorized")
               })
    @GetMapping
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<List<CategoryResponse>> getAllCategories() {
        List<CategoryResponse> categories = categoryService.getAllCategories();
        return ResponseEntity.ok(categories);
    }

    /**
     * Retrieves a task category by its ID.
     * Accessible by authenticated users (USER or ADMIN).
     *
     * @param id The ID of the category to retrieve.
     * @return ResponseEntity with the CategoryResponse.
     */
    @Operation(summary = "Get category by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Category found",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = CategoryResponse.class))),
                   @ApiResponse(responseCode = "404", description = "Category not found"),
                   @ApiResponse(responseCode = "401", description = "Unauthorized")
               })
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'ADMIN')")
    public ResponseEntity<CategoryResponse> getCategoryById(@PathVariable Long id) {
        CategoryResponse response = categoryService.getCategoryById(id);
        return ResponseEntity.ok(response);
    }

    /**
     * Updates an existing task category.
     * Requires ADMIN role.
     *
     * @param id      The ID of the category to update.
     * @param request The CategoryRequest containing updated category data.
     * @return ResponseEntity with the updated CategoryResponse.
     */
    @Operation(summary = "Update a category (Admin only)",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Category updated successfully",
                                content = @Content(mediaType = "application/json", schema = @Schema(implementation = CategoryResponse.class))),
                   @ApiResponse(responseCode = "400", description = "Invalid input or category name already exists"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Requires ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "Category not found")
               })
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<CategoryResponse> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest request) {
        CategoryResponse response = categoryService.updateCategory(id, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Deletes a task category by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the category to delete.
     * @return ResponseEntity with no content upon successful deletion.
     */
    @Operation(summary = "Delete a category (Admin only)",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Category deleted successfully"),
                   @ApiResponse(responseCode = "403", description = "Forbidden: Requires ADMIN role"),
                   @ApiResponse(responseCode = "404", description = "Category not found")
               })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return ResponseEntity.noContent().build();
    }
}
```