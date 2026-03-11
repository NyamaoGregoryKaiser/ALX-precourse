package com.alx.ecommerce.product.controller;

import com.alx.ecommerce.common.ApiResponse;
import com.alx.ecommerce.product.dto.ProductDTO;
import com.alx.ecommerce.product.service.ProductService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
@Tag(name = "Products", description = "API for managing product catalog")
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a new product", description = "Creates a new product in the catalog. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ProductDTO>> createProduct(@Valid @RequestBody ProductDTO productDTO) {
        ProductDTO createdProduct = productService.createProduct(productDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product created successfully", createdProduct), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "Get all products", description = "Retrieves a paginated list of all products.")
    public ResponseEntity<ApiResponse<Page<ProductDTO>>> getAllProducts(@PageableDefault(size = 10, sort = "name") Pageable pageable) {
        Page<ProductDTO> products = productService.getAllProducts(pageable);
        return new ResponseEntity<>(new ApiResponse<>(true, "Products fetched successfully", products), HttpStatus.OK);
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get product by ID", description = "Retrieves details of a specific product by its ID.")
    public ResponseEntity<ApiResponse<ProductDTO>> getProductById(@PathVariable Long id) {
        ProductDTO product = productService.getProductById(id);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product fetched successfully", product), HttpStatus.OK);
    }

    @GetMapping("/category/{categoryId}")
    @Operation(summary = "Get products by category ID", description = "Retrieves products belonging to a specific category.")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> getProductsByCategoryId(@PathVariable Long categoryId) {
        List<ProductDTO> products = productService.getProductsByCategoryId(categoryId);
        return new ResponseEntity<>(new ApiResponse<>(true, "Products by category fetched successfully", products), HttpStatus.OK);
    }

    @GetMapping("/search")
    @Operation(summary = "Search products by keyword", description = "Searches for products matching a keyword in their name or description.")
    public ResponseEntity<ApiResponse<List<ProductDTO>>> searchProducts(@RequestParam String keyword) {
        List<ProductDTO> products = productService.searchProducts(keyword);
        return new ResponseEntity<>(new ApiResponse<>(true, "Products found", products), HttpStatus.OK);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update an existing product", description = "Updates the details of an existing product. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<ProductDTO>> updateProduct(@PathVariable Long id, @Valid @RequestBody ProductDTO productDTO) {
        ProductDTO updatedProduct = productService.updateProduct(id, productDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product updated successfully", updatedProduct), HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Delete a product", description = "Deletes a product by its ID. Requires ADMIN role.")
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<ApiResponse<?>> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return new ResponseEntity<>(new ApiResponse<>(true, "Product deleted successfully"), HttpStatus.NO_CONTENT);
    }
}