```java
package com.alx.pm.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Data Transfer Object for Product")
public class ProductDTO {
    @Schema(description = "Unique identifier for the product", example = "101")
    private Long id;

    @NotBlank(message = "Product name cannot be empty")
    @Size(min = 2, max = 255, message = "Product name must be between 2 and 255 characters")
    @Schema(description = "Name of the product", example = "Smartphone X")
    private String name;

    @Size(max = 1000, message = "Product description cannot exceed 1000 characters")
    @Schema(description = "Description of the product", example = "A powerful smartphone with advanced features.")
    private String description;

    @NotNull(message = "Price cannot be null")
    @DecimalMin(value = "0.01", message = "Price must be greater than 0")
    @Schema(description = "Price of the product", example = "699.99")
    private Double price;

    @NotNull(message = "Stock cannot be null")
    @Min(value = 0, message = "Stock must be a non-negative value")
    @Schema(description = "Current stock quantity of the product", example = "150")
    private Integer stock;

    @NotNull(message = "Category ID cannot be null")
    @Schema(description = "ID of the product's category", example = "1")
    private Long categoryId;

    @Schema(description = "Name of the product's category", example = "Electronics", readOnly = true)
    private String categoryName;

    @Schema(description = "Date and time when the product was created", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime createdAt;

    @Schema(description = "Date and time when the product was last updated", accessMode = Schema.AccessMode.READ_ONLY)
    private LocalDateTime updatedAt;
}
```