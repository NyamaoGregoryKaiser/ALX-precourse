```java
package com.alxmobilebackend.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import static com.alxmobilebackend.util.Constants.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class ProductDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductResponse {
        private Long id;
        private String name;
        private String description;
        private BigDecimal price;
        private Integer stockQuantity;
        private String imageUrl;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductCreateRequest {
        @NotBlank(message = NOT_BLANK_MESSAGE)
        private String name;

        private String description;

        @NotNull(message = NOT_BLANK_MESSAGE)
        @DecimalMin(value = "0.01", message = GREATER_THAN_ZERO_MESSAGE)
        private BigDecimal price;

        @NotNull(message = NOT_BLANK_MESSAGE)
        @Min(value = 0, message = POSITIVE_NUMBER_MESSAGE)
        private Integer stockQuantity;

        private String imageUrl;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductUpdateRequest {
        private String name;
        private String description;

        @DecimalMin(value = "0.01", message = GREATER_THAN_ZERO_MESSAGE, inclusive = false)
        private BigDecimal price;

        @Min(value = 0, message = POSITIVE_NUMBER_MESSAGE)
        private Integer stockQuantity;

        private String imageUrl;
    }
}
```