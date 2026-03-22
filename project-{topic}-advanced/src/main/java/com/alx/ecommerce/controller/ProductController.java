```java
package com.alx.ecommerce.controller;

import com.alx.ecommerce.dto.ProductDTOs;
import com.alx.ecommerce.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "Product catalog management operations")
@Slf4j
public class ProductController {

    private final ProductService productService;

    @Operation(summary = "Create a new product (Admin only)",
               description = "Adds a new product to the catalog. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PostMapping
    public ResponseEntity<ProductDTOs.ProductResponse> createProduct(@Valid @RequestBody ProductDTOs.CreateProductRequest request) {
        log.info("Received request to create product: {}", request.getName());
        ProductDTOs.ProductResponse product = productService.createProduct(request);
        return new ResponseEntity<>(product, HttpStatus.CREATED);
    }

    @Operation(summary = "Get product by ID",
               description = "Retrieves details of a single product by its ID.")
    @GetMapping("/{id}")
    public ResponseEntity<ProductDTOs.ProductResponse> getProductById(@Parameter(description = "ID of the product to retrieve") @PathVariable UUID id) {
        log.debug("Received request to get product by ID: {}", id);
        ProductDTOs.ProductResponse product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }

    @Operation(summary = "Get all products with pagination and sorting",
               description = "Retrieves a paginated and sortable list of all products.")
    @GetMapping
    public ResponseEntity<Page<ProductDTOs.ProductResponse>> getAllProducts(
            @Parameter(description = "Page number (0-indexed)", example = "0") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Number of items per page", example = "10") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Sort order (e.g., 'name,asc' or 'price,desc')", example = "name,asc") @RequestParam(defaultValue = "name,asc") String[] sort) {
        log.debug("Received request to get all products (page: {}, size: {}, sort: {})", page, size, sort);
        Sort sortOrder = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        PageRequest pageable = PageRequest.of(page, size, sortOrder);
        Page<ProductDTOs.ProductResponse> products = productService.getAllProducts(pageable);
        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get products by category ID",
               description = "Retrieves a list of products belonging to a specific category.")
    @GetMapping("/category/{categoryId}")
    public ResponseEntity<List<ProductDTOs.ProductResponse>> getProductsByCategoryId(
            @Parameter(description = "ID of the category") @PathVariable Long categoryId) {
        log.debug("Received request to get products by category ID: {}", categoryId);
        List<ProductDTOs.ProductResponse> products = productService.getProductsByCategoryId(categoryId);
        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Update an existing product (Admin only)",
               description = "Updates details of an existing product. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<ProductDTOs.ProductResponse> updateProduct(@Parameter(description = "ID of the product to update") @PathVariable UUID id,
                                                             @Valid @RequestBody ProductDTOs.UpdateProductRequest request) {
        log.info("Received request to update product with ID: {}", id);
        ProductDTOs.ProductResponse updatedProduct = productService.updateProduct(id, request);
        return ResponseEntity.ok(updatedProduct);
    }

    @Operation(summary = "Delete a product (Admin only)",
               description = "Deletes a product from the catalog. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    @PreAuthorize("hasAuthority('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@Parameter(description = "ID of the product to delete") @PathVariable UUID id) {
        log.info("Received request to delete product with ID: {}", id);
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
```