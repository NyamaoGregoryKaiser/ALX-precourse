```java
package com.alx.pm.controller;

import com.alx.pm.dto.ProductDTO;
import com.alx.pm.service.ProductService;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Product Management", description = "API for managing products")
public class ProductController {

    private final ProductService productService;
    private final Bucket rateLimitingBucket; // Injected rate limiting bucket

    @Operation(summary = "Get all products with pagination and filtering",
               responses = @ApiResponse(responseCode = "200", description = "List of products retrieved successfully"))
    @GetMapping
    public ResponseEntity<Page<ProductDTO>> getAllProducts(
            @RequestParam(defaultValue = "0") @Parameter(description = "Page number (0-indexed)") int page,
            @RequestParam(defaultValue = "10") @Parameter(description = "Number of items per page") int size,
            @RequestParam(defaultValue = "name,asc") @Parameter(description = "Sort by field and direction (e.g., 'name,asc')") String[] sort,
            @RequestParam(required = false) @Parameter(description = "Filter by product name") String name,
            @RequestParam(required = false) @Parameter(description = "Filter by product category ID") Long categoryId,
            @RequestParam(required = false) @Parameter(description = "Filter by minimum price") Double minPrice,
            @RequestParam(required = false) @Parameter(description = "Filter by maximum price") Double maxPrice
    ) {
        // Basic rate limiting check
        ConsumptionProbe probe = rateLimitingBucket.tryConsumeAndReturnRemaining(1);
        if (!probe.isConsumed()) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .header("X-Rate-Limit-Retry-After-Seconds", String.valueOf(probe.getNanosToWaitForRefill() / 1_000_000_000))
                    .build();
        }

        Sort sorting = Sort.by(Sort.Direction.fromString(sort[1]), sort[0]);
        PageRequest pageable = PageRequest.of(page, size, sorting);
        Page<ProductDTO> products = productService.getAllProducts(pageable, name, categoryId, minPrice, maxPrice);
        return ResponseEntity.ok(products);
    }

    @Operation(summary = "Get a product by ID",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Product found"),
                   @ApiResponse(responseCode = "404", description = "Product not found")
               })
    @GetMapping("/{id}")
    public ResponseEntity<ProductDTO> getProductById(@PathVariable Long id) {
        ProductDTO product = productService.getProductById(id);
        return ResponseEntity.ok(product);
    }

    @Operation(summary = "Create a new product",
               responses = {
                   @ApiResponse(responseCode = "201", description = "Product created successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input")
               })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')") // ADMINs and MANAGERS can create products
    @PostMapping
    public ResponseEntity<ProductDTO> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        ProductDTO createdProduct = productService.createProduct(productDTO);
        return new ResponseEntity<>(createdProduct, HttpStatus.CREATED);
    }

    @Operation(summary = "Update an existing product",
               responses = {
                   @ApiResponse(responseCode = "200", description = "Product updated successfully"),
                   @ApiResponse(responseCode = "400", description = "Invalid input"),
                   @ApiResponse(responseCode = "404", description = "Product not found")
               })
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')") // ADMINs and MANAGERS can update products
    @PutMapping("/{id}")
    public ResponseEntity<ProductDTO> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDTO productDTO) {
        ProductDTO updatedProduct = productService.updateProduct(id, productDTO);
        return ResponseEntity.ok(updatedProduct);
    }

    @Operation(summary = "Delete a product by ID",
               responses = {
                   @ApiResponse(responseCode = "204", description = "Product deleted successfully"),
                   @ApiResponse(responseCode = "404", description = "Product not found")
               })
    @PreAuthorize("hasRole('ADMIN')") // Only ADMINs can delete products
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }
}
```