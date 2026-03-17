```java
package com.alxmobilebackend.dto;

import com.alxmobilebackend.model.Order;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static com.alxmobilebackend.util.Constants.GREATER_THAN_ZERO_MESSAGE;
import static com.alxmobilebackend.util.Constants.NOT_BLANK_MESSAGE;

public class OrderDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemRequest {
        @NotNull(message = NOT_BLANK_MESSAGE)
        private Long productId;

        @NotNull(message = NOT_BLANK_MESSAGE)
        @Min(value = 1, message = GREATER_THAN_ZERO_MESSAGE)
        private Integer quantity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderCreateRequest {
        @NotNull(message = NOT_BLANK_MESSAGE)
        @Size(min = 1, message = "Order must contain at least one item")
        @Valid
        private List<OrderItemRequest> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderUpdateRequest {
        private Order.OrderStatus status;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderItemResponse {
        private Long id;
        private Long productId;
        private String productName;
        private Integer quantity;
        private BigDecimal unitPrice;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OrderResponse {
        private Long id;
        private Long userId;
        private String username;
        private LocalDateTime orderDate;
        private BigDecimal totalAmount;
        private Order.OrderStatus status;
        private List<OrderItemResponse> items;
    }
}
```

#### Repositories (JPA Data)