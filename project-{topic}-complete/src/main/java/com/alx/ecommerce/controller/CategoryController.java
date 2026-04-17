package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.MessageResponse;
import com.alx.ecommerce.model.Category;
import com.alx.ecommerce.service.CategoryService;
import com.alx.ecommerce.util.AppConstants;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import static com.alx.ecommerce.util.AppConstants.API_V1_BASE_URL;

/**
 * REST controller for managing product categories.
 */
@Tag(name = "Category Management", description = "APIs for managing product categories (CRUD operations).")
@RestController
@RequestMapping(API_V1_BASE_URL + "/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    /**
     * Creates a new category.
     * Requires ADMIN role.
     *
     * @param category The category object to create.
     * @return ResponseEntity with the created category and HTTP status CREATED.
     */
    @Operation(summary = "Create a new category",
            description = "Adds a new product category to the system. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Category created successfully", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = Category.class))),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid data, category name already exists)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Category> createCategory(@Valid @RequestBody Category category) {
        Category createdCategory = categoryService.createCategory(category);
        return new ResponseEntity<>(createdCategory, HttpStatus.CREATED);
    }

    /**
     * Retrieves all categories with pagination and sorting.
     * Accessible to all authenticated users.
     *
     * @param pageNo   Page number (default 0).
     * @param pageSize Page size (default 10).
     * @param sortBy   Field to sort by (default "id").
     * @param sortDir  Sort direction (default "asc").
     * @return ResponseEntity with a page of categories and HTTP status OK.
     */
    @Operation(summary = "Get all categories",
            description = "Retrieves a paginated and sorted list of all product categories. Accessible by any authenticated user.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved categories"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @GetMapping
    public ResponseEntity<Page<Category>> getAllCategories(
            @RequestParam(value = "pageNo", defaultValue = AppConstants.DEFAULT_PAGE_NUMBER, required = false) int pageNo,
            @RequestParam(value = "pageSize", defaultValue = AppConstants.DEFAULT_PAGE_SIZE, required = false) int pageSize,
            @RequestParam(value = "sortBy", defaultValue = AppConstants.DEFAULT_SORT_BY, required = false) String sortBy,
            @RequestParam(value = "sortDir", defaultValue = AppConstants.DEFAULT_SORT_DIRECTION, required = false) String sortDir
    ) {
        Page<Category> categories = categoryService.getAllCategories(pageNo, pageSize, sortBy, sortDir);
        return new ResponseEntity<>(categories, HttpStatus.OK);
    }

    /**
     * Retrieves a category by its ID.
     * Accessible to all authenticated users.
     *
     * @param id The ID of the category.
     * @return ResponseEntity with the category and HTTP status OK.
     */
    @Operation(summary = "Get category by ID",
            description = "Retrieves a single product category by its unique identifier. Accessible by any authenticated user.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Category retrieved successfully"),
                    @ApiResponse(responseCode = "404", description = "Category not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable Long id) {
        Category category = categoryService.getCategoryById(id);
        return new ResponseEntity<>(category, HttpStatus.OK);
    }

    /**
     * Updates an existing category.
     * Requires ADMIN role.
     *
     * @param id          The ID of the category to update.
     * @param category The updated category object.
     * @return ResponseEntity with the updated category and HTTP status OK.
     */
    @Operation(summary = "Update a category",
            description = "Updates an existing product category. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Category updated successfully"),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid data, category name already exists)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Category not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable Long id, @Valid @RequestBody Category category) {
        Category updatedCategory = categoryService.updateCategory(id, category);
        return new ResponseEntity<>(updatedCategory, HttpStatus.OK);
    }

    /**
     * Deletes a category by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the category to delete.
     * @return ResponseEntity with a success message and HTTP status NO_CONTENT.
     */
    @Operation(summary = "Delete a category",
            description = "Deletes a product category by its ID. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Category deleted successfully"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Category not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteCategory(@PathVariable Long id) {
        categoryService.deleteCategory(id);
        return new ResponseEntity<>(new MessageResponse("Category deleted successfully", HttpStatus.NO_CONTENT.value()), HttpStatus.NO_CONTENT);
    }
}