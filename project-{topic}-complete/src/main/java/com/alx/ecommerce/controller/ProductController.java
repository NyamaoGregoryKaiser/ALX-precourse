package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.MessageResponse;
import com.alx.ecommerce.dto.product.ProductRequest;
import com.alx.ecommerce.dto.product.ProductResponse;
import com.alx.ecommerce.service.ProductService;
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

import java.util.List;

import static com.alx.ecommerce.util.AppConstants.API_V1_BASE_URL;

/**
 * REST controller for managing products.
 */
@Tag(name = "Product Management", description = "APIs for managing products (CRUD operations).")
@RestController
@RequestMapping(API_V1_BASE_URL + "/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    /**
     * Creates a new product.
     * Requires ADMIN role.
     *
     * @param productRequest DTO containing product details.
     * @return ResponseEntity with the created product response and HTTP status CREATED.
     */
    @Operation(summary = "Create a new product",
            description = "Adds a new product to the system. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "201", description = "Product created successfully", content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json", schema = @io.swagger.v3.oas.annotations.media.Schema(implementation = ProductResponse.class))),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid data, category not found)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Category not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<ProductResponse> createProduct(@Valid @RequestBody ProductRequest productRequest) {
        ProductResponse createdProduct = productService.createProduct(productRequest);
        return new ResponseEntity<>(createdProduct, HttpStatus.CREATED);
    }

    /**
     * Retrieves all products with pagination and sorting.
     * Accessible to all authenticated users.
     *
     * @param pageNo   Page number (default 0).
     * @param pageSize Page size (default 10).
     * @param sortBy   Field to sort by (default "id").
     * @param sortDir  Sort direction (default "asc").
     * @return ResponseEntity with a page of product responses and HTTP status OK.
     */
    @Operation(summary = "Get all products",
            description = "Retrieves a paginated and sorted list of all products. Accessible by any authenticated user.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved products"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @GetMapping
    public ResponseEntity<Page<ProductResponse>> getAllProducts(
            @RequestParam(value = "pageNo", defaultValue = AppConstants.DEFAULT_PAGE_NUMBER, required = false) int pageNo,
            @RequestParam(value = "pageSize", defaultValue = AppConstants.DEFAULT_PAGE_SIZE, required = false) int pageSize,
            @RequestParam(value = "sortBy", defaultValue = AppConstants.DEFAULT_SORT_BY, required = false) String sortBy,
            @RequestParam(value = "sortDir", defaultValue = AppConstants.DEFAULT_SORT_DIRECTION, required = false) String sortDir
    ) {
        Page<ProductResponse> products = productService.getAllProducts(pageNo, pageSize, sortBy, sortDir);
        return new ResponseEntity<>(products, HttpStatus.OK);
    }

    /**
     * Retrieves a product by its ID.
     * Accessible to all authenticated users.
     *
     * @param id The ID of the product.
     * @return ResponseEntity with the product response and HTTP status OK.
     */
    @Operation(summary = "Get product by ID",
            description = "Retrieves a single product by its unique identifier. Accessible by any authenticated user.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Product retrieved successfully"),
                    @ApiResponse(responseCode = "404", description = "Product not found"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponse> getProductById(@PathVariable Long id) {
        ProductResponse product = productService.getProductById(id);
        return new ResponseEntity<>(product, HttpStatus.OK);
    }

    /**
     * Updates an existing product.
     * Requires ADMIN role.
     *
     * @param id             The ID of the product to update.
     * @param productRequest DTO containing updated product details.
     * @return ResponseEntity with the updated product response and HTTP status OK.
     */
    @Operation(summary = "Update a product",
            description = "Updates an existing product's details. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Product updated successfully"),
                    @ApiResponse(responseCode = "400", description = "Bad Request (e.g., invalid data, category not found)"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Product or Category not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponse> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest productRequest) {
        ProductResponse updatedProduct = productService.updateProduct(id, productRequest);
        return new ResponseEntity<>(updatedProduct, HttpStatus.OK);
    }

    /**
     * Deletes a product by its ID.
     * Requires ADMIN role.
     *
     * @param id The ID of the product to delete.
     * @return ResponseEntity with a success message and HTTP status NO_CONTENT.
     */
    @Operation(summary = "Delete a product",
            description = "Deletes a product by its ID. Requires ADMIN role.",
            responses = {
                    @ApiResponse(responseCode = "204", description = "Product deleted successfully"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized"),
                    @ApiResponse(responseCode = "403", description = "Forbidden (missing ADMIN role)"),
                    @ApiResponse(responseCode = "404", description = "Product not found")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return new ResponseEntity<>(new MessageResponse("Product deleted successfully", HttpStatus.NO_CONTENT.value()), HttpStatus.NO_CONTENT);
    }

    /**
     * Searches for products by name or description.
     * Accessible to all authenticated users.
     *
     * @param query The search query string.
     * @return ResponseEntity with a list of matching product responses and HTTP status OK.
     */
    @Operation(summary = "Search products",
            description = "Searches for products by name or description. Accessible by any authenticated user.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Successfully retrieved matching products"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized")
            },
            security = @SecurityRequirement(name = "Bearer Authentication"))
    @GetMapping("/search")
    public ResponseEntity<List<ProductResponse>> searchProducts(@RequestParam("q") String query) {
        List<ProductResponse> products = productService.searchProducts(query);
        return new ResponseEntity<>(products, HttpStatus.OK);
    }
}