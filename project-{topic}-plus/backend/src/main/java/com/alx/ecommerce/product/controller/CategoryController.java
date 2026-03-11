package com.alx.ecommerce.product.controller;

import com.alx.ecommerce.common.ApiResponse;
import com.alx.ecommerce.product.dto.CategoryDTO;
import com.alx.ecommerce.product.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
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
@Tag(name = "Product Categories", description = "API for managing product categories")
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new category", description = "Creates a new product category. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CategoryDTO>> createCategory(@Valid @RequestBody CategoryDTO categoryDTO) {
        CategoryDTO createdCategory = categoryService.createCategory(categoryDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Category created successfully", createdCategory), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Get all categories", description = "Retrieves a list of all product categories.")
    public ResponseEntity<ApiResponse<List<CategoryDTO>>> getAllCategories() {
        List<CategoryDTO> categories = categoryService.getAllCategories();
        return new ResponseEntity<>(new ApiResponse<>(true, "Categories fetched successfully", categories), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get category by ID", description = "Retrieves details of a specific category by its ID.")
    public ResponseEntity<ApiResponse<CategoryDTO>> getCategoryById(@PathVariable Long id) {
        CategoryDTO category = categoryService.getCategoryById(id);
        return new ResponseEntity<>(new ApiResponse<>(true, "Category fetched successfully", category), HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an existing category", description = "Updates the details of an existing product category. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<CategoryDTO>> updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryDTO categoryDTO) {
        CategoryDTO updatedCategory = categoryService.updateCategory(id, categoryDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Category updated successfully", updatedCategory), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a category", description = "Deletes a product category by its ID. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<?>> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return new ResponseEntity<>(new ApiResponse<>(true, "Category deleted successfully"), HttpStatus.NO_CONTENT);
    }
}