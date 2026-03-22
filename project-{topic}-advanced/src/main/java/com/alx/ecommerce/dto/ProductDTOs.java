```java
package com.alx.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class ProductDTOs {

    @Getter
    @Setter
    @Builder
    public static class ProductResponse {
        private UUID id;
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQuantity;
        private CategoryDTO category;
        private String imageUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    public static class CreateProductRequest {
        @NotBlank(message = "Product name cannot be empty")
        @Size(min = 3, max = 255, message = "Product name must be between 3 and 255 characters")
        private String name;

        private String description;

        @NotNull(message = "Price cannot be null")
        @Min(value = 0, message = "Price cannot be negative")
        private BigDecimal price;

        @NotNull(message = "Stock quantity cannot be null")
        @Min(value = 0, message = "Stock quantity cannot be negative")
        private Integer stockQuantity;

        @NotNull(message = "Category ID cannot be null")
        private Long categoryId;

        private String imageUrl;
    }

    @Getter
    @Setter
    public static class UpdateProductRequest {
        @Size(min = 3, max = 255, message = "Product name must be between 3 and 255 characters")
        private String name;

        private String description;

        @Min(value = 0, message = "Price cannot be negative")
        private BigDecimal price;

        @Min(value = 0, message = "Stock quantity cannot be negative")
        private Integer stockQuantity;

        private Long categoryId;

        private String imageUrl;
    }
}
```