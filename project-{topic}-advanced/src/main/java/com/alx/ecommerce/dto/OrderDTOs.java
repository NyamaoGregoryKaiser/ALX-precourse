```java
package com.alx.ecommerce.dto;

import com.alx.ecommerce.model.Order;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class OrderDTOs {

    @Getter
    @Setter
    @Builder
    public static class OrderResponse {
        private UUID id;
        private UUID userId;
        private LocalDateTime orderDate;
        private BigDecimal totalAmount;
        private Order.OrderStatus status;
        private String shippingAddress;
        private List<OrderItemResponse> orderItems;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Getter
    @Setter
    @Builder
    public static class OrderItemResponse {
        private UUID id;
        private UUID productId;
        private String productName;
        private Integer quantity;
        private BigDecimal priceAtPurchase;
    }

    @Getter
    @Setter
    public static class CreateOrderRequest {
        @NotNull(message = "Order items cannot be null")
        private List<CreateOrderItemRequest> items;

        @NotBlank(message = "Shipping address cannot be empty")
        private String shippingAddress;
    }

    @Getter
    @Setter
    public static class CreateOrderItemRequest {
        @NotNull(message = "Product ID cannot be null")
        private UUID productId;

        @NotNull(message = "Quantity cannot be null")
        @Min(value = 1, message = "Quantity must be at least 1")
        private Integer quantity;
    }

    @Getter
    @Setter
    public static class UpdateOrderStatusRequest {
        @NotNull(message = "Order status cannot be null")
        private Order.OrderStatus status;
    }
}
```